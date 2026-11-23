# Discovery — Git safety & branch environments

> Track: Chore · Slug: `git-safety` · Read-only audit of the current repository state.

## 1. Plain-language summary
The repo currently runs on a single long-lived branch (`master`) with no local git hooks, no environment branches (`development`, `staging`, `release`), and no automated guardrails enforcing the rules in `.agents/rules/git-safety.md`. A working GitHub Actions pipeline (`.github/workflows/ci-cd.yml`) already runs lint, format, typecheck, Vitest coverage, SonarQube Cloud quality gate, and a multi-stage Docker build + smoke test + GHCR push — and it already lists `development`, `staging`, and `release` in its triggers — but several pieces are half-wired or mismatched against the target 3-environment flow.

---

## 2. Current state

### 2.1 Branches & remote
- **Remote:** `origin` → `https://github.com/this-is-thiru/wealthlens-fe.git`
- **Default branch on `origin`:** `master` (`origin/HEAD -> origin/master`)
- **Git tags:** none
- **Environment branches (`development`, `staging`, `release`):** ❌ do not exist locally or on `origin`.

| Branch | Exists locally | Exists on `origin` | Notes |
|---|---|---|---|
| `master` | Yes | Yes (default) | Current integration branch |
| `development` | No | No | Target integration branch (missing) |
| `staging` | No | No | Target pre-production branch (missing) |
| `release` | No | No | Target production branch (missing) |
| `Home-page`, `application-Restructuring`, `chore/vitest-migration`, `codemaintainability`, `sonar-fixes` | Yes | Yes | Older/stale feature & chore branches |
| `chore/agent-workflow`, `chore/docker-host-port-4200` | Yes | No (pruned/merged) | Local-only leftovers |

- **GitHub branch protection / rulesets:** `❓ OPEN QUESTION` — cannot be verified locally (`gh` CLI is not installed; configured in GitHub repository settings).

### 2.2 GitHub Actions (`.github/workflows/ci-cd.yml`)
Only one workflow exists: **`CI/CD`** (`.github/workflows/ci-cd.yml`), running on `ubuntu-latest` with Node `24`, `APP_NAME: wealthlens`, `REGISTRY: ghcr.io`.

- **Triggers:** `pull_request` and `push` on `[master, development, staging, release]`.
- **Concurrency:** `${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}` with `cancel-in-progress: true`.

| Branch / Event | `test` job (lint, format, typecheck, Vitest + coverage) | SonarQube Cloud scan & Quality Gate | `docker` build & smoke test (`BUILD_CONFIG`) | GHCR push & tags |
|---|---|---|---|---|
| PR → `master` | Runs | Runs (same-repo PRs only) | `development` | ❌ Not pushed |
| Push → `master` | Runs | Runs | `development` | ✅ `master`, `master-<sha>` |
| PR → `development` | Runs | Runs (same-repo PRs only) | `development` | ❌ Not pushed |
| Push → `development` | Runs | Runs | `development` | ✅ `development`, `development-<sha>` |
| PR → `staging` | Runs | Runs (same-repo PRs only) | **`development`** ⚠️ | ❌ Not pushed |
| Push → `staging` | Runs | Runs | **`development`** ⚠️ | ✅ `staging`, `staging-<sha>` |
| PR → `release` | Runs | Runs (same-repo PRs only) | `production` | ❌ Not pushed |
| Push → `release` | Runs | Runs | `production` | ✅ `release`, `release-<sha>`, `latest` |

Key details of the `test` job:
1. `actions/checkout@v7` with `fetch-depth: 0` (for Sonar blame / new code).
2. `npm ci --ignore-scripts --no-audit --no-fund`.
3. `npm run lint` (`eslint src`, baseline via `eslint-suppressions.json`).
4. `npm run format:check` (`node scripts/check-format.mjs`) with `FORMAT_BASE` = `origin/<base_ref>` on PRs, or `github.event.before` on pushes.
5. `npm run typecheck` (`ngc -p tsconfig.app.json --noEmit && tsc -p tsconfig.spec.json --noEmit`).
6. `npm run test:ci` (Vitest via `@angular/build:unit-test`, 20% coverage thresholds in `angular.json`).
7. Uploads `coverage/` artifact (14 days) and writes a coverage summary to `$GITHUB_STEP_SUMMARY`.
8. Runs `SonarSource/sonarqube-scan-action` (v8.4.1) and `SonarSource/sonarqube-quality-gate-action` (v1.2.1, 5 min timeout), failing the job if the gate fails.

