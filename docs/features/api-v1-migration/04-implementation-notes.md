# Implementation Notes — API v1 migration (`api-v1-migration`)

> Branch: `feature/api-v1-migration` (from `origin/development` `9fafc2a`) · Backend `master` untouched (read-only).

---

## 1. What Was Built

### Core Foundations (`WI-1`)
- **Reusable pagination (`Option A`):** Added `PagedResponse<T>`, `PageMetadata`, `PageRequest`, and `fetchAllPages()` (`src/app/core/models/paged-response.model.ts`, `src/app/core/utils/pagination.util.ts`) respecting backend `max-page-size: 200` with a `maxPages` safety cap (`100`) and direct HTTP error propagation. Services also expose single-page methods (`getUserTransactionsPage`, `searchTransactionsPage`, `getCorporateActionsPage`, `getUserChargeHistoryPage`) for future server-side pagination UI.
- **RFC 9457 `ProblemDetail` & `429` error parser:** Added `ProblemDetail` (`src/app/core/models/problem-detail.model.ts`) and `http-error.util.ts` (`parseProblemDetail`, `extractErrorMessage`, `parseRetryAfterSeconds`, `formatRateLimitMessage`) supporting both JSON objects and JSON strings returned when `responseType: 'text'` fails.
- **Session storage for refresh token (`D4`):** Added `StorageKey.REFRESH_TOKEN = 'refreshToken'` and `getSessionItem` / `setSessionItem` / `removeSessionItem` on `StorageService`, keeping refresh-token persistence isolated from `localStorage` access tokens.

### Priority 1 — Auth, Refresh-Token Lifecycle, DPDP Consent & Interceptor (`WI-2`)
- **`AuthService`:** Migrated to `/api/v1/public/auth/{login|register|token/refresh|logout}`, `/api/v1/public/privacy/rights`, and `/api/v1/me/auth/password`. Implemented rotating `refresh_token` in `sessionStorage` (isolated behind `RefreshTokenTransport` for future `HttpOnly`/`Secure`/`SameSite` cookie mode), single-flight `refreshToken()` (`shareReplay(1)` + `finalize`), best-effort `204` server logout on `logOut()`, `text/plain` response handling on register/change-password, and proactive token refresh 60s before 15-min access-token expiry.
- **`AuthInterceptor` & `authGuard`:** Removed legacy `{ data }` envelope unwrapping (`W-359a`), skipped `Authorization` headers on `/api/v1/public/` URLs, implemented single-flight `401` refresh + retry-once (`RETRY_AFTER_REFRESH` `HttpContextToken`), surfaced `ProblemDetail.detail` on `403`, and updated `authGuard` to silently refresh when an expired JWT has a valid `refresh_token` in `sessionStorage`.
- **Auth Forms (`SignUpComponent`, `SignInComponent`, `ChangePasswordComponent`, `SettingsComponent`):** Added DPDP consent block to `SignUpComponent` fetching `privacyNoticeVersion` from `/api/v1/public/privacy/rights`, linking to `${baseUrl}/privacy` in a new tab (`A2`), unchecked-by-default `acceptPrivacyNotice` checkbox (`Validators.requiredTrue`), fail-closed Sign Up button if notice fetch fails (with Retry button), and `ProblemDetail` + `429 Retry-After` messaging across all auth forms.

### Priority 2 — Portfolio & Transactions (`WI-3`) & Priority 5 — Templates (`WI-6`)
- Added strict `AssetRequest` & `UploadQuarter` (`Q1`–`Q4`) model (`src/app/shared/models/asset-request.model.ts`) and extended `TransactionsResponse` (`transactionId`, `status`, `segment`, `charges`).
- Migrated `TransactionService` to `/api/v1/me/portfolio/...`:
  - Paginated `GET /api/v1/me/portfolio/transactions` and `POST /api/v1/me/portfolio/transactions/search` (fixed `filters` → `queryFilters` 400 bug).
  - **`D1`:** `addTransaction` → `POST /api/v1/me/portfolio/transaction/v2` (`responseType: 'text'`).
  - **`D5`:** `uploadTransactions` → `POST /api/v1/me/portfolio/transactions/uploads?quarter=Q1..Q4` (`responseType: 'text'`), with client-side `Q1`–`Q4` guard, updated `interpretUploadResponse` for backend `master` summary/held-back wording, and RFC 9457 `ProblemDetail` + `429` in `classifyUploadError`.
  - `clearAllRecords` → `DELETE /api/v1/me/portfolio` (`responseType: 'text'`).
  - `downloadTemplate` → `GET /api/v1/me/templates/excel` (`responseType: 'blob'`).
- Removed legacy `res?.data || res?.content` fallback in `PortfolioStocksComponent` and `PortfolioAnalyticsComponent` after `getAllHoldings` became strictly typed.

### Priority 3 — Corporate Actions (`WI-4`)
- Migrated `CorporateActionService` to `/api/v1/{me|admin}/corporate-actions/...`: paginated `getAllCorporateActions` & `getCorporateActions(ids)`, `PATCH /api/v1/admin/corporate-actions/{id}` with `{ priority }`, JSON `CorporateActionPerformDto` on batch perform, `void` delete, `describeHttpError` backed by `extractErrorMessage`, and removed unused retired `anyCorporateActionToPerform` (`D2`).

