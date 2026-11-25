# Plan — API v1 migration (`api-v1-migration`)

> Track: Feature · Slug: `api-v1-migration` · Branch (Phase 4): `feature/api-v1-migration` from `origin/development` · Backend `master` is read-only.

---

## 1. Existing App Audit (Reuse, Never Duplicate)

| Layer | Existing Pattern / Files | Reuse Strategy |
|---|---|---|
| Routing | Standalone lazy routes in `src/app/app.routes.ts` with `authGuard`, `blockDemoGuard`, `redirectSignedInGuard`, and named `modal` outlet (`sign-in`, `sign-up`, `forgot-password`, `change-password`) | Keep all routes; enhance `authGuard` to attempt silent token refresh when access token is expired but `refresh_token` exists in `sessionStorage` |
| Shared UI | `ui-modal`, `ui-input`, `ui-button`, `ui-alert`, `ui-badge`, `ui-empty-state`, `ConfirmDialogService`, `NotificationService`, `LucideIconsModule`, PrimeNG table/dropdown | Reuse exclusively; no new UI libraries, no new colors/fonts |
| Core Services | `BaseurlService`, `StorageService`, `AuthService`, `TransactionService`, `NotificationService` | Extend `StorageService` with `sessionStorage` helpers; keep `AuthService` and `TransactionService` in `src/app/core/services/` |
| Feature Services | `CorporateActionService` (`features/investments-tracking/services/`), `BrokerChargesService` (`features/broker-charges/services/`), `PortfolioAnalyticsService` (`features/portfolio-analytics/services/`) | Migrate in place; no unnecessary file moves |
| Interceptors | Functional `AuthInterceptor` (`HttpInterceptorFn`) in `src/app/core/interceptors/auth.interceptor.ts` | Upgrade in place: remove `{ data }` unwrapping, add single-flight `401` refresh + retry, `429` handling, public-auth header skip |
| State & Forms | Angular Signals (`signal`, `computed`) in `AuthService` and `BrokerChargesComponent`; Reactive Forms in `SignInComponent`, `SignUpComponent`, `ChangePasswordComponent`; Template-driven (`FormsModule`) in `UploadTransactionsComponent`, `SettingsComponent`, `CorporateActionListComponent`, `TempTransactionsTableComponent` | Preserve each component's existing form style |
| Demo Mode | `AuthService.DEMO_EMAIL = 'demo@wealthlens.com'` + `authService.isDemo()` | Preserve all demo-mode mock fallbacks and read-only `403` blocks |
| Testing | Vitest (`npm run test:ci`) | **Controlled Rule 7 waiver (approved by Thiru in Phase 2 kickoff):** add/update unit tests for API contracts, token refresh, pagination, error handling, and financial calculations |

---

## 2. Approved Decisions Applied (D1–D5)

| ID | Decision | Verified Backend `master` Contract & Plan Impact |
|---|---|---|
| **D1** | `addTransaction` → **`POST /api/v1/me/portfolio/transaction/v2`** | Verified in `PortfolioController.java`: returns `ResponseEntity<String>` (`text/plain`). Uses strict `AssetRequest` DTO (`fail-on-unknown-properties: true`). Angular uses `responseType: 'text'`. |
| **D2** | Remove retired `anyCorporateActionToPerform` (`PUT /corporate-action/perform/test`) | Verified via `git grep` across `src/`: **0 callers**, 0 model/test references. Remove method from `CorporateActionService`. |
| **D3** | `ChargeBreakdownResponse` financial derivation | Verified in `ChargeLine.java`: lines contain `code`, `displayName`, `category`, `basis`, `source`, `rate`, `baseAmount`, `amount`, `taxable` — **no** `deductibleForCapitalGains` flag. `ChargeCatalogueEntry` (`GET /api/v1/me/charges/charge-catalogue`) **does** provide `code → deductibleForCapitalGains: boolean`. Plan: (1) derive `turnover = quantity * price` when inputs exist; (2) derive `deductibleCharges` & `nonDeductibleCharges` **only** when every line's `code` is classified by the loaded `ChargeCatalogueEntry[]`; (3) if catalogue is unavailable or any code is unmapped, show `—` / omit rather than guessing. Replace hardcoded code list in `ledgerDeductibleFees` with the same catalogue-backed helper. |
| **D4** | `refresh_token` in `sessionStorage`, extensible for future HttpOnly cookies | Store `refresh_token` in `sessionStorage` (`StorageKey.REFRESH_TOKEN = 'refreshToken'`), keeping access-token handling (`StorageKey.JWT_TOKEN`) separate. Isolate refresh-token persistence behind a dedicated `RefreshTokenStore` / `StorageService` session methods so switching to `HttpOnly` + `Secure` + `SameSite` cookie mode later requires changing only the token-transport layer (`withCredentials: true`, empty body). Implement single-flight refresh, token rotation, `POST /api/v1/public/auth/logout` (`204`), `401` retry-once, and `429` (`Retry-After`) handling. |
| **D5** | Verify upload `quarter` format from backend before implementing | Verified in `AssetRequestParserImpl.java`: `ALLOWED_QUARTERS = List.of("Q1", "Q2", "Q3", "Q4")`. `UploadTransactionsComponent` **already** has a mandatory `Q1`–`Q4` selector! Also discovered `PortfolioService.java` changed upload success text to `"From <file>, quarter <Q>: <n> recorded, <m> already recorded...; held back for a corporate action: [...]"`. Plan updates `uploadTransactions()` to require `quarter`, use `responseType: 'text'`, and updates `interpretUploadResponse()` to parse both the new `master` format and legacy format. |

