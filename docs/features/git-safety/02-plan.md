# Plan — Git safety & branch environments

> Track: Chore · Slug: `git-safety` · Based on approved Phase 1 and your decisions (below). Nothing here is implemented yet.

## 1. Decisions applied

| # | Decision | Where it lands |
|---|---|---|
| 1 | No YouTrack ID | Branch `chore/git-safety`, commit scope `git-safety`, no `[WL-xx]` |
| 2 | Retire `master` after verifying `development` / `staging` / `release`; `development` becomes default | §6 migration, §7 manual checklists, rollback §8 |
| 3 | CI rejects invalid promotion paths | New workflow `pr-policy.yml` + `scripts/check-promotion.mjs` (§4.4) |
| 4 | Zero-dependency `.githooks/` in Node `.mjs`; pre-commit / commit-msg / pre-push; `npm run hooks:install` | §4.2 |
| 5 | `staging` builds with `BUILD_CONFIG=staging`, `outputHashing: "all"`; tags unchanged | §4.3 |
| 6 | Separate automated repo changes from manual UI steps, with detailed checklists | §3 vs §7 |

**Guiding constraints:** existing CI/CD behaviour preserved; `master` stays functional and untouched until verification passes; every script runs on Windows (PowerShell/Git Bash) and Linux (CI); no new dependencies.

## 2. Target setup

```
chore/*  feature/*  fix/*  ──PR──▶  development  ──PR──▶  staging  ──PR──▶  release
                                    (default)             (pre-prod)        (production)
 Docker build config:               development           staging           production
 GHCR tags:                         development,          staging,          release, release-<sha>,
                                    development-<sha>     staging-<sha>     latest
```

| Rule | Enforced by |
|---|---|
| No direct commits/pushes to `development`, `staging`, `release` | GitHub ruleset (manual, §7.2) + local `pre-commit`/`pre-push` guard |
| Only valid promotion paths merge | CI check `Promotion policy` (required status check) |
| Lint, format, typecheck, tests, Sonar gate, Docker smoke test pass before merge | Existing `CI/CD` jobs as required checks |
| Conventional commits | local `commit-msg` hook |
| No secrets / `.env` committed | `.gitignore` + `pre-commit` filename guard |

## 3. Automated repo changes vs manual UI configuration

| Area | Repo change (agent, Phase 4) | Manual (Thiru, §7) |
|---|---|---|
| Branches | — (agent never pushes env branches) | Create `development`, `staging`, `release` from `master` via GitHub UI |
| CI | `ci-cd.yml`, `check-format.mjs`, new `pr-policy.yml` + script | Mark checks as required in rulesets |
| Protection | — | Rulesets for 3 branches (+ lock `master`) |
| Default branch | — | Switch to `development` |
| Sonar | `sonar-project.properties` (exclude `.githooks/**`, fix comment) | Main branch, long-lived pattern, quality gate, new-code definition |
| Docker/GHCR | `angular.json` staging hashing; workflow build config | Package visibility, repo access, retention |
| Hooks | `.githooks/*`, `scripts/hooks-install.mjs`, npm scripts, `.gitattributes` | Each developer runs `npm run hooks:install` once |
| Docs | `docs/branching-strategy.md`, README | — |

## 4. Repo changes in detail

### 4.1 Hygiene (WI-1)
| File | Change |
|---|---|
| `.gitignore` | Add `.env`, `.env.*`, `!.env.example` |
| `.gitattributes` (new) | `.githooks/* text eol=lf`, `*.sh text eol=lf` — hooks must have LF or `sh` fails on Windows-checked-out files |
| `.dockerignore` | Add `.githooks`, `.agents`, `docs` (not needed in the image build; build context only) |
| `sonar-project.properties` | Add `.githooks/**` to `sonar.exclusions`; replace stale "Claude Code hooks" comment |