### Priority 4 — Broker Charges (`WI-5`)
- Updated `broker-charges.model.ts`: `AmcChargeFrequency = 'QUARTERLY' | 'ANNUALLY'`, required `transactionDate` on `ChargeSimulationRequest`, strict `ChargeAccountRequest` & `ChargeScheduleRequest` (preventing `fail-on-unknown-properties: true` 400s), and backend-accurate `ChargeBreakdownResponse` / `ChargeLine`.
- **`D3`:** Added pure `summarizeChargeBreakdown` & `summarizeLedgerDeductibility` (`src/app/features/broker-charges/utils/charge-deductibility.util.ts`) deriving `turnover = price × quantity` and computing deductibility strictly from `ChargeCatalogueEntry.deductibleForCapitalGains`, returning `null` (rendered as `—`) whenever any line code is unmapped.
- **`A1`:** Migrated `BrokerChargesService` to `/api/v1/{me|admin}/charges/...` (paginated `user-charges`, sanitized POST bodies) and restricted mock-data fallback strictly to demo mode (`authService.isDemo()`); updated `BrokerChargesComponent` to surface real HTTP errors via toast, add `#sim-transaction-date`, and replace `YEARLY` with `ANNUALLY`.

---

## 2. Files Created & Modified

### Created
- `src/app/core/models/paged-response.model.ts`
- `src/app/core/models/problem-detail.model.ts`
- `src/app/core/utils/pagination.util.ts` (+ `.spec.ts`)
- `src/app/core/utils/http-error.util.ts` (+ `.spec.ts`)
- `src/app/core/services/auth.service.spec.ts`
- `src/app/core/interceptors/auth.interceptor.spec.ts`
- `src/app/features/auth/models/privacy-notice.model.ts`
- `src/app/shared/models/asset-request.model.ts`
- `src/app/features/investments-tracking/services/corporate-action.service.spec.ts`
- `src/app/features/broker-charges/utils/charge-deductibility.util.ts` (+ `.spec.ts`)

### Modified
- `src/app/core/enums/storage-key.enum.ts`
- `src/app/core/services/storage.service.ts`
- `src/app/core/services/auth.service.ts`
- `src/app/core/interceptors/auth.interceptor.ts`
- `src/app/core/guards/auth.guard.ts`
- `src/app/core/services/transaction.service.ts` (+ `.spec.ts`)
- `src/app/features/auth/models/login-response.model.ts`
- `src/app/features/auth/models/register-request.model.ts`
- `src/app/features/auth/components/sign-up/sign-up.component.ts` (+ `.html`, `.spec.ts`)
- `src/app/features/auth/components/sign-in/sign-in.component.ts`
- `src/app/features/auth/components/change-password/change-password.component.ts`
- `src/app/shared/components/settings/settings.component.ts`
- `src/app/shared/models/transactions-response.model.ts`
- `src/app/features/investments-tracking/components/portfolio-stocks/portfolio-stocks.component.ts`
- `src/app/features/portfolio-analytics/pages/portfolio-analytics/portfolio-analytics.component.ts`
- `src/app/features/investments-tracking/services/corporate-action.service.ts`
- `src/app/features/investments-tracking/components/corporate-action-list/corporate-action-list.component.spec.ts`
- `src/app/features/broker-charges/models/broker-charges.model.ts`
- `src/app/features/broker-charges/services/broker-charges.service.ts` (+ `.spec.ts`)
- `src/app/features/broker-charges/pages/broker-charges/broker-charges.component.ts` (+ `.html`)
- `eslint-suppressions.json` (pruned stale suppressions fixed by stricter typing)

---

## 3. Verification Results (Docker-Free Local Checks)

| Check | Command | Result |
|---|---|---|
| Lint | `npm run lint` | **PASS** (0 errors, 0 warnings; stale suppressions pruned) |
| Format check | `npm run format:check` | **PASS** (all 45 changed files formatted) |
| Typecheck | `npm run typecheck` | **PASS** (`ngc` + `tsc --noEmit`) |
| Unit tests | `npm run test:ci` | **PASS** (**55/55 test files, 212/212 tests passed**) |
| Dev build | `npx ng build --configuration=development` | **PASS** |
| Prod build | `npm run build` | **PASS** |

---

## 4. Deviations, Limitations & Follow-Ups
- **Deviations from plan:** None. All decisions (`D1`–`D5`, `A1`, `A2`, Rule 7 test waiver) were implemented as approved.
- **Limitations / Follow-ups:**
  - Server-side table pagination UI (page pickers/sorting) is deferred per Option A; single-page service methods are already in place when ready.
  - Brand-new backend modules without existing UI (DPDP privacy settings page, taxplanning workspace, insurance, property sales) remain deferred to separate feature PRs.
  - If backend later moves refresh tokens to `HttpOnly; Secure; SameSite` cookies, flip `AuthService.refreshTokenTransport` to `'cookie'`.

## 5. How to Run Locally (Docker-Free)
```powershell
npm ci
npm run start
```
Ensure `environment.apiUrl` points to a running `wealthlens` backend (`master`).

---

## Changelog
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-25 | Created at end of Phase 4 — Development after all 22 work items and all 6 local checks passed |