---

## 3. End-to-End User Journeys

1. **Registration with DPDP Privacy Notice:** User opens Sign Up modal → UI fetches `GET /api/v1/public/privacy/rights` to get `version` and displays privacy notice acknowledgement checkbox + link to `/privacy` → submits `POST /api/v1/public/auth/register` (`text/plain`) with `privacyNoticeVersion` → handles `200` / `400` / `409` / `429` (`Retry-After`).
2. **Sign In & Seamless 15-min Session Continuity:** User signs in via `POST /api/v1/public/auth/login` → access token (15 min) saved in `localStorage`, rotating refresh token (14 days) saved in `sessionStorage`, email & roles parsed from JWT → when access token expires (timer or HTTP `401`), single-flight `POST /api/v1/public/auth/token/refresh` rotates both tokens and retries failed request(s) transparently; if refresh fails/revoked, clears session and opens Sign In modal with `returnUrl`.
3. **Sign Out:** User clicks Sign Out (Header or Settings) → fires `POST /api/v1/public/auth/logout` (`204`) with `{ refresh_token }` (skipped in demo mode) → clears `localStorage` + `sessionStorage` and navigates to `/home`.
4. **Portfolio, Transactions & Upload:** Authenticated user loads Portfolio Analytics / Tax Filing / Investments Tracking → paginated endpoints (`GET /api/v1/me/portfolio/transactions`, `POST /api/v1/me/portfolio/transactions/search` with `queryFilters`) unwrap all pages via `fetchAllPages` (page size `200`) → uploads `.xlsx` with required `?quarter=Q1..Q4` (`text/plain`), redrives temporary transactions, adds manual trades via `/transaction/v2` (`text/plain`), or resets portfolio via `DELETE /api/v1/me/portfolio` (`text/plain`).
5. **Corporate Actions:** User views paginated list (`GET /api/v1/me/corporate-actions` via `fetchAllPages`), inspects details (`GET /api/v1/me/corporate-actions/{id}`), runs batch apply (`PUT /api/v1/me/corporate-actions/perform?allBrokers=`, JSON response); `SUPER_USER` adds (`POST /api/v1/admin/corporate-actions`), updates priority (`PATCH /api/v1/admin/corporate-actions/{id}` with `{ priority }`), executes name/symbol change (`PUT /api/v1/admin/corporate-actions/perform`), or deletes (`DELETE /api/v1/admin/corporate-actions/{id}` → `void`).
6. **Broker Charges:** User simulates pre-trade charges (`POST /api/v1/me/charges/simulate` including `transactionDate`), views paginated charge ledger (`GET /api/v1/me/charges/user-charges` via `fetchAllPages`), inspects contract notes, manages demat accounts (`POST /api/v1/me/charges/accounts` with strict `ChargeAccountRequest` & `ANNUALLY | QUARTERLY`), and `SUPER_USER` manages rate cards, seeding, drift, and AMC billing under `/api/v1/admin/charges/...`.
7. **Templates:** User downloads the Excel upload template via `GET /api/v1/me/templates/excel` (`Blob`).

