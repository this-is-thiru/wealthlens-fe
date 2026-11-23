# Manual Test Cases — Git safety & branch environments

**Environment:** Local (Windows, Node.js/npm/Angular CLI/Git — **no local Docker**) · GitHub Actions · SonarQube Cloud · GHCR · **Build/commit:** `chore/git-safety` (pre-merge) · **Tested by:** Thiru · **Date:** 2026-11-23
**Status values:** PASS · FAIL · BLOCKED · SKIPPED · (blank = not run)

> [!IMPORTANT]
> **Docker-free local workflow:** None of these test cases require Docker on your laptop. All Docker builds, smoke tests, and GHCR tag checks (`TC-DKR-*`) are verified directly in the **GitHub Actions** UI and **GitHub Packages** UI.

## Summary
| Priority | Cases | Pass | Fail |
|---|---|---|---|
| P1 | 30 | | |
| P2 | 10 | | |
| P3 | 2 | | |
| **Total** | **42** | | |

**Test these first (highest risk):**
1. **`TC-SNR-01` (Zero-SHA first push on brand-new branches):** Creating `development`, `staging`, and `release` triggers `push` with an all-zero `github.event.before`; `Format check` must fall back cleanly instead of failing with exit code 2.
2. **`TC-DKR-03` & `TC-DKR-04` (Docker `staging` & `release` builds in GitHub Actions):** Confirm `staging` builds with `BUILD_CONFIG=staging` and fingerprinted assets (immutable cache check runs in `Smoke test image`), and `latest` is pushed on `release` only.
3. **`TC-CI-01`–`TC-CI-06` (`Promotion policy` CI gate):** Confirm valid promotions pass and invalid shortcuts (`feature/* → staging`, `development → release`, `hotfix/* → release`) fail and block merge.
4. **`TC-MIG-01`–`TC-MIG-02` (GitHub Rulesets):** Confirm required check names match exactly and `staging`/`release` use merge-commit-only without "require branch up to date".
5. **`TC-GIT-03`, `TC-GIT-04`, `TC-GIT-14` (Local hook guardrails):** Confirm protected-branch commits/pushes and staged `.env` secrets are actually blocked locally.

---

## 1. Local Git Hooks — Install, Uninstall & `pre-commit`
| ID | Scenario | Preconditions / test data | Steps | Expected result | Priority | Status | Notes |
|---|---|---|---|---|---|---|---|
| TC-GIT-01 | Install local hooks | Repo cloned on Windows or Linux; `npm ci` completed | 1. Run `npm run hooks:install`<br>2. Run `git config --local --get core.hooksPath` | Command exits 0, lists all 3 hooks, and `core.hooksPath` outputs `.githooks`. Global git config is untouched. | P1 | | |
| TC-GIT-02 | Uninstall local hooks | Hooks installed (`TC-GIT-01`) | 1. Run `npm run hooks:uninstall`<br>2. Run `git config --local --get core.hooksPath`<br>3. Re-run `npm run hooks:install` | Step 1 prints uninstall confirmation; step 2 returns empty/non-zero; step 3 restores `.githooks`. | P2 | | |
| TC-GIT-03 | Block direct commit on protected branch | Hooks installed; checked out on `master` (or `development`/`staging`/`release`) | 1. Stage a harmless change<br>2. Run `git commit -m "chore(test): verify block"`<br>3. Unstage & revert the test change | Commit is blocked (exit 1) with `[git-safety] Direct commits to "<branch>" are blocked.` | P1 | | |
| TC-GIT-04 | Block staged `.env` / `.env.local` | Hooks installed; on a `chore/*` branch | 1. Create `.env.local` with dummy text<br>2. Attempt `git add -f .env.local` and `git commit -m "chore(test): env"`<br>3. Unstage & delete `.env.local` | Normal `git add` ignores `.env.local` via `.gitignore`; forced staging is blocked at commit time with `[git-safety] Refusing to commit secret files...` | P1 | | |
| TC-GIT-05 | Allow `.env.example` | Hooks installed; on a `chore/*` branch | 1. Create dummy `.env.example`<br>2. Run `git check-ignore .env.example` and stage it<br>3. Run `node .githooks/pre-commit.mjs`<br>4. Unstage & delete `.env.example` | `.env.example` is not ignored and `pre-commit` exits 0 (allowed). | P2 | | |
| TC-GIT-06 | Block staged `*.pem`, `*.key`, `dist/`, `coverage/` | Hooks installed; on a `chore/*` branch | 1. Force-stage a dummy `test.key` (or `dist/x.js`)<br>2. Run `node .githooks/pre-commit.mjs`<br>3. Unstage & delete dummy file | Hook exits 1 listing the forbidden file and showing `git reset HEAD -- <file>`. | P1 | | |
| TC-GIT-07 | Block commit on ESLint error in staged `src/*.ts` | Hooks installed; on a `chore/*` branch | 1. Add `console.log('x');` to a `src/` `.ts` file and stage it<br>2. Run `git commit -m "chore(test): lint fail"`<br>3. Revert the change | Hook runs ESLint on the staged file and exits 1 (`no-console` error); commit is aborted. | P1 | | |
| TC-GIT-08 | Block commit on unformatted staged file (no auto-modify) | Hooks installed; on a `chore/*` branch | 1. Add extra spaces/bad quotes to a `.ts` or `.mjs` file and stage it<br>2. Run `git commit -m "chore(test): fmt fail"`<br>3. Check file contents<br>4. Revert the change | Hook exits 1 listing the unformatted file and suggesting `npm run format:changed`. File on disk is **not** modified by the hook. | P1 | | |
| TC-GIT-09 | Clean commit on working branch passes `pre-commit` | Hooks installed; on a `chore/*` branch with a clean, formatted change | 1. Stage the file<br>2. Run `git commit -m "chore(git-safety): verify clean commit"` | `pre-commit` prints `pre-commit checks passed.` and proceeds to `commit-msg`. | P1 | | |

