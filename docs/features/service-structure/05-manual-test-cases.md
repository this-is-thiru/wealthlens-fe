# Manual Test Cases — Service folder structure refactor

**Environment:** Local (Windows, Node.js/npm/Angular CLI/Git — **no local Docker**) · GitHub Actions · SonarQube Cloud · GHCR · **Build/commit:** `chore/service-structure` (pre-commit) · **Tested by:** Thiru · **Date:** 2026-11-24
**Status values:** PASS · FAIL · BLOCKED · SKIPPED · (blank = not run)

> [!IMPORTANT]
> **Docker-free local workflow:** Local tests use Node.js, npm, Angular CLI, and Git only. All Docker builds, smoke tests, and GHCR checks (`TC-CI-03`, `TC-CI-04`) are verified directly in **GitHub Actions** and **GitHub Packages**.

## Summary
| Priority | Cases | Pass | Fail |
|---|---|---|---|
| P1 | 18 | | |
| P2 | 3 | | |
| P3 | 0 | | |
| **Total** | **21** | | |

**Test these first (highest risk):**
1. **`TC-FN-01`–`TC-FN-04` (Moved service resolution in UI):** Verify `/broker-charges`, `/portfolio-analytics`, and `/tax-filing` load cleanly with zero DI or runtime errors.
2. **`TC-GIT-01` & `TC-GIT-02` (`eslint-suppressions.json` + `npm run lint`):** Verify the 3 updated file-path keys preserve exact rule counts and ESLint passes cleanly.
3. **`TC-BLD-01` (`npm run test:ci`):** Verify Vitest discovers and runs the relocated `portfolio-analytics.service.spec.ts` and meets coverage thresholds.
4. **`TC-CI-01`–`TC-CI-03` (GitHub Actions PR gates):** Verify `Promotion policy`, `Test, coverage & SonarQube`, and `Docker image` + smoke test all pass on the PR into `development`.

---

## 1. Moved Services & Feature Component Smoke Tests
| ID | Scenario | Preconditions / test data | Steps | Expected result (Pass criteria) | Priority | Status | Notes |
|---|---|---|---|---|---|---|---|
| TC-FN-01 | `BrokerChargesService` smoke test | `npm start` running at `http://localhost:4200`; signed in (or Demo mode) | 1. Navigate to `/broker-charges`<br>2. Run a charge simulation (e.g. Zerodha Equity Delivery BUY)<br>3. Switch across Catalogue, History, Reconciliation, and Demat tabs | Page loads with zero errors; simulation breakdown, catalogue, and mock/API tabs render normally. Fail if page crashes or `BrokerChargesService` fails to inject. | P1 | | |
| TC-FN-02 | `PortfolioAnalyticsService` smoke test on `/portfolio-analytics` | `npm start` running; signed in (or Demo mode) | 1. Navigate to `/portfolio-analytics`<br>2. Verify summary cards, holdings table, allocation charts, and insights render | All analytics widgets compute and render accurately with zero console errors. Fail if any metric is `NaN`/missing or throws runtime error. | P1 | | |
| TC-FN-03 | `PortfolioAnalyticsService` smoke test on `/tax-filing` | `npm start` running; signed in (or Demo mode) | 1. Navigate to `/tax-filing`<br>2. Switch FY filter and inspect FIFO realized gains / STCG / LTCG tables | Tax filing summary and FY breakdowns compute and render normally. Fail if `PortfolioAnalyticsService` fails to resolve or throws errors. | P1 | | |
| TC-FN-04 | Zero Angular DI / console errors across affected pages | DevTools Console open | Visit `/broker-charges`, `/portfolio-analytics`, and `/tax-filing` in sequence | Zero `NG0201`, `NullInjectorError`, or module-resolution errors in Console. | P1 | | |

---

## 2. Regression — App-Wide & Existing Colocated Services
| ID | Scenario | Preconditions / test data | Steps | Expected result (Pass criteria) | Priority | Status | Notes |
|---|---|---|---|---|---|---|---|
| TC-REG-01 | `AuthService` & `StorageService` regression | `npm start` running | 1. Click Demo sign-in (or real sign-in)<br>2. Refresh browser (`F5`)<br>3. Sign out | Session persists across reload and clears cleanly on logout; route guards redirect properly. | P1 | | |
| TC-REG-02 | `TransactionService` regression | Signed in / Demo mode | 1. Open `/portfolio-analytics` and `/tax-filing`<br>2. Open Settings panel | Holdings and transaction data load normally across all consumers; no broken imports. | P1 | | |
| TC-REG-03 | `NotificationService` regression | Signed in / Demo mode | 1. Trigger a toast action (e.g. settings save or session action)<br>2. Open Notifications view and mark read | Toast appears, unread badge updates, and notifications list persists in storage. | P1 | | |
| TC-REG-04 | `LivePriceService` regression | Signed in / Demo mode | Open Settings and `/tax-filing` | Live-price lookup/settings initialize with zero import or runtime errors. | P2 | | |
| TC-REG-05 | `CorporateActionService` & `ConfirmDialogService` regression | Signed in / Demo mode | Open any screen using confirm dialog / corporate actions | Existing colocated services continue working identically. | P1 | | |