### 4.2 Git hooks (WI-2)
Layout (repo-tracked, `core.hooksPath=.githooks`):
```
.githooks/
  pre-commit      # 2-line sh shim: exec node "$(dirname "$0")/pre-commit.mjs" "$@"
  commit-msg      # same pattern
  pre-push        # same pattern
  pre-commit.mjs  commit-msg.mjs  pre-push.mjs
  lib.mjs         # helpers: git(), protected-branch list, spawn node/npm cross-platform
scripts/hooks-install.mjs   # sets core.hooksPath, marks shims executable (git update-index --chmod=+x), supports --uninstall
```
Why a shim: git runs hooks via `sh` (Git for Windows bundles it), and the shim defers everything to Node for identical behaviour on both OS. Executable bit is recorded in the git index (`core.filemode=false` on this machine), so Linux/WSL clones work.

| Hook | Checks | Notes |
|---|---|---|
| `pre-commit` | 1. Block commits on `development`/`staging`/`release`/`master` 2. Block staged `.env*` (except `.env.example`), `*.pem`, `*.key`, `node_modules/`, `dist/`, `coverage/` 3. ESLint on staged `*.ts`/`*.html` (`eslint --no-warn-on-unmatched-pattern <files>`, respects `eslint-suppressions.json`) 4. Prettier `--check` on staged `ts/html/css/scss/js/mjs` | Operates on the staged file list (`--diff-filter=ACMR`); never auto-modifies files; prints `npm run format:changed` hint |
| `commit-msg` | Header must match `^(feat\|fix\|chore\|docs\|refactor\|style\|test\|ci\|build)(\([a-z0-9._/-]+\))?!?: .{1,}`; header ≤ 100 chars; optional trailing `[ABC-123]` | Auto-allows `Merge …`, `Revert …`, `fixup!`/`squash!` |
| `pre-push` | 1. Block pushing to protected branches (reads refs from stdin; branch deletions of protected also blocked) 2. Block branch names outside `feature/*`, `chore/*`, `fix/*` (+ protected names are blocked above) 3. `npm run typecheck` 4. `npm run test:ci` (decision F) | Skips checks 3–4 for pure deletions |

Child processes use `process.execPath` + `node_modules/<pkg>/bin/*.js` for ESLint and the Prettier API (as `check-format.mjs` does), `spawnSync('npm', …, { shell: process.platform === 'win32' })` for npm scripts, no `npx`, no bash-only syntax.

`package.json`: add `"hooks:install": "node scripts/hooks-install.mjs"` and `"hooks:uninstall": "node scripts/hooks-install.mjs --uninstall"`. No `prepare`/`postinstall` auto-install (CI and Docker use `--ignore-scripts`, and silently changing git config on `npm ci` is surprising).

### 4.3 CI & build (WI-3)
| File | Change |
|---|---|
| `angular.json` | `staging` configuration: add `"outputHashing": "all"` |
| `.github/workflows/ci-cd.yml` → `Resolve build settings` | `release` push / PR→release ⇒ `production`; **`staging` push / PR→staging ⇒ `staging`**; else `development` |
| `.github/workflows/ci-cd.yml` → `Format check` | If `github.event.before` is all zeros (new branch) or empty, fall back to `origin/<default branch>` instead of crashing |
| `scripts/check-format.mjs` | Default base: `origin/development`, fallback `origin/master`; treat an all-zero / unknown base as "use fallback" with a clear log line; exit 2 only if no fallback resolves |
| Triggers | **Unchanged** (`master`, `development`, `staging`, `release`) so the migration can't strand a branch without CI |
| Jobs, tags, Sonar, smoke test | **Unchanged** (tags remain `<branch>`, `<branch>-<sha>`, `latest` on `release` only) |