### 2.3 SonarQube Cloud setup
- Config file: `sonar-project.properties`
  - `sonar.organization=this-is-thiru`
  - `sonar.projectKey=this-is-thiru_wealthlens-fe`
  - `sonar.projectName=WealthLens`
  - Mode: CI-based analysis (Automatic Analysis disabled in SonarCloud UI per comment); auth via GitHub secret `SONAR_TOKEN`.
  - Coverage input: `sonar.javascript.lcov.reportPaths=coverage/wealthlens/lcov.info`.
  - Exclusions: `**/*.spec.ts`, `src/environments/**`, `src/main.ts`, `src/polyfills.ts`, `src/test-setup.ts`, `**/*.d.ts`, `src/assets/**`, `scripts/**`, `eslint.config.js`; coverage exclusions: `**/*.html`.
- SonarQube Cloud UI settings (Main Branch, Long-Lived Branches Pattern, Quality Gate rules, GitHub PR decoration): `❓ OPEN QUESTION` — not readable from the repo.

### 2.4 Dockerfile, Nginx, Angular environments & image tagging
- **`Dockerfile`:** Multi-stage build:
  1. `node:24-alpine` (`build`): `npm ci --ignore-scripts --no-audit --no-fund`, then `npm run build -- --configuration="${BUILD_CONFIG}"`.
  2. `nginxinc/nginx-unprivileged:stable-alpine` (`runtime`): serves `dist/wealthlens/browser/` on port `8080` as non-root `nginx`, with `/healthz` `HEALTHCHECK`.
- **Build args:** `APP_NAME=wealthlens`, `BUILD_CONFIG=production` (documents `production | development | staging | testing`).
- **Angular configurations (`angular.json`):**
  | Config | `optimization` | `outputHashing` | `sourceMap` | Environment file | `apiUrl` |
  |---|---|---|---|---|---|
  | `development` | `false` | none | `true` | `src/environments/environment.ts` | `http://localhost:8080` |
  | `staging` | `true` | none ⚠️ | `true` | `src/environments/environment.staging.ts` | `http://localhost:8081` |
  | `testing` | `true` | none | `true` | `src/environments/environment.testing.ts` | `http://localhost:8081` |
  | `production` | `true` (default) | `all` | `false` | `src/environments/environment.production.ts` | `http://localhost:8080` |
- **Smoke test (`scripts/docker-smoke-test.sh`):** Starts container on port `4200:8080`, verifies `/healthz` healthy, non-root UID, read-only HTML files, SPA fallback, 404 on missing chunks, security/cache headers, and immutable caching for fingerprinted assets (skipped when build is not fingerprinted).
- **GHCR registry & tagging:** `ghcr.io/this-is-thiru/wealthlens-fe`, tagged `<branch>`, `<branch>-<short-sha>`, and `latest` on `release` pushes only.

### 2.5 Git hooks
- **None installed or tracked.**
  - `.git/hooks/` contains only default git `.sample` scripts.
  - `core.hooksPath` is unset (local and global).
  - No hook manager (`husky`, `lefthook`, `simple-git-hooks`) in `package.json`.
  - Earlier `.claude/hooks/` scripts were removed in commit `b18f843`.
- **Developer environment:** Windows (`git 2.52.0.windows.1`, Node `v24.13.0`, npm `11.21.2`). Note that CI and `Dockerfile` run `npm ci --ignore-scripts`, so any hook install mechanism must work on Windows + POSIX without breaking `--ignore-scripts`.

### 2.6 Existing conventions
- **Quality scripts (`package.json`):** `npm run lint`, `npm run format:check`, `npm run format:changed`, `npm run typecheck`, `npm run verify` (`lint && format:check && typecheck`), `npm run test:ci`, `npm run build`.
- **ESLint (`eslint.config.js`):** Flat config with `no-console: error`, `app` prefix (and `ui` for `src/app/shared/ui/**`), accessibility template rules, and `eslint-suppressions.json` baseline.
- **Prettier (`.prettierrc` + `scripts/check-format.mjs`):** Incremental format check — only checks files changed since `FORMAT_BASE` (default `origin/master`).
- **Commit history:** Mixed — recent commits use Conventional Commits (`chore(agent): ...`), older ones do not (`FE-000: ...`, `It dashboard (#16)`).
- **Rules on disk:** `.agents/rules/git-safety.md` and `.agents/rules/feature-lifecycle.md` define the target policy, but none of it is enforced by hooks or GitHub yet.

---

## 3. Gaps & risks