---

## 2. Local Git Hooks — `commit-msg` & `pre-push`
| ID | Scenario | Preconditions / test data | Steps | Expected result | Priority | Status | Notes |
|---|---|---|---|---|---|---|---|
| TC-GIT-10 | Valid Conventional Commits pass | Hooks installed | Test headers: `chore(git-safety): add hooks`, `feat(portfolio): add table [WL-42]`, `fix!: drop old route` | Each passes `commit-msg` (exit 0). | P1 | | |
| TC-GIT-11 | Git-generated `Merge` and `Revert` messages pass | Hooks installed | Test headers: `Merge branch 'development' into staging`, `Revert "chore: test"` | Both pass `commit-msg` (exit 0). | P2 | | |
| TC-GIT-12 | Non-conventional commit message blocked | Hooks installed; on working branch | Attempt commit with `"updated stuff"` or `"FE-000: legacy format"` | Commit is blocked (exit 1) showing expected format and valid types. | P1 | | |
| TC-GIT-13 | Header exceeding 100 characters blocked | Hooks installed; on working branch | Attempt commit with a 105-char header starting with `chore(git-safety): ...` | Commit is blocked (exit 1) reporting character count > 100. | P2 | | |
| TC-GIT-14 | Direct push to protected branch blocked by `pre-push` | Hooks installed | Attempt `git push origin HEAD:development` (or simulate via `pre-push.mjs` stdin for `development`, `staging`, `release`, `master`) | Push is blocked locally (exit 1) before contacting remote: `Direct push to protected branch "<name>" is blocked.` | P1 | | |
| TC-GIT-15 | Remote deletion of protected branch blocked by `pre-push` | Hooks installed | Simulate `git push origin --delete master` (or `pre-push.mjs` stdin with zero local SHA targeting `refs/heads/master`) | Deletion is blocked locally (exit 1): `Direct deletion of protected branch "master" is blocked.` | P1 | | |
| TC-GIT-16 | Invalid working branch name blocked by `pre-push` | Hooks installed | Create temp local branch `temp-bad-name` and attempt `git push -u origin temp-bad-name` (then delete local branch) | Push is blocked locally (exit 1) listing allowed prefixes `feature/*`, `chore/*`, `fix/*`. | P1 | | |
| TC-GIT-17 | Valid working branch push runs `typecheck` and `test:ci` | Hooks installed; on `chore/*` branch | Push `chore/git-safety` (or any working branch) after approval | `pre-push` runs `npm run typecheck` then `npm run test:ci` (non-interactive); push succeeds only when both exit 0 (~1.5 min). | P1 | | |
| TC-GIT-18 | Pure deletion of non-protected branch skips tests | Hooks installed | Delete a disposable remote `chore/*` branch (or feed zero local SHA for `refs/heads/chore/old` to `pre-push.mjs`) | Prints `Pure branch deletion on non-protected branch — skipping typecheck and tests.` and exits 0 immediately. | P3 | | |