### 4.4 Promotion policy (WI-3.4)
New workflow `.github/workflows/pr-policy.yml`:
- Trigger: `pull_request` on `[master, development, staging, release]`, types `opened, reopened, synchronize, edited` (`edited` re-evaluates when the base branch changes). `permissions: contents: read`; `actions/checkout` pinned like the existing workflow; single job named **`Promotion policy`** (stable name for the required-check list).
- Runs `node scripts/check-promotion.mjs`; head/base/repo are passed through **env vars** (never interpolated into the shell) to avoid script injection from branch names.

| Base | Allowed head | Else |
|---|---|---|
| `development` | `feature/*`, `chore/*`, `fix/*` (`^(feature\|chore\|fix)/[A-Za-z0-9][A-Za-z0-9._-]*$`) | ❌ fail with message listing allowed paths |
| `staging` | exactly `development` | ❌ |
| `release` | exactly `staging` | ❌ |
| `master` | any (legacy; **transitional**) — removed in the retire-master follow-up | ✅ |

Extra rule: for `staging`/`release`, head repository must equal the base repository (a fork branch named `development` must not pass). Output also written to the job summary.

### 4.5 Documentation (WI-4)
- `docs/branching-strategy.md`: flow diagram, naming, merge-method guidance, hooks usage, migration and rollback runbook, and the manual checklists from §7 (single source for Thiru).
- `README.md`: fix drift (Node 24 not 22, lint now runs, `ng build --configuration`, `environment.production.ts`), add "Branching & hooks" section linking the doc.

## 5. Out of scope
- Dockerfile, `nginx.conf`, smoke test, tag scheme, Sonar quality-gate rules, coverage thresholds.
- Real staging/production `apiUrl` values (see ❓ Q-B) — `environment.staging.ts` is not modified.
- Hotfix flow (`hotfix/*` → `release`), semver/release tagging, GitHub Environments with approvals, auto back-merge.
- Rebasing/migrating the old stale branches (`Home-page`, `application-Restructuring`, `codemaintainability`, `sonar-fixes`, `chore/vitest-migration`).
- Deleting `master` (done by Thiru, §7.6).
- Test spec files (per lifecycle rule; hooks/scripts verified by the Phase 5 manual checklist).

## 6. Branch migration plan (safe order)

| Step | Who | Action | Safe because |
|---|---|---|---|
| M0 | Agent | Create `chore/git-safety` **from `master`** (no `development` exists yet — see Decision A) and implement (Phase 4); push after approval | `master` untouched |
| M1 | Thiru | Open PR `chore/git-safety → master` (policy allows any head into `master`); CI must pass; merge | New workflows live on `master` |
| M2 | Thiru | In GitHub UI create `development`, `staging`, `release` from `master` (same commit) | No local hook interference; identical content |
| M3 | Thiru | Watch first push CI on each new branch: `test` + `docker` green; images `development`, `staging` (config `staging`), `release`/`latest` (config `production`) appear in GHCR | Validates zero-SHA fix & staging build |
| M4 | Thiru | Sonar config (§7.3) and rulesets (§7.2) | Done before the default switch |
| M5 | Thiru | Dry-run promotion: trivial `chore/*` PR → `development`; `development → staging`; `staging → release` | Proves the happy path |
| M6 | Thiru | Negative tests: PR `feature/x → staging` and `development → release` must fail `Promotion policy` | Proves the gate |
| M7 | Thiru | Switch default branch to `development`; lock `master` (read-only ruleset) | Reversible in one click |
| M8 | Thiru | Soak period (Decision C), then follow-up chore `retire-master`: remove `master` from `ci-cd.yml`/`pr-policy.yml` triggers via `chore/* → development` flow; finally delete `master` in GitHub | Deleted only after verification |

## 7. Manual configuration checklists (Thiru)

### 7.1 Repository prerequisites
- [ ] Settings → Actions → General → Workflow permissions: *Read repository contents*; allow actions as today.
- [ ] Settings → Secrets and variables → Actions: `SONAR_TOKEN` exists.
- [ ] Settings → General → Pull Requests: allow **merge commits** and squash; enable "Automatically delete head branches" (feature branches only get deleted — rulesets in 7.2 forbid deleting env branches).
- [ ] Install/enable the SonarQube Cloud GitHub App on this repo (PR decoration).

