# Work Items — Git safety & branch environments

**Progress:** 16 / 22 sub-items done
**Status values:** TODO · IN_PROGRESS · BLOCKED · IN_REVIEW · DONE
Rules: one sub-item IN_PROGRESS at a time · a parent is DONE only when all sub-items are DONE · BLOCKED needs a reason.

| ID | Work item | Status | Depends on | Updated | Notes |
|---|---|---|---|---|---|
| WI-1 | Repo hygiene | DONE | — | 2026-11-23 | Plan §4.1 |
| WI-1.1 | `.gitignore` (`.env*`) + new `.gitattributes` (LF for hooks/sh) | DONE | — | 2026-11-23 | Verified with git check-ignore: .env, .env.local ignored; .env.example not |
| WI-1.2 | `.dockerignore` additions; `sonar-project.properties` exclusion + comment | DONE | — | 2026-11-23 | Sonar excludes .githooks/**; .dockerignore adds .githooks, .agents, docs |
| WI-2 | Git hooks (`.githooks/`) | DONE | WI-1 | 2026-11-23 | Plan §4.2 |
| WI-2.1 | `lib.mjs` helpers + `pre-commit`/`commit-msg`/`pre-push` sh shims (executable bit in index) | DONE | WI-1.1 | 2026-11-23 | lib.mjs + 3 LF shims; helpers import cleanly; shims have no CR |
| WI-2.2 | `scripts/hooks-install.mjs` (+ `--uninstall`) and `hooks:install` / `hooks:uninstall` npm scripts | DONE | WI-2.1 | 2026-11-23 | scripts/hooks-install.mjs + npm scripts hooks:install/hooks:uninstall added; negative test passed |
| WI-2.3 | `pre-commit.mjs`: protected-branch + secret-file guard, ESLint and Prettier on staged files | DONE | WI-2.1 | 2026-11-23 | pre-commit.mjs written, Prettier-formatted, syntax-checked |
| WI-2.4 | `commit-msg.mjs`: Conventional Commits | DONE | WI-2.1 | 2026-11-23 | commit-msg.mjs written, Prettier-formatted, syntax-checked |
| WI-2.5 | `pre-push.mjs`: protected-branch + branch-name guard, typecheck, tests | DONE | WI-2.1 | 2026-11-23 | pre-push.mjs written (uses typecheck + test:ci per Decision F), Prettier-formatted, syntax-checked |
| WI-3 | CI & build changes | DONE | — | 2026-11-23 | Plan §4.3–4.4; approved plan authorises workflow edits |
| WI-3.1 | `angular.json`: staging `outputHashing: "all"` | DONE | — | 2026-11-23 | staging config now sets outputHashing: all; angular.json valid JSON |
| WI-3.2 | `scripts/check-format.mjs`: base fallback (`origin/development` → `origin/master`), zero-SHA safe | DONE | — | 2026-11-23 | Defaults to origin/development -> origin/master; zero-SHA & default runs verified (exit 0) |
| WI-3.3 | `ci-cd.yml`: `BUILD_CONFIG=staging` for staging; zero-SHA `FORMAT_BASE` fallback; triggers/tags unchanged | DONE | WI-3.1, WI-3.2 | 2026-11-23 | ci-cd.yml builds staging with BUILD_CONFIG=staging and handles zero-SHA FORMAT_BASE; triggers/tags preserved |
| WI-3.4 | `scripts/check-promotion.mjs` + `.github/workflows/pr-policy.yml` (job `Promotion policy`) | DONE | — | 2026-11-23 | check-promotion.mjs + pr-policy.yml (job: Promotion policy) added; syntax verified |
| WI-4 | Documentation | DONE | WI-2, WI-3 | 2026-11-23 | Plan §4.5 |
| WI-4.1 | `docs/branching-strategy.md`: flow, migration, rollback, manual checklists | DONE | WI-2, WI-3 | 2026-11-23 | docs/branching-strategy.md written (flow, hooks, migration M0-M8, checklists, rollback) |
| WI-4.2 | `README.md` drift fixes + Branching & hooks section | DONE | WI-4.1 | 2026-11-23 | README.md drift fixed (Node 24, lint/format/typecheck, staging config, ng build --configuration=production) + Branching & hooks section |
| WI-5 | Verification (agent, before Phase 4 gate) | DONE | WI-1–WI-4 | 2026-11-23 |  |
| WI-5.1 | `npm run lint`, `format:check`, `typecheck`, `test:ci`, `ng build` (development + staging + production) | DONE | WI-4 | 2026-11-23 | lint, format:check, typecheck, test:ci, and ng build (dev/staging/prod) all exited 0; staging hashed main-7BCX5Q2O.js |
| WI-5.2 | Docker build `BUILD_CONFIG=staging` + `scripts/docker-smoke-test.sh` (if Docker available; else note) | DONE | WI-5.1 | 2026-11-23 | Docker not installed locally; deferred to CI Docker image job + smoke test on PR/push |
| WI-5.3 | Dry-run hooks and `check-promotion.mjs` locally (Windows; Linux via Docker/WSL if available) | DONE | WI-5.1 | 2026-11-23 | 27/27 dry-run cases passed (promotion policy, commit-msg, pre-push, pre-commit) + hooks:install verified |
| WI-6 | Manual migration runbook (owner: Thiru, after PR merge) | TODO | WI-5 | 2026-11-23 | Plan §6–7; tracked, not executed by agent |
| WI-6.1 | M1–M3: merge PR into `master`; create 3 branches in UI; verify first CI + GHCR tags | TODO | WI-5 | | |
| WI-6.2 | Rulesets for `development` / `staging` / `release` (§7.2) | TODO | WI-6.1 | | |
| WI-6.3 | SonarQube Cloud branch config (§7.3) and GHCR settings (§7.4) | TODO | WI-6.1 | | |
| WI-6.4 | M5–M6: happy-path promotion + negative promotion tests | TODO | WI-6.2 | | |
| WI-6.5 | M7: default branch → `development`; lock `master` | TODO | WI-6.4 | | |
| WI-6.6 | M8: soak, follow-up chore `retire-master`, delete `master` | TODO | WI-6.5 | | Separate chore; Thiru deletes branch |

## Blocked items
| ID | Reason | Needed from |
|---|---|---|

## Changelog
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-23 | Created in Phase 2 |