---

## 4. Screen Inventory

| Screen / Component | Route | Purpose | Entry Points | Migrated Endpoints |
|---|---|---|---|---|
| Sign In Modal (`SignInComponent`) | `(modal:sign-in)` | Authenticate user | Header, Home, `authGuard`, `AuthInterceptor` `401` | `POST /api/v1/public/auth/login` |
| Sign Up Modal (`SignUpComponent`) | `(modal:sign-up)` | Register with DPDP consent | Header, Sign In modal | `GET /api/v1/public/privacy/rights`, `POST /api/v1/public/auth/register` |
| Change Password Modal (`ChangePasswordComponent`) & Settings (`SettingsComponent`) | `(modal:change-password)`, `/settings` | Change password, Sign Out, Reset Portfolio | Header menu, Settings | `PUT /api/v1/me/auth/password`, `POST /api/v1/public/auth/logout`, `DELETE /api/v1/me/portfolio` |
| Upload Transactions (`UploadTransactionsComponent`) | `/investments-tracking` | Upload `.xlsx` by quarter, download template | Investments Tracking | `POST /api/v1/me/portfolio/transactions/uploads?quarter=`, `GET /api/v1/me/templates/excel`, `GET /api/v1/me/portfolio/temporary-transactions` |
| Portfolio Stocks / Analytics / Tax Filing | `/investments-tracking`, `/portfolio-analytics`, `/tax-filing` | View holdings, transactions, P&L, tax calculations | Main nav | `GET /api/v1/me/portfolio/transactions`, `POST /api/v1/me/portfolio/transactions/search`, `GET /api/v1/me/portfolio/stocks`, `POST /api/v1/me/portfolio/transaction/v2` |
| Temporary Transactions (`TempTransactionsTableComponent`) | `/investments-tracking` | Apply quarterly corporate actions & redrive held trades | Investments Tracking | `GET /api/v1/me/portfolio/temporary-transactions`, `POST /api/v1/me/portfolio/temporary-transactions/redrive`, `PUT /api/v1/me/corporate-actions/perform?allBrokers=` |
| Corporate Actions (`CorporateActionListComponent`, `AddCorporateActionComponent`) | `/investments-tracking` | Browse, add, reprioritize, execute, delete corporate actions | Investments Tracking | `GET /api/v1/me/corporate-actions`, `GET /api/v1/me/corporate-actions/{id}`, `POST /api/v1/admin/corporate-actions`, `PATCH /api/v1/admin/corporate-actions/{id}`, `PUT /api/v1/admin/corporate-actions/perform`, `DELETE /api/v1/admin/corporate-actions/{id}` |
| Broker Charges (`BrokerChargesComponent`) | `/broker-charges` | Pre-trade simulator, ledger, contract notes, demat accounts, admin rate cards & AMC | Main nav | All `/api/v1/me/charges/...` & `/api/v1/admin/charges/...` endpoints |

---

## 5. Shared Core Foundations & Data/State Architecture

### 5.1 Reusable Pagination Utility (`Option A`)
- **Files:** `src/app/core/models/paged-response.model.ts`, `src/app/core/utils/pagination.util.ts`
- **Types:**
  - `PageMetadata`: `{ size: number; number: number; totalElements: number; totalPages: number }`
  - `PagedResponse<T>`: `{ content: T[]; page: PageMetadata }`
  - `PageRequest`: `{ page?: number; size?: number; sort?: string }`
- **Helper:** `fetchAllPages<T>(fetchPage: (page: number, size: number) => Observable<PagedResponse<T>>, options?: { pageSize?: number; maxPages?: number }): Observable<T[]>`
  - Default `pageSize = 200` (clamped `1..200` to respect backend `max-page-size: 200`), `maxPages = 100` safety guard.
  - Uses RxJS `expand` + `reduce` to fetch page `0`, then `page + 1` while `res.page.number + 1 < res.page.totalPages` and `res.content.length > 0`.
  - Propagates errors immediately without silent swallowing.
  - Services also expose or accept `PageRequest` internally so future server-side pagination UI can call single-page methods directly.