### 7.2 Rulesets (Settings → Rules → Rulesets → New branch ruleset)
Create three rulesets, enforcement **Active**, no bypass list except repo admin for `development` only if you are solo (see Decision D).

| Setting | `development` | `staging` | `release` |
|---|---|---|---|
| Target | `refs/heads/development` | `refs/heads/staging` | `refs/heads/release` |
| Restrict deletions | ✅ | ✅ | ✅ |
| Block force pushes | ✅ | ✅ | ✅ |
| Restrict creations | — | ✅ | ✅ |
| Require a pull request | ✅ | ✅ | ✅ |
| Required approvals | Decision D | Decision D | Decision D |
| Dismiss stale approvals on push | ✅ | ✅ | ✅ |
| Require conversation resolution | ✅ | ✅ | ✅ |
| Require status checks | `Test, coverage & SonarQube`, `Docker image`, `Promotion policy` | same | same |
| Require branches up to date before merge | ✅ | ❌ (see warning) | ❌ |
| Allowed merge methods | Squash or merge | **Merge commit only** | **Merge commit only** |
| Require linear history | ❌ | ❌ | ❌ |

> [!WARNING]
> Do **not** require "branch up to date" or squash on `staging`/`release`: a promotion PR's head (`development`/`staging`) will always lag the base's merge commits and could never satisfy it, and squashing a promotion makes the branches diverge permanently.

- [ ] Add a fourth ruleset on `master` after M7: block all updates/deletions (read-only).
- [ ] After M3 (checks have run once) verify the three check names appear in the status-check picker; if a name differs, pick the one shown.

### 7.3 SonarQube Cloud
- [ ] Project `this-is-thiru_wealthlens-fe` → Administration → **Branches & Pull Requests**: set main branch to `development` at M7 (rename from `master`); keep `master` until then.
- [ ] Administration → General Settings → Branches: long-lived branches pattern `(development|staging|release|master)`.
- [ ] Administration → **New Code**: reference branch `development` (or "previous version") — pick one and note it in `docs/branching-strategy.md`.
- [ ] Quality Gate: confirm the project uses the same gate as today (no change).
- [ ] Analysis Method: confirm *Automatic Analysis* stays **off** (CI-based).
- [ ] After M3, confirm `staging` and `release` branches appear and each passed analysis.

### 7.4 GHCR (`ghcr.io/this-is-thiru/wealthlens-fe`)
- [ ] After M3: Packages → `wealthlens-fe` → Package settings → confirm **Manage Actions access** lists this repo with **Write**.
- [ ] Choose visibility (private now; public optional) — Danger Zone → Change visibility.
- [ ] Verify tags exist: `development`, `development-<sha>`, `staging`, `staging-<sha>`, `release`, `release-<sha>`, `latest`.
- [ ] (Optional) Add a retention/cleanup policy for old `<branch>-<sha>` images.
- [ ] Pull `:staging` and confirm assets are hashed (`main-XXXXXXXX.js`).

### 7.5 Developers
- [ ] Run `npm ci` then `npm run hooks:install` on each machine (Windows and Linux/WSL); verify with `git config core.hooksPath` → `.githooks`.

### 7.6 Retire `master`
- [ ] Soak period passed with ≥ 1 full promotion `development → staging → release`.
- [ ] Merge the follow-up chore removing `master` from workflow triggers.
- [ ] Re-target or close any open PRs against `master`.
- [ ] Settings → Branches → delete `master` (Thiru only).

## 8. Rollback