---

## 3. CI — Promotion Policy (`Promotion policy` check)
| ID | Scenario | Preconditions / test data | Steps | Expected result | Priority | Status | Notes |
|---|---|---|---|---|---|---|---|
| TC-CI-01 | Working branch → `development` allowed | `development` exists | Open PR from `feature/*`, `chore/*`, or `fix/*` targeting `development` | Workflow `PR Policy` runs job `Promotion policy` → ✅ pass; summary shows `working branch into development`. | P1 | | |
| TC-CI-02 | `development` → `staging` allowed | `development` and `staging` exist (same repo) | Open PR from `development` targeting `staging` | `Promotion policy` → ✅ pass. | P1 | | |
| TC-CI-03 | `staging` → `release` allowed | `staging` and `release` exist (same repo) | Open PR from `staging` targeting `release` | `Promotion policy` → ✅ pass. | P1 | | |
| TC-CI-04 | Bootstrap PR `chore/git-safety` → `master` allowed | Before `master` retirement | Open PR `chore/git-safety` → `master` | `Promotion policy` → ✅ pass with note `master is transitional during branch migration`. | P1 | | |
| TC-CI-05 | Working branch → `staging` or `release` rejected | `staging` and `release` exist | Open test PR `feature/test-block` → `staging` (and/or `chore/test-block` → `release`), then close PR | `Promotion policy` → ❌ fail, listing allowed promotion paths; merge button blocked by ruleset. | P1 | | |
| TC-CI-06 | `development` → `release` rejected | `development` and `release` exist | Open test PR `development` → `release`, then close PR | `Promotion policy` → ❌ fail (`Only "staging" may be promoted into "release"`). | P1 | | |
| TC-CI-07 | `hotfix/*` → `release` rejected (Decision G) | `release` exists | Verify `scripts/check-promotion.mjs` (or test PR) with `PR_HEAD_REF=hotfix/urgent`, `PR_BASE_REF=release` | `Promotion policy` → ❌ fail. | P2 | | |
| TC-CI-08 | Base branch change re-evaluates policy | Open PR targeting `development` | Edit PR base branch in GitHub UI from `development` to `staging`, then revert/close | `PR Policy` re-runs on `edited` event and flips from ✅ to ❌. | P2 | | |

---

## 4. CI — Format Check, New Branch Push & SonarQube Cloud
| ID | Scenario | Preconditions / test data | Steps | Expected result | Priority | Status | Notes |
|---|---|---|---|---|---|---|---|
| TC-SNR-01 | Brand-new branch push (zero-SHA) passes `Format check` | M2: `development`, `staging`, `release` created from `master` in GitHub UI | Open **Actions → CI/CD** for the first push run on each of `development`, `staging`, `release` and inspect `Format check` step | `Format check` falls back cleanly and exits 0 (no `git merge-base` exit code 2 failure). | P1 | | |
| TC-SNR-02 | `Test, coverage & SonarQube` passes end-to-end | PR or push to `development`, `staging`, or `release` | Inspect **Actions → CI/CD → Test, coverage & SonarQube** | `lint`, `format:check`, `typecheck`, `test:ci`, Coverage summary, Sonar scan, and Sonar quality gate all pass ✅. | P1 | | |
| TC-SNR-03 | SonarQube Cloud recognizes environment branches | M3 + §5.3 Sonar config complete | Open SonarQube Cloud → `this-is-thiru_wealthlens-fe` → **Branches** | `development`, `staging`, and `release` appear as long-lived branches with passing quality gates. | P2 | | |
| TC-SNR-04 | `.githooks/**` excluded from Sonar analysis | Push/PR containing `.githooks/` | Open SonarQube Cloud → **Code** tab for the analysed branch | `.githooks/` does not appear in coverage or code-smell metrics. | P3 | | |

---