### 5.2 RFC 9457 `ProblemDetail` Error Parser
- **Files:** `src/app/core/models/problem-detail.model.ts`, `src/app/core/utils/http-error.util.ts`
- **Functions:**
  - `parseProblemDetail(error: unknown): ProblemDetail | null` — handles object `err.error`, JSON string `err.error` (when `responseType: 'text'` fails), and legacy `{ data: { message } }`.
  - `extractErrorMessage(error: unknown, fallback: string): string` — priority: `ProblemDetail.detail` → `ProblemDetail.title` → legacy `message`/`error` → non-`HttpErrorResponse` message → `fallback`.
  - `parseRetryAfterSeconds(error: HttpErrorResponse): number | null` — parses `Retry-After` header (integer seconds or HTTP-date) for `429` messages.
- **Reused by:** `AuthInterceptor`, `SignInComponent`, `SignUpComponent`, `ChangePasswordComponent`, `SettingsComponent`, `TransactionService.classifyUploadError`, and `describeHttpError`.

### 5.3 Token Storage & Auth Lifecycle (Priority 1)
- **Storage (`StorageKey` & `StorageService`):**
  - Keep `StorageKey.JWT_TOKEN = 'jwtToken'` and `StorageKey.USER_EMAIL = 'userEmail'` in `localStorage`.
  - Add `StorageKey.REFRESH_TOKEN = 'refreshToken'` stored in **`sessionStorage`** via dedicated methods (`getSessionItem`, `setSessionItem`, `removeSessionItem`) plus a clean `RefreshTokenMode = 'session-storage' | 'cookie'` abstraction in `AuthService` (default `'session-storage'`) so future `HttpOnly`/`Secure`/`SameSite` cookie mode only flips transport without changing callers.
- **Auth Models (`src/app/features/auth/models/`):**
  - `LoginResponse`: `{ access_token: string; expires_in: number; refresh_token: string; tokenType: string; privacy_notice?: string; privacy_notice_version?: string; email?: string }`
  - `RefreshResponse`: `{ access_token: string; expires_in: number; refresh_token: string; tokenType: string }`
  - `RegisterRequest`: `{ email: string; password: string; role: UserRole | string; privacyNoticeVersion: string }`
  - `PrivacyNotice`: `{ version: string; summary?: string; rights?: unknown; [key: string]: unknown }` (typed strictly from backend `PrivacyNotice.java`)
- **`AuthService`:**
  - `getPrivacyNotice(): Observable<PrivacyNotice>` → `GET /api/v1/public/privacy/rights` (cached in-memory via `shareReplay(1)` with error retry).
  - `register(user: RegisterRequest): Observable<string>` → `POST /api/v1/public/auth/register` with `responseType: 'text'`.
  - `login(user: LoginRequest): Observable<LoginResponse>` → `POST /api/v1/public/auth/login`; stores `access_token` in `localStorage`, `refresh_token` in `sessionStorage`, email & roles from JWT.
  - `refreshToken(): Observable<RefreshResponse>` → single-flight `POST /api/v1/public/auth/token/refresh` with `{ refresh_token }`; stores rotated `access_token` + `refresh_token`; concurrent callers share the same in-flight observable (`shareReplay(1)` cleared in `finalize`).
  - `logOut(redirect = true, returnUrl?: string): void` → if not demo and `refresh_token` exists, fires best-effort `POST /api/v1/public/auth/logout` with `{ refresh_token }` (expects `204`); always clears `localStorage` (`JWT_TOKEN`, `USER_EMAIL`), `sessionStorage` (`REFRESH_TOKEN`), timers, and signals.
  - `changePassword(email: string, oldPassword: string, newPassword: string): Observable<string>` → `PUT /api/v1/me/auth/password` with `responseType: 'text'`.
  - Proactive refresh before 15-min expiry: timer attempts `refreshToken()` 60s before access-token expiry when a refresh token is present; falls back to `logOut(true)` + "Session Expired" notification only if refresh fails or no refresh token exists.
- **`AuthInterceptor`:**
  - **Remove** legacy `{ data }` envelope unwrapping (`W-359a`).
  - Do **not** attach `Authorization` header to `/api/v1/public/` URLs (prevents stale Bearer tokens on login/register/refresh/logout/privacy).
  - Add `HttpContextToken<boolean>(() => false)` (`RETRY_AFTER_REFRESH`) to prevent infinite retry loops.
  - On `401` (non-demo, non-`/api/v1/public/auth/`, not already retried): call `authService.refreshToken()`, clone request with new `Bearer <access_token>` and `RETRY_AFTER_REFRESH = true`, and retry once. If refresh fails → `authService.logOut(false)`, show "Session Expired" warning, redirect to sign-in modal with `returnUrl`.
  - On `429`: attach/surface rate-limit detail (with `Retry-After` seconds if present) and rethrow so forms display the cooldown message cleanly.
  - On `403`: show "Access Denied" notification using `ProblemDetail.detail` when present.