| If … | Roll back by | Data loss |
|---|---|---|
| Workflow change breaks CI on `master` (M1) | Revert the merge commit via GitHub's *Revert* button (PR into `master`) | None |
| New branch CI fails (M3) | Fix forward via PR into that branch; or delete the new branch in UI (no prior content existed) | None |
| Ruleset blocks legitimate work | Set ruleset enforcement to **Disabled** (one click), fix, re-enable | None |
| Promotion policy false-positive | Remove `Promotion policy` from required checks (keeps other gates), fix script | None |
| Default-branch switch causes problems (M7) | Settings → Branches → switch default back to `master`; unlock `master` ruleset | None |
| Sonar main-branch rename breaks analysis | Rename main branch back in Sonar; re-run CI | Branch history in Sonar only |
| Hooks block a developer | `npm run hooks:uninstall` (restores default hooks path) | None |
| Staging build misbehaves | Revert `angular.json` / `ci-cd.yml` hunk | None |

`master` is **never deleted** before M8, so every rollback has a working branch to return to.

## 9. Risks & assumptions

| Tag | Item |
|---|---|
| ⚠️ ASSUMPTION | Working branch `chore/git-safety` is created from `master` because `development` does not exist yet (needs your OK — Decision A) |
| ⚠️ ASSUMPTION | `commit-msg` max header length 100 and scope charset `[a-z0-9._/-]` |
| ✔ DECIDED (F) | `pre-push` runs `npm run test:ci` (verified non-interactive, see `03-design.md` §5.3); lint/format are not repeated there |
| ⚠️ ASSUMPTION | Hooks also guard protected branches, branch names and secret files (backs `git-safety.md`; beyond your four-point list) |
| ⚠️ ASSUMPTION | Branch-name rule `^(feature\|chore\|fix)/[A-Za-z0-9][A-Za-z0-9._-]*$`; no ticket prefix required since there is no YouTrack ID |
| Risk | Local hooks are bypassable (`--no-verify`); GitHub rulesets and CI are the real enforcement |
| Risk | First push to each new branch: `format:check` zero-SHA path is the most likely failure — covered by WI-3.2/3.3 and M3 |
| Risk | Required-check names must match exactly: `Test, coverage & SonarQube`, `Docker image`, `Promotion policy` — do not rename jobs afterwards |
| Risk | `environment.staging.ts` points to `http://localhost:8081`; a `staging` image will call that until real URLs are set |
| ❓ OPEN QUESTION | See §10 |

## 10. Decisions needed from you

| # | Decision | Recommendation |
|---|---|---|
| A | Create `chore/git-safety` from `master` (no `development` yet)? | Yes (only option today) |
| B | `environment.staging.ts` / `environment.production.ts` `apiUrl` are `localhost` — real URLs in this chore or separate? | Separate chore |
| C | Soak period before deleting `master`? | 1 full promotion cycle or 7 days |
| D | Required approvals on rulesets (solo owner can't approve own PR)? | 0 approvals + required checks while solo; raise to 1 when a second reviewer exists |
| E | Hook extras (protected-branch / branch-name / secret-file guards) — keep? | Keep |
| F | `pre-push` runs `npm test` vs `npm run test:ci`? | `npm test` |
| G | Add `hotfix/*` → `release` as an allowed path? | Not now |

## 11. Decisions recorded at Phase 2 approval (2026-11-23)
| Ref | Decision |
|---|---|
| A | Yes: `chore/git-safety` from `master`; `master` never modified or deleted by the agent |
| B | Yes: staging/production API URLs in a separate chore; keep current environment files |
| C | Keep `master` until one full promotion cycle **and** at least 7 days soak |
| D | 0 required approvals; required checks and protections stay on |
| E | Keep all hook extras |
| F | `npm run test:ci` in `pre-push` (non-interactive; no duplicated checks) |
| G | No `hotfix/*` → `release` |

## Changelog
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-23 | Initial Phase 2 plan incorporating Phase 1 decisions |
| 1.1 | 2026-11-23 | Recorded decisions A–G; `pre-push` now uses `test:ci`; soak period fixed at 7 days (§6 M8, §7.6) |