---

## 3. ESLint Suppression Baseline & Static Checks
| ID | Scenario | Preconditions / test data | Steps | Expected result (Pass criteria) | Priority | Status | Notes |
|---|---|---|---|---|---|---|---|
| TC-GIT-01 | `eslint-suppressions.json` path & count integrity | Working branch `chore/service-structure` | Inspect `git diff eslint-suppressions.json` | Only the 3 moved file-path keys changed (`core/services/...` → `features/.../services/...`); rule counts are identical (`no-unused-vars: 3`, `array-type: 2`, `no-explicit-any: 3`, `array-type: 1`); zero new suppressions added. | P1 | | |
| TC-GIT-02 | ESLint passes cleanly | Working branch `chore/service-structure` | Run `npm run lint` | Exits `0` with zero errors. Fail on any lint error or unmatched suppression error. | P1 | | |
| TC-GIT-03 | Format check & Typecheck pass | Working branch `chore/service-structure` | Run `npm run format:check` and `npm run typecheck` | Both exit `0`; `format:check` reports all changed files since `origin/development` are formatted. | P1 | | |
| TC-GIT-04 | Zero stale import references | Working branch `chore/service-structure` | Search `src/` and `eslint-suppressions.json` for `@core/services/broker-charges.service`, `@core/services/portfolio-analytics.service`, and old `src/app/core/services/` paths | `0` matches found. | P1 | | |
| TC-GIT-05 | Git rename tracking preserved | Working branch `chore/service-structure` | Run `git status --short` (and `git diff --cached --summary` in Phase 6) | All 3 relocated files are tracked via `git mv` (history preserved). | P2 | | |

---

## 4. Unit Tests & Angular Builds (Docker-Free Local)
| ID | Scenario | Preconditions / test data | Steps | Expected result (Pass criteria) | Priority | Status | Notes |
|---|---|---|---|---|---|---|---|
| TC-BLD-01 | Unit tests & coverage pass with relocated spec | Working branch `chore/service-structure` | Run `npm run test:ci` | Exits `0`; Vitest discovers and passes `src/app/features/portfolio-analytics/services/portfolio-analytics.service.spec.ts`; all 4 coverage metrics stay above thresholds. | P1 | | |
| TC-BLD-02 | Development Angular build succeeds | Working branch `chore/service-structure` | Run `npx ng build --configuration=development` | Exits `0` with `dist/wealthlens/browser/index.html` produced. | P1 | | |
| TC-BLD-03 | Production Angular build succeeds | Working branch `chore/service-structure` | Run `npx ng build --configuration=production` | Exits `0` with fingerprinted production bundles (`main-*.js`) and zero budget errors. | P1 | | |

---

## 5. GitHub Actions CI, SonarQube, Docker & GHCR (Cloud Only — No Local Docker)
| ID | Scenario | Preconditions / test data | Steps | Expected result (Pass criteria) | Priority | Status | Notes |
|---|---|---|---|---|---|---|---|
| TC-CI-01 | `Promotion policy` passes on PR | PR opened: `chore/service-structure → development` | Inspect **Checks → Promotion policy** on the PR | Passes ✅ (`working branch into development`). | P1 | | |
| TC-CI-02 | `Test, coverage & SonarQube` passes on PR | PR opened: `chore/service-structure → development` | Inspect **Actions → CI/CD → Test, coverage & SonarQube** | `lint`, `format:check`, `typecheck`, `test:ci`, SonarQube Cloud scan, and SonarQube Quality Gate all pass ✅. | P1 | | |
| TC-CI-03 | `Docker image` build & smoke test pass on PR | PR opened: `chore/service-structure → development` | Inspect **Actions → CI/CD → Docker image** (`Smoke test image` log + `Image summary`) | `Smoke test passed` ✅; `Build config: development`; `Pushed: false` (PR never pushes to GHCR). | P1 | | |
| TC-CI-04 | Post-merge `development` push publishes GHCR image | PR merged into `development` | Inspect **Actions → CI/CD** push run on `development` and **Packages → wealthlens-fe** | Push run green ✅; `development` and `development-<short-sha>` tags updated in GHCR (verified in GitHub UI; no local Docker). | P2 | | |

---

## Changelog
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-24 | Initial Phase 5 manual test checklist (21 cases: 18 P1, 3 P2, 0 P3; Docker-free local workflow) |