- **`authGuard`:**
  - If `JWT_TOKEN` is valid → `true`.
  - Else if `authService.hasRefreshToken()` → `authService.refreshToken().pipe(map(() => true), catchError(() => of(signInUrlTree)))`.
  - Else → redirect to sign-in modal with `returnUrl`.
- **Auth Components (`SignUpComponent`, `SignInComponent`, `ChangePasswordComponent`, `SettingsComponent`):**
  - `SignUpComponent`: load `privacyNoticeVersion` from `AuthService.getPrivacyNotice()` on init; add required `acceptPrivacyNotice` checkbox (`Validators.requiredTrue`) with link to backend `/privacy` page and loading/error retry state; pass `privacyNoticeVersion` in `RegisterRequest`; handle `400`, `409`, `429` (`Retry-After`) via `extractErrorMessage`.
  - `SignInComponent`: handle `401`, `403`, `404`, `429` (`Retry-After`), `0` via `extractErrorMessage`.
  - `ChangePasswordComponent` & `SettingsComponent`: use `extractErrorMessage` for `ProblemDetail` responses (including `text/plain` error JSON).

---

## 6. Module-by-Module Migration Plan (Priorities 2–5)

### 6.1 Priority 2 — Portfolio & Transactions (`TransactionService`, `UploadTransactionsComponent`, `SettingsComponent`)
- **Strict Models:**
  - Add `src/app/shared/models/asset-request.model.ts` (`AssetRequest`, `OrderTimeQuantity`) matching `AssetRequest.java` exactly (no unknown fields).
  - Update `src/app/shared/models/transactions-response.model.ts`: add `transactionId?: string`, `status?: 'TEMPORARY' | 'PROCESSED'`, `segment?: TradeSegment`, `charges?: unknown | null` while keeping `id?: string | number` backward-compatible with existing portfolio analytics & tax filing consumers.
- **`TransactionService` endpoint & contract updates:**
  - `getUserTransactions(email)` → `fetchAllPages` over `GET /api/v1/me/portfolio/transactions?page=&size=` (keep `email` parameter for demo-mode check only; never put `{email}` in URL).
  - `getCurrentTransactions(email, queryFilters = [])` → `fetchAllPages` over `POST /api/v1/me/portfolio/transactions/search?page=&size=` with body `{ queryFilters }` (**fixes `filters` → `queryFilters` 400 bug**).
  - `getTransactionsByStock(email, stockCode)` → `fetchAllPages` over `POST /api/v1/me/portfolio/transactions/search?page=&size=` with `{ queryFilters }`.
  - `addTransaction(email, transactionData: AssetRequest): Observable<string>` → **`POST /api/v1/me/portfolio/transaction/v2`** with `responseType: 'text'` (**D1**).
  - `uploadTransactions(email, file, quarter: string): Observable<HttpEvent<string>>` → `POST /api/v1/me/portfolio/transactions/uploads?quarter=<Q1..Q4>` with `responseType: 'text'`, `observe: 'events'`, `reportProgress: true` (**D5**). Validate `quarter` is one of `Q1 | Q2 | Q3 | Q4` client-side.
  - `interpretUploadResponse(body)`: parse both new `master` response (`"From ..., quarter Q1: X recorded, Y already recorded...; held back for a corporate action: [...]"`) and legacy format (`"No transaction uploaded..."`, `"Filtered out transactions: [...]"`).
  - `classifyUploadError(err)`: read RFC 9457 `ProblemDetail.detail` first (including JSON string errors from `responseType: 'text'`), add `429` handling, preserve all existing client validation categories (`no-file`, `bad-extension`, `too-large`, `no-email`).
  - `getTemporaryTransactions(email)` → `GET /api/v1/me/portfolio/temporary-transactions`.
  - `redriveTemporaryTransactions(email)` → `POST /api/v1/me/portfolio/temporary-transactions/redrive` (no body / `{}`).
  - `getAllHoldings(email)` → `GET /api/v1/me/portfolio/stocks`.
  - `clearAllRecords(email): Observable<string>` → **`DELETE /api/v1/me/portfolio`** with `responseType: 'text'` (method changed `POST` → `DELETE`).