## 5. Docker Build, Smoke Test & GHCR Publishing (GitHub Actions Only — No Local Docker)
| ID | Scenario | Preconditions / test data | Steps | Expected result | Priority | Status | Notes |
|---|---|---|---|---|---|---|---|
| TC-DKR-01 | PR builds & smoke-tests Docker image without pushing | Open PR targeting `development`, `staging`, or `release` | In GitHub **Actions → CI/CD → Docker image**:<br>1. Open `Smoke test image` log<br>2. Open workflow run **Summary** (`Image summary`) | `Smoke test passed`; `Push image` step is skipped; `Image summary` shows `Pushed: false`. | P1 | | |
| TC-DKR-02 | `development` push builds `development` config & pushes tags | Push/merge to `development` | 1. In **Actions → CI/CD → Summary**, inspect `Docker image`<br>2. Open repo **Packages → wealthlens-fe** | `Build config: development`, `Pushed: true`, `Smoke test passed`; GHCR shows tags `development` and `development-<short-sha>` (no `latest`). | P1 | | |
| TC-DKR-03 | `staging` push builds `staging` config with hashed assets & pushes tags | Push/merge to `staging` | 1. In **Actions → CI/CD → Summary**, check `Build config`<br>2. Open `Smoke test image` step log<br>3. Open **Packages → wealthlens-fe** | `Build config: staging`, `Pushed: true`; `Smoke test image` log shows **green immutable cache check** for a fingerprinted asset (not "skipped"); GHCR shows `staging` and `staging-<short-sha>` (no `latest`). | P1 | | |
| TC-DKR-04 | `release` push builds `production` config & pushes `latest` | Push/merge to `release` | 1. In **Actions → CI/CD → Summary**, check `Build config` and `Tags`<br>2. Open **Packages → wealthlens-fe** | `Build config: production`, `Pushed: true`; GHCR shows `release`, `release-<short-sha>`, and `latest`. | P1 | | |
| TC-DKR-05 | Failed `test` job blocks `Docker image` job | Any PR with a failing lint/test/Sonar check | Inspect workflow graph in **Actions → CI/CD** | `Docker image` is skipped (`needs: test`); no image is built or pushed. | P2 | | |

---

## 6. GitHub Rulesets, Migration & Rollback
| ID | Scenario | Preconditions / test data | Steps | Expected result | Priority | Status | Notes |
|---|---|---|---|---|---|---|---|
| TC-MIG-01 | Rulesets enforce 0 approvals + 3 required checks & block direct push | M4 rulesets active (§5.2) | 1. Check **Settings → Rules → Rulesets** for `development`, `staging`, `release`<br>2. Confirm merge is blocked while any of `Test, coverage & SonarQube`, `Docker image`, `Promotion policy` is pending/failed | All 3 rulesets Active; 0 approvals; all 3 checks required; force-push and branch deletion blocked. | P1 | | |
| TC-MIG-02 | Merge-commit-only promotion on `staging` and `release` | M5 dry-run promotion | 1. Merge `development → staging` PR<br>2. Merge `staging → release` PR | Only **Create a merge commit** is offered (no squash); merge succeeds without "branch out of date" deadlock. | P1 | | |
| TC-MIG-03 | Default branch switch & `master` read-only lock | M7 complete | 1. Open repo home page on GitHub<br>2. Check `master` ruleset | Default branch shown is `development`; `master` still exists (not deleted before Gate G5: ≥ 1 full cycle + ≥ 7 days soak) and rejects updates/deletions. | P1 | | |
| TC-MIG-04 | Rollback reversibility check | Rulesets active; hooks installed | 1. Run `npm run hooks:uninstall` then `npm run hooks:install`<br>2. Verify in GitHub UI that a ruleset can be toggled *Disabled* and default branch dropdown lists `master` | Both local and GitHub settings are cleanly reversible with zero data loss. | P2 | | |

---

## 7. Regression — Normal Local Developer Workflow (Docker-Free)
| ID | Scenario | Preconditions / test data | Steps | Expected result | Priority | Status | Notes |
|---|---|---|---|---|---|---|---|
| TC-REG-01 | Full local verification runs without Docker | Node.js, npm, Angular CLI, Git only (no Docker installed) | Run `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm run test:ci`, `npx ng build --configuration=staging` | Every command exits 0; `dist/wealthlens/browser/` contains fingerprinted `main-<HASH>.js`. | P1 | | |
| TC-REG-02 | Local dev server starts normally | Dependencies installed | Run `npm start` and open `http://localhost:4200` | App compiles and loads without new console or build errors. | P2 | | |
| TC-REG-03 | End-to-end working branch flow | Hooks installed; `development` default | 1. `git checkout -b chore/smoke-test origin/development`<br>2. Make a formatted edit, commit with `chore(docs): ...`<br>3. Push and open PR → `development` | `pre-commit`, `commit-msg`, `pre-push`, and all 3 GitHub CI checks pass cleanly. | P1 | | |

---

## Changelog
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-23 | Initial Phase 5 manual test checklist (42 cases: 30 P1, 10 P2, 2 P3; Docker-free local workflow) |
