# Implementation Notes — Service folder structure refactor

> Track: Chore · Slug: `service-structure` · Branch: `chore/service-structure` (from `origin/development`, local only, not committed/pushed yet)

## 1. What was built
Completed all 6 work items (`WI-1.1` through `WI-3.2`) with zero behaviour change:

1. **Moved feature-owned services via `git mv` (`WI-1`):**
   - `src/app/core/services/broker-charges.service.ts` → `src/app/features/broker-charges/services/broker-charges.service.ts` (updated internal model import from `../../features/broker-charges/models/broker-charges.model` to `../models/broker-charges.model`).
   - `src/app/core/services/portfolio-analytics.service.ts` → `src/app/features/portfolio-analytics/services/portfolio-analytics.service.ts`.
   - `src/app/core/services/portfolio-analytics.service.spec.ts` → `src/app/features/portfolio-analytics/services/portfolio-analytics.service.spec.ts`.
2. **Updated consumer imports & lint baseline (`WI-2`):**
   - Updated imports in `broker-charges.component.ts`, `portfolio-analytics.component.ts`, and `tax-filing.component.ts` to `@features/<feature>/services/<name>.service`.
   - Updated the 3 path-keyed entries in `eslint-suppressions.json` to the new `src/app/features/...` paths, preserving every suppression rule and count identically.
3. **Incremental Prettier formatting (required by repo gate):**
   - `npm run format:check` flagged the 6 touched legacy `.ts` files (`scripts/check-format.mjs` requires formatting any file touched by a PR); ran `npm run format:changed` with zero logic changes.
4. **App-wide services untouched in `src/app/core/services/`:**
   - `auth.service.ts`, `baseurl.service.ts`, `live-price.service.ts`, `notification.service.ts`, `storage.service.ts`, `transaction.service.ts` (+ `.spec.ts`).

---

## 2. Files moved & modified

### Moved (`git mv`)
- `src/app/core/services/broker-charges.service.ts` → `src/app/features/broker-charges/services/broker-charges.service.ts`
- `src/app/core/services/portfolio-analytics.service.ts` → `src/app/features/portfolio-analytics/services/portfolio-analytics.service.ts`
- `src/app/core/services/portfolio-analytics.service.spec.ts` → `src/app/features/portfolio-analytics/services/portfolio-analytics.service.spec.ts`

### Modified
- `src/app/features/broker-charges/pages/broker-charges/broker-charges.component.ts`
- `src/app/features/portfolio-analytics/pages/portfolio-analytics/portfolio-analytics.component.ts`
- `src/app/features/tax-filing/pages/tax-filing/tax-filing.component.ts`
- `eslint-suppressions.json`
- `docs/BACKLOG.md`, `docs/features/service-structure/*`

### Unchanged
- `tsconfig.json`, `tsconfig.app.json`, `tsconfig.spec.json`, `package.json`, `angular.json`, `.github/workflows/*`, `sonar-project.properties`

---

## 3. Verification results (`WI-3` — Docker-free local checks)

| Check | Result | Notes |
|---|---|---|
| `npm run lint` | ✅ Pass (exit 0) | `eslint-suppressions.json` new path keys matched cleanly |
| `npm run format:check` | ✅ Pass (exit 0) | 13 changed files since `origin/development`, all formatted |
| `npm run typecheck` | ✅ Pass (exit 0) | `ngc` + `tsc` clean |
| Stale-import grep | ✅ Pass (0 hits) | Zero remaining references to `@core/services/broker-charges.service` or `@core/services/portfolio-analytics.service` |
| `npm run test:ci` | ✅ Pass (exit 0) | Moved `portfolio-analytics.service.spec.ts` discovered & passed; coverage thresholds met |
| `npx ng build --configuration=development` | ✅ Pass (exit 0) | Clean |
| `npx ng build --configuration=production` | ✅ Pass (exit 0) | Clean (`main-2TDODLOP.js`) |
| Option 1B service coverage (`lcov.info`) | ✅ Pass | `broker-charges.service.ts`: **100.0% (78/78)** (17 HTTP methods); `portfolio-analytics.service.ts`: **99.2% (359/362)** |
| Docker build & smoke test | Cloud CI only | Runs automatically in GitHub Actions (`Docker image` job) on PR per permanent Docker-free local policy |

---

## 4. Deviations from plan
- Running `npm run format:changed` on the 6 touched legacy `.ts` files was anticipated in `02-plan.md` §2.4 (zero logic changes). Because Prettier expanded many single-line mock objects in `broker-charges.service.ts`, Git's default `-M50%` rename detector shows it with lower similarity than `portfolio-analytics.service.ts` (`R084`) and `.spec.ts` (`R060`), though `git mv` was used and `git log --follow -M30%` preserves history.
- Fixed a 1-line ESLint 10 CLI compatibility bug in `.githooks/pre-commit.mjs` (`--no-warn-on-unmatched-pattern` → `--no-error-on-unmatched-pattern`) in a separate commit so the `pre-commit` hook runs cleanly on staged `src/*.ts` files without bypassing hooks.
- **Option 1B scope expansion & controlled Rule 7 waiver (PR #30 only):** Approved by Thiru on 2026-11-24 to satisfy the existing SonarQube Cloud Quality Gate (`new_coverage >= 80%`, `new_duplicated_lines_density <= 3%`) without weakening the gate:
  - Add `src/app/features/broker-charges/services/broker-charges.service.spec.ts` (waiving Rule 7 for this PR only).
  - Extend `src/app/features/portfolio-analytics/services/portfolio-analytics.service.spec.ts` for uncovered methods/branches.
  - Apply targeted, zero-behaviour-change deduplication in `portfolio-analytics.service.ts` and `broker-charges.service.ts` (`WI-4.1`–`WI-4.4`).

## 5. Limitations & follow-ups
- Next planned feature: `api-v1-migration` (updating frontend services to `wealthlens` backend `master` v1 APIs).

## 6. How to run & verify locally
```bash
npm run lint
npm run format:check
npm run typecheck
npm run test:ci
npx ng build --configuration=development
npx ng build --configuration=production
```

---

## Changelog
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-24 | Initial Phase 4 implementation notes for `service-structure` |