### 6.2 Priority 3 — Corporate Actions (`CorporateActionService`, `CorporateActionListComponent`, `TempTransactionsTableComponent`)
- **`CorporateActionService`:**
  - `getAllCorporateActions(): Observable<CorporateActionDto[]>` → `fetchAllPages` over `GET /api/v1/me/corporate-actions?page=&size=`.
  - `getCorporateActions(ids: string[]): Observable<CorporateActionDto[]>` → `fetchAllPages` over `GET /api/v1/me/corporate-actions?ids=<csv>&page=&size=`.
  - `getCorporateActionById(id: string): Observable<CorporateActionDto>` → `GET /api/v1/me/corporate-actions/${encodeURIComponent(id)}`.
  - `performBatchCorporateActions(email, payload, allBrokers = false): Observable<CorporateActionPerformDto>` → `PUT /api/v1/me/corporate-actions/perform?allBrokers=${allBrokers}` (JSON response, remove `responseType: 'text'`).
  - `addCorporateAction(payload: CorporateActionDto): Observable<string>` → `POST /api/v1/admin/corporate-actions` (`responseType: 'text'`).
  - `updateCorporateActionPriority(id: string, priority: number): Observable<string>` → **`PATCH /api/v1/admin/corporate-actions/${encodeURIComponent(id)}`** with body `{ priority }` (`responseType: 'text'`).
  - `performSingleCorporateAction(payload: CorporateActionDto): Observable<string>` → `PUT /api/v1/admin/corporate-actions/perform` (`responseType: 'text'`).
  - `deleteCorporateAction(id: string): Observable<void>` → `DELETE /api/v1/admin/corporate-actions/${encodeURIComponent(id)}` (empty `200`, typed `Observable<void>`).
  - **Remove** `anyCorporateActionToPerform` (**D2**).
  - Update `describeHttpError` to delegate to `extractErrorMessage` (RFC 9457 `ProblemDetail` aware).
- **Components:** Verify `TempTransactionsTableComponent` and `CorporateActionListComponent` handle JSON `CorporateActionPerformDto` and `void` delete cleanly without assuming string bodies.

### 6.3 Priority 4 — Broker Charges (`BrokerChargesService`, `BrokerChargesComponent`, `broker-charges.model.ts`)
- **Models (`broker-charges.model.ts`):**
  - Change `AmcChargeFrequency` from `'QUARTERLY' | 'YEARLY'` → **`'QUARTERLY' | 'ANNUALLY'`**.
  - Update `ChargeSimulationRequest`: add required `transactionDate: string` (`yyyy-MM-dd`).
  - Add strict request DTOs to satisfy `fail-on-unknown-properties: true`:
    - `ChargeAccountRequest`: `{ dematAccountId, brokerName, accountHolder, openedOn, amcFrequency, planCode? }` (strips `id`, `email`, `lastBilledThrough`, `billingEvents`).
    - `ChargeScheduleRequest`: `{ scheduleCode, brokerName, assetType?, segment?, exchange?, planCode?, startDate, endDate?, verifiedOn?, sourceUrl?, rules }` (strips `id` / audit fields).
  - Update `ChargeBreakdownResponse`: match backend (`scheduleCode`, `statutoryScheduleCode`, `instrumentId`, `resolution`, `lines`, `amountByCode`, `totalCharges`); remove bogus `scheduleId` / server-assumed fields.
  - Update `ChargeLine`: add `basis?: string`, `source?: string`.
- **Financial Derivation Helper (`charge-deductibility.util.ts` — D3):**
  - Pure, unit-tested function `summarizeChargeBreakdown(breakdown, catalogue, turnoverInput?)`:
    - `turnover`: `quantity * price` when valid finite `>= 0` inputs are provided, else `null`.
    - `deductibleCharges` & `nonDeductibleCharges`: computed **only** when `catalogue.length > 0` and every `line.code` in `breakdown.lines` exists in the catalogue map (`deductibleForCapitalGains === true` vs `false`). If any code is unmapped or catalogue is empty, return `null` (never guess!).
