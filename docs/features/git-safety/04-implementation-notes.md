# Implementation Notes — Git safety & branch environments

> Track: Chore · Slug: `git-safety` · Branch: `chore/git-safety` (branched from `master`, local only, not committed/pushed yet)

## 1. What was built
Implemented all automated repository changes (`WI-1` through `WI-5`) from the approved Phase 2 Plan and Phase 3 Design:

1. **Repo hygiene (`WI-1`):**
   - Added `.env`, `.env.*`, `!.env.example` to `.gitignore`.
   - Added `.gitattributes` enforcing LF line endings for `.githooks/*` and `*.sh` so POSIX `sh` shims work on Windows (`core.autocrlf=true`) and Linux alike.
   - Added `.githooks`, `.agents`, and `docs` to `.dockerignore`.
   - Excluded `.githooks/**` in `sonar-project.properties` and updated the stale hook comment.
2. **Zero-dependency local git hooks (`WI-2`):**
   - Added `.githooks/lib.mjs` shared helpers and LF `sh` shims (`pre-commit`, `commit-msg`, `pre-push`).
   - Added `scripts/hooks-install.mjs` (supports `--uninstall`, sets local `core.hooksPath=.githooks`, records `+x` in git index for tracked shims) and wired `npm run hooks:install` / `npm run hooks:uninstall` in `package.json`.
   - Implemented `.githooks/pre-commit.mjs` (protected-branch guard, secret/build-output guard, ESLint on staged `src/**/*.{ts,html}`, Prettier check on staged code/style files — never auto-modifies).
   - Implemented `.githooks/commit-msg.mjs` (Conventional Commits header ≤ 100 chars; allows `Merge`, `Revert`, `fixup!`, `squash!`).
   - Implemented `.githooks/pre-push.mjs` (protected-branch update & delete guard, working branch name guard `feature/*|chore/*|fix/*`, `npm run typecheck`, `npm run test:ci` per Decision F; skips typecheck/tests on pure deletions).
3. **CI, build & promotion policy (`WI-3`):**
   - Enabled `"outputHashing": "all"` for `staging` in `angular.json`.
   - Updated `scripts/check-format.mjs` to default to `origin/development` → `origin/master` and handle all-zero `FORMAT_BASE` (first push of a new branch) cleanly.
   - Updated `.github/workflows/ci-cd.yml` so `staging` pushes and PRs into `staging` build with `BUILD_CONFIG=staging` and `FORMAT_BASE` falls back on zero-SHA pushes; all existing triggers, jobs, Sonar steps, smoke test, and GHCR tag rules are preserved.
   - Added `scripts/check-promotion.mjs` and `.github/workflows/pr-policy.yml` (job `Promotion policy`) enforcing `feature/*|chore/*|fix/* → development`, `development → staging` (same repo), `staging → release` (same repo), and transitional `master` support.
4. **Documentation (`WI-4`):**
   - Created `docs/branching-strategy.md` with the branch flow, hook usage, migration runbook (`M0`–`M8`, gates `G1`–`G5`), manual GitHub/Sonar/GHCR checklists, and rollback table.
   - Updated `README.md` to fix CI/build drift (Node 24, lint/format/typecheck active, `staging` build config, `ng build --configuration=production` / `environment.production.ts`) and link `docs/branching-strategy.md`.

---

## 2. Files created & modified

### Created
- `.gitattributes`
- `.githooks/lib.mjs`
- `.githooks/pre-commit`, `.githooks/pre-commit.mjs`
- `.githooks/commit-msg`, `.githooks/commit-msg.mjs`
- `.githooks/pre-push`, `.githooks/pre-push.mjs`
- `scripts/hooks-install.mjs`
- `scripts/check-promotion.mjs`
- `.github/workflows/pr-policy.yml`
- `docs/branching-strategy.md`
- `docs/design-system.md` (created in Phase 3)
- `docs/features/git-safety/04-implementation-notes.md`

### Modified
- `.gitignore`
- `.dockerignore`
- `sonar-project.properties`
- `package.json`
- `angular.json`
- `scripts/check-format.mjs`
- `.github/workflows/ci-cd.yml`
- `README.md`
- `docs/BACKLOG.md`, `docs/features/git-safety/STATUS.md`, `docs/features/git-safety/WORK-ITEMS.md`

---

## 3. Verification results (`WI-5`)

| Check | Result | Notes |
|---|---|---|
| `npm run lint` | ✅ Pass (exit 0) | Clean against `eslint-suppressions.json` |
| `npm run format:check` | ✅ Pass (exit 0) | 27 changed files formatted; zero-SHA fallback also verified |
| `npm run typecheck` | ✅ Pass (exit 0) | `ngc` + `tsc` clean |
| `npx ng build --configuration=development` | ✅ Pass (exit 0) | Clean |
| `npx ng build --configuration=staging` | ✅ Pass (exit 0) | Fingerprinted output confirmed (`main-7BCX5Q2O.js`, `styles-VBZPEZGQ.css`) |
| `npx ng build --configuration=production` | ✅ Pass (exit 0) | Clean |
| `npm run test:ci` | ✅ Pass (exit 0) | Vitest + coverage thresholds passed |
| `npm run hooks:install` | ✅ Pass (exit 0) | Sets local `core.hooksPath=.githooks` |
| Dry-run matrix (`check-promotion.mjs`, `commit-msg.mjs`, `pre-push.mjs`, `pre-commit.mjs`) | ✅ Pass (27/27) | All positive & negative cases passed on Windows |
| Docker local build (`WI-5.2`) | ⚠️ Skipped locally | `docker` is not installed on this workstation; verified via CI's `Docker image` job + `scripts/docker-smoke-test.sh` on PR/push |

---

## 4. Deviations from plan
- None in implementation. `WI-5.2` (local Docker build + smoke test) could not run locally because Docker is not installed on this machine (anticipated in `WORK-ITEMS.md` as "if Docker available; else note"); it will run automatically in GitHub Actions when the PR is opened.

## 5. Limitations & follow-ups
- **Manual migration (`WI-6.1`–`WI-6.6`):** Creating `development`/`staging`/`release`, configuring GitHub Rulesets, SonarQube Cloud branch settings, GHCR access, and the 7-day soak + `master` retirement are manual steps owned by Thiru (documented in `docs/branching-strategy.md` §4–§5).
- **Retire `master`:** Follow-up chore after Gate G5 (≥ 1 full promotion cycle + ≥ 7 days soak) to remove `master` from `.github/workflows/ci-cd.yml` and `pr-policy.yml`, followed by deleting `master` in GitHub UI.
- **Environment API URLs:** `src/environments/environment.staging.ts` and `environment.production.ts` remain untouched (Decision B; separate chore when real backend URLs are ready).
- **Linux hook smoke test:** `.githooks/*` shims have LF line endings verified (`CR=False`) and use POSIX `sh` + Node, and `scripts/hooks-install.mjs` runs `git update-index --chmod=+x` on tracked shims (re-run `npm run hooks:install` after staging/committing or verify `+x` mode in git index in Phase 6).

---

## 6. How to run & verify locally
```bash
# Install local git hooks
npm run hooks:install
git config --local --get core.hooksPath   # should print .githooks

# Run full local verification
npm run lint
npm run format:check
npm run typecheck
npm run test:ci
npx ng build --configuration=staging

# Disable local hooks (rollback)
npm run hooks:uninstall
```

---

## Changelog
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-23 | Initial Phase 4 implementation notes covering WI-1 through WI-5 |