| # | Area | Gap / Risk | Severity |
|---|---|---|---|
| 1 | Branches | `development`, `staging`, and `release` do not exist yet; `origin/HEAD` still points to `master`. | High |
| 2 | GitHub protection | No verified branch protection / rulesets on `development`, `staging`, `release` (PR-only, required status checks `Test, coverage & SonarQube` + `Docker image`, block force-push/deletion). Must be configured in GitHub UI. | High |
| 3 | Promotion flow | Nothing in CI or GitHub enforces `feature/*\|chore/*\|fix/* → development → staging → release` (a PR from a feature branch can currently target `staging` or `release` directly, or `development` can skip `staging`). | High |
| 4 | CI — `staging` build | `ci-cd.yml` builds `BUILD_CONFIG=development` for pushes to `staging` and PRs into `staging`, instead of `BUILD_CONFIG=staging` (which already exists in `angular.json`). | High |
| 5 | CI — new branch push bug | `scripts/check-format.mjs` uses `FORMAT_BASE=${{ github.event.before }}` on `push`. When a brand-new branch (like `development`, `staging`, `release`) is pushed for the first time, `github.event.before` is all zeros (`0000...`), causing `git merge-base` to fail with exit code 2. | High |
| 6 | Format base hardcoded | `scripts/check-format.mjs` defaults `FORMAT_BASE` to `origin/master`. Once `development` is the integration branch (and especially if `master` is retired), local `npm run format:check` will compare against the wrong/missing ref. | Medium |
| 7 | Git hooks missing | Zero local enforcement of `.agents/rules/git-safety.md`: nothing blocks commits/pushes to protected branches, non-conforming branch names, invalid commit messages, staged `.env`/secret files, or unverified pushes. | High |
| 8 | `.gitignore` missing `.env` | `.dockerignore` excludes `.env` and `.env.*`, but `.gitignore` does **not** — `.env` files could be accidentally staged and committed. | High |
| 9 | Sonar branch config | SonarQube Cloud main branch and long-lived branch regex (`development`, `staging`, `release`) must be verified/updated in SonarCloud UI; also `sonar-project.properties` has a stale comment referencing Claude Code hooks and will need to exclude any new `.githooks/**` directory. | Medium |
| 10 | `master` retirement | `ci-cd.yml` still triggers builds and GHCR pushes on `master`. Unclear whether `master` should be retired/deleted once `development`/`staging`/`release` exist, or kept read-only. | Medium |
| 11 | `staging` output hashing | `angular.json` `staging` configuration does not set `outputHashing: "all"`, so `nginx.conf` immutable caching and the smoke test's fingerprinted-asset check don't exercise on `staging` images. | Low |
| 12 | Docs & `.dockerignore` drift | `README.md` still says CI uses Node 22 and skips lint, and references `ng build --prod` / `environment.prod.ts`. `.dockerignore` does not exclude `.agents/` or `docs/`. | Low |

---

## 4. Open questions & decisions needed

| # | Question | Needed from |
|---|---|---|
| 1 | **YouTrack ID:** Is there a YouTrack ticket ID for this chore (e.g. `WL-xx`), or should we use `chore/git-safety` with no ticket ID? | Thiru |
| 2 | **Retire `master`?** Once `development`, `staging`, and `release` are created from current `master`, should `master` be removed from `ci-cd.yml` (and later deleted/archived on GitHub), with `development` set as the GitHub default branch? | Thiru |
| 3 | **Promotion enforcement:** Should CI include a PR branch-policy check that enforces: working branches (`feature/*`, `chore/*`, `fix/*`) → `development` only; `development` → `staging` only; `staging` → `release` only (plus optional `hotfix/*` → `release`)? | Thiru |
| 4 | **Local hooks mechanism & scope:** Do you prefer zero-dependency repo-tracked `.githooks/` (Node `.mjs` scripts, cross-platform Windows/Linux, enabled via `npm run hooks:install` / `git config core.hooksPath .githooks`)? And which checks should run on `pre-commit` vs `commit-msg` vs `pre-push`? | Thiru |
| 5 | **Docker `staging` build & tags:** Confirm `staging` should use `BUILD_CONFIG=staging` (with `outputHashing: "all"`?) and whether current GHCR tags (`<branch>`, `<branch>-<short-sha>`, plus `latest` on `release`) are final or need semver/env tags (e.g. `dev`, `staging`, `prod`). | Thiru |
| 6 | **Scope limits:** Are GitHub branch protection rules and SonarQube Cloud branch/quality-gate settings in scope as a manual setup checklist (since they live in web UIs), and is there any deadline or item you want left out? | Thiru |

---

## Changelog
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-23 | Initial Phase 1 Discovery audit of branches, CI/CD, Sonar, Docker, hooks, and conventions |