- **`BrokerChargesService` endpoints:**
  - `/api/v1/me/charges/simulate` (`POST`), `/api/v1/me/charges/charge-catalogue` (`GET`)
  - `/api/v1/me/charges/user-charges` (`GET`, paginated via `fetchAllPages`, `?from=&to=&assetType=`)
  - `/api/v1/me/charges/user-charges/transaction/{transactionId}` (`GET`)
  - `/api/v1/me/charges/user-charges/gaps` (`GET`)
  - `/api/v1/me/charges/user-charges/reconciliation` (`GET`)
  - `/api/v1/me/charges/accounts` (`GET`, `POST` with sanitized `ChargeAccountRequest`)
  - `/api/v1/admin/charges/schedules` (`GET ?broker=`, `POST` with sanitized `ChargeScheduleRequest`)
  - `/api/v1/admin/charges/schedules/{code}` (`GET`), `/unverified` (`GET`), `/{code}/close?endDate=` (`PATCH`), `/drift` (`GET`)
  - `/api/v1/admin/charges/seed` (`POST`)
  - `/api/v1/admin/charges/accounts/due?frequency=&billedThrough=` (`GET`)
  - `/api/v1/admin/charges/amc/impose?frequency=&billedThrough=` (`POST`)
  - Keep demo-mode mock fallback when `this.authService.isDemo()` is true; for real authenticated sessions, propagate HTTP errors cleanly (or handle in component with toast) instead of silently masking API failures with fake financial data!
- **`BrokerChargesComponent` & template:**
  - Add `simTransactionDate = signal<string>(new Date().toISOString().split('T')[0])` and bind a date input in the Pre-Trade Simulator; require `stockCode` when `BUY`/`SELL`.
  - Replace `'YEARLY'` options with `'ANNUALLY'` in both Demat Account modal and Admin AMC Billing Console.
  - Display `deductibleCharges` / `nonDeductibleCharges` in Simulator, Contract Note modal, and Ledger summary using `summarizeChargeBreakdown` (displaying `—` when catalogue classification is unavailable).

### 6.4 Priority 5 — Templates (`TransactionService`)
- `downloadTemplate(): Observable<Blob>` → `GET /api/v1/me/templates/excel` with `{ responseType: 'blob' }`.

---

## 7. Roles, Messages, Accessibility & Responsiveness
- **Roles:** `/api/v1/admin/**` actions remain gated in UI by `authService.isSuperUser()` / `isAdminUser()` and enforced server-side (`403` surfaces `ProblemDetail.detail`).
- **Rate Limiting (`429`):** Auth forms and interceptor surface clear wait guidance (`"Too many attempts. Please try again in X seconds."` when `Retry-After` is present).
- **Accessibility:** New DPDP consent checkbox in `SignUpComponent` and `Transaction Date` input in `BrokerChargesComponent` use proper `<label for="...">`, keyboard focusable controls, and `aria-invalid` / error announcements matching existing form patterns.
- **Responsiveness:** New form controls follow existing Tailwind grid/stack spacing in `sign-up.component.html` and `broker-charges.component.html`.

---

## 8. Out of Scope
- New backend features without existing UI: DPDP privacy dashboard (`/privacy-settings` export/delete/consent history), Tax Planning workspace, Insurance module, Property Sales module.
- Server-side pagination UI controls (table page pickers / infinite scroll) — deferred, though service architecture keeps single-page fetch methods ready.
- Backend code or API contract modifications.

---

## 9. Open Questions / Assumptions
- **Assumption A1 (`BrokerChargesService` real-user error handling):** Existing `BrokerChargesService` has `catchError(() => of(mockData))` on all methods. For authenticated real users, silently substituting mock financial figures on API errors is risky; we will return mock data only when `authService.isDemo()` is true and surface real errors via toast in `BrokerChargesComponent`. (Let us know if you prefer keeping offline mock fallback for non-demo users.)
- **Assumption A2 (`PrivacyNotice` link URL):** `SignUpComponent` will link to `${baseUrl}/privacy` (backend's public HTML privacy notice endpoint) in a new tab (`target="_blank" rel="noopener noreferrer"`), and display the notice version + summary fetched from `GET /api/v1/public/privacy/rights`.

---

## Changelog
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-25 | Created in Phase 2 — Planning after inspecting frontend codebase and verifying backend `master` contracts for D1–D5 |
