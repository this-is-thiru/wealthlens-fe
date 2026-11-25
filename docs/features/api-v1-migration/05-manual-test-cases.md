# Manual Test Checklist — API v1 migration (`api-v1-migration`)

> Branch: `feature/api-v1-migration` · Backend target: `this-is-thiru/wealthlens` (`master` branch) running locally or in staging · All manual cases below start as `NOT TESTED` until executed against a live backend.

---

## 1. Automated vs. Manual Test Scope

| Category | Verification Method | Current Status |
|---|---|---|
| Unit / Contract Tests (pagination, `ProblemDetail` + `429`, single-flight refresh & rotation, DPDP sign-up guard, `TransactionService` v1/v2/DELETE/blob, `CorporateActionService` v1, `BrokerChargesService` v1 + demo-only fallback, catalogue-backed deductibility) | `npm run test:ci` (Vitest) | **PASSED** (55/55 files, 212/212 tests) |
| End-to-End Integration against Live Backend `master` (browser Network tab, JWT/refresh rotation, DPDP `/privacy` HTML, PostgreSQL persistence, Excel `.xlsx` parsing, role enforcement, real `429` throttling) | Manual execution (this checklist) | **NOT TESTED** |

**Prerequisites for Manual Execution:**
- Backend `wealthlens` (`master`) running and reachable at `environment.apiUrl`.
- Frontend running via `npm run start` (Docker-free).
- Two test accounts: a standard `USER` account and a `SUPER_USER` account, plus Demo Mode.
- Browser DevTools **Network** tab (with "Preserve log" enabled) and **Application → Storage** (`localStorage` + `sessionStorage`) open.

---

## 2. Area 1 — Auth, DPDP Consent, Refresh-Token Rotation & Logout

| ID | Priority | Preconditions & Steps | Network-Tab / Storage Verification | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| `TC-AUTH-01` | **P0** | Open `(modal:sign-up)` while signed out. | `GET /api/v1/public/privacy/rights` → `200 application/json`, no `Authorization` header. | Consent checkbox is **unchecked** by default; fetched `version` is shown beside the Privacy Notice link; Sign Up button is disabled. | — | `NOT TESTED` |
| `TC-AUTH-02` | **P0** | Click **Privacy Notice** link in Sign-Up modal. | New tab opens `${baseUrl}/privacy` → `200 text/html`. | Backend's public DPDP Privacy Notice HTML page renders cleanly without requiring login. | — | `NOT TESTED` |
| `TC-AUTH-03` | **P0** | Fill valid email/password/confirm, leave consent unchecked, attempt submit; then check consent and submit. | `POST /api/v1/public/auth/register` → `200 text/plain`; request body includes exact `privacyNoticeVersion`; no `Authorization` header. | Blocked without consent; once checked, succeeds without JSON parse error, shows success toast, and navigates to Sign-In modal. | — | `NOT TESTED` |
| `TC-AUTH-04` | **P0** | Block `/api/v1/public/privacy/rights` in DevTools Network tab and open Sign-Up modal; then unblock and click **Retry**. | Failed `GET` → danger `ui-alert` shown; Retry triggers fresh `GET` → `200`. | Sign Up button remains disabled while version is unavailable; recovers cleanly after Retry succeeds. | — | `NOT TESTED` |
| `TC-AUTH-05` | **P0** | Sign in with valid `USER` credentials. | `POST /api/v1/public/auth/login` → `200 application/json` (`access_token`, `expires_in: 900`, `refresh_token`, `tokenType`). | `jwtToken` + `userEmail` stored in `localStorage`; `refreshToken` stored **only** in `sessionStorage` (never `localStorage`); user redirected to app. | — | `NOT TESTED` |
| `TC-AUTH-06` | **P0** | Replace `localStorage.jwtToken` with an expired JWT (keep valid `sessionStorage.refreshToken`), then open `/broker-charges` (fires multiple parallel API calls). | Exactly **one** `POST /api/v1/public/auth/token/refresh` (no `Authorization` header) → `200`; all failed requests retried once with new `Bearer` token. | Single-flight refresh rotates both `jwtToken` (`localStorage`) and `refreshToken` (`sessionStorage`); all parallel requests succeed without revocation or logout. | — | `NOT TESTED` |
| `TC-AUTH-07` | **P0** | With expired `jwtToken` and valid `sessionStorage.refreshToken`, reload directly on `/portfolio-analytics`. | `authGuard` calls `POST /api/v1/public/auth/token/refresh` → `200`. | User stays on `/portfolio-analytics` seamlessly without being bounced to Sign-In. | — | `NOT TESTED` |
| `TC-AUTH-08` | **P0** | Click **Sign Out** from Header or Settings; also test Change Password (`PUT /api/v1/me/auth/password`). | Logout: `POST /api/v1/public/auth/logout` with `{ refresh_token }` → `204 No Content`. Password: `PUT /api/v1/me/auth/password` → `200 text/plain`. | Logout clears `localStorage` (`jwtToken`, `userEmail`) and `sessionStorage` (`refreshToken`) and navigates to `/home`. Password change succeeds without JSON parse error. | — | `NOT TESTED` |

---

## 3. Area 2 — Portfolio, Transactions, Pagination & Templates

| ID | Priority | Preconditions & Steps | Network-Tab / Storage Verification | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| `TC-PORT-01` | **P0** | Open `/portfolio-analytics` and `/tax-filing` for a user with > 200 transactions (or verify page 0). | `POST /api/v1/me/portfolio/transactions/search?page=0&size=200` (then `page=1&size=200` if `totalPages > 1`); body `{ queryFilters: [] }` (NOT `filters`); no `{email}` in URL. | All pages aggregated cleanly; analytics charts, holdings, and tax tables render complete dataset. | — | `NOT TESTED` |
| `TC-PORT-02` | **P0** | Open `/investments-tracking` → Portfolio Stocks and expand a stock's transaction drill-down. | `GET /api/v1/me/portfolio/stocks` → `200 JSON array`; drill-down `POST /api/v1/me/portfolio/transactions/search?page=0&size=200` with `queryFilters` for `stock_code`. | Holdings table and per-stock transaction list load without `{ data }` wrapper errors. | — | `NOT TESTED` |
| `TC-PORT-03` | **P0** | On Upload Transactions, click **Download Template**. | `GET /api/v1/me/templates/excel` → `200` binary `.xlsx` (`Blob`). | Valid Excel template file downloads and opens cleanly in Excel. | — | `NOT TESTED` |
| `TC-PORT-04` | **P0** | Upload a valid `.xlsx` workbook selecting quarter `Q1` (and repeat with `Q2`). | `POST /api/v1/me/portfolio/transactions/uploads?quarter=Q1` → `200 text/plain`; multipart `file`. | Upload progress completes; success banner displays backend's `"From ..., quarter Q1: X recorded..."` message. | — | `NOT TESTED` |
| `TC-PORT-05` | **P1** | Upload a workbook containing trades held back for a pending corporate action. | `POST /api/v1/me/portfolio/transactions/uploads?quarter=Q1` → `200 text/plain` containing `held back for a corporate action: [...]`. | Warning banner displays held transaction count and instructs user to apply corporate actions then redrive. | — | `NOT TESTED` |
| `TC-PORT-06` | **P1** | Open Temporary Transactions tab and click **Redrive**. | `GET /api/v1/me/portfolio/temporary-transactions` → `200 JSON[]`; `POST /api/v1/me/portfolio/temporary-transactions/redrive` → `200 RedriveResult`. | Pending rows list and redrive result summary display accurately. | — | `NOT TESTED` |
| `TC-PORT-07` | **P1** | Trigger single-trade add (`addTransaction`) via API/UI flow. | `POST /api/v1/me/portfolio/transaction/v2` → `200 text/plain`; strict `AssetRequest` JSON body. | Authoritative backend broker charges are computed and trade is recorded cleanly. | — | `NOT TESTED` |
| `TC-PORT-08` | **P0** | Open `/settings` → **Reset portfolio data** → confirm dialog. | `DELETE /api/v1/me/portfolio` (HTTP `DELETE`, not `POST`) → `200 text/plain`. | Portfolio cleared; success notification shown without JSON parse error. | — | `NOT TESTED` |

---

## 4. Area 3 — Corporate Actions (User & `SUPER_USER` Admin)

| ID | Priority | Preconditions & Steps | Network-Tab / Storage Verification | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| `TC-CA-01` | **P0** | Open Corporate Actions list as `USER` or `SUPER_USER`. | `GET /api/v1/me/corporate-actions?page=0&size=200` (and subsequent pages if `totalPages > 1`). | Full list renders; clicking a row calls `GET /api/v1/me/corporate-actions/{id}` and opens detail modal. | — | `NOT TESTED` |
| `TC-CA-02` | **P0** | On Temporary Transactions tab, apply quarterly corporate actions (both single broker and All Brokers). | `PUT /api/v1/me/corporate-actions/perform?allBrokers=true|false` → `200 application/json` (`CorporateActionPerformDto`). | Success alert renders; no text-parsing failure. | — | `NOT TESTED` |
| `TC-CA-03` | **P1** | Signed in as `SUPER_USER`, add a new corporate action. | `POST /api/v1/admin/corporate-actions` → `200 text/plain`. | Action created and appears in list. | — | `NOT TESTED` |
| `TC-CA-04` | **P0** | Signed in as `SUPER_USER`, edit an action's priority inline and save. | `PATCH /api/v1/admin/corporate-actions/{id}` with JSON body `{ "priority": <n> }` → `200 text/plain`. | Priority updates and persists across reload. | — | `NOT TESTED` |
| `TC-CA-05` | **P1** | Signed in as `SUPER_USER`, execute a `NAME_OR_SYMBOL_CHANGE` action from detail modal. | `PUT /api/v1/admin/corporate-actions/perform` → `200 text/plain`. | Executes cleanly with success notification. | — | `NOT TESTED` |
| `TC-CA-06` | **P1** | Signed in as `SUPER_USER`, delete a corporate action and confirm. | `DELETE /api/v1/admin/corporate-actions/{id}` → `200` empty body (`void`). | Row removed from table without error. | — | `NOT TESTED` |

---

## 5. Area 4 — Broker Charges

| ID | Priority | Preconditions & Steps | Network-Tab / Storage Verification | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| `TC-BC-01` | **P0** | Open `/broker-charges` as authenticated `USER`; change Symbol, Transaction Date, Quantity, Price, and BUY/SELL. | `POST /api/v1/me/charges/simulate` with `transactionDate` (`yyyy-MM-dd`), `stockCode`, `quantity`, `price` → `200 ChargeBreakdownResponse`; `GET /api/v1/me/charges/charge-catalogue` → `200`. | Turnover = `price × qty`; itemized lines match backend; Deductible / Non-Deductible totals match catalogue classification. | — | `NOT TESTED` |
| `TC-BC-02` | **P0** | Block `/api/v1/me/charges/charge-catalogue` (or return a line code not in catalogue) and run simulator. | `GET .../charge-catalogue` fails; `POST .../simulate` returns `200`. | Deductible & Non-Deductible show `—` (with muted tooltip) — **zero** guessed numbers displayed. | — | `NOT TESTED` |
| `TC-BC-03` | **P0** | Load Charges Ledger with date/asset filters and click a row's **Contract Note**. | `GET /api/v1/me/charges/user-charges?page=0&size=200&from=...&to=...&assetType=...`; `GET /api/v1/me/charges/user-charges/transaction/{txnId}`; `GET .../gaps`. | All pages aggregated; Contract Note modal displays itemized lines and catalogue-backed deductible total (or `—`). | — | `NOT TESTED` |
| `TC-BC-04` | **P0** | Open **Link New Demat Account**, choose `Annual` (`ANNUALLY`), submit. | `POST /api/v1/me/charges/accounts` body contains ONLY `dematAccountId`, `brokerName`, `accountHolder`, `openedOn`, `amcFrequency: "ANNUALLY"`, `planCode` (no `id`/`email`). | Returns `200`/`201` (no Jackson unknown-property `400` or `YEARLY` enum `400`). | — | `NOT TESTED` |
| `TC-BC-05` | **P0** | Simulate a `500` error on `/api/v1/me/charges/simulate` for a real authenticated user (not Demo). | `POST /api/v1/me/charges/simulate` → `500 ProblemDetail`. | Toast surfaces error message; **no** silent mock financial data is substituted (**A1**). | — | `NOT TESTED` |
| `TC-BC-06` | **P1** | Signed in as `SUPER_USER`, switch to Admin Console: load Rate Cards, Unverified, Drift, Seed, and Close Schedule. | Calls `/api/v1/admin/charges/schedules`, `/unverified`, `/drift`, `POST /seed`, `PATCH /schedules/{code}/close?endDate=`. | All admin endpoints succeed with strict payloads. | — | `NOT TESTED` |
| `TC-BC-07` | **P1** | Signed in as `SUPER_USER`, Preview Due & Impose AMC with `Annual AMC` (`ANNUALLY`). | `GET /api/v1/admin/charges/accounts/due?frequency=ANNUALLY&billedThrough=...`; `POST /api/v1/admin/charges/amc/impose?frequency=ANNUALLY&billedThrough=...`. | Returns due/billed accounts without `400` enum error. | — | `NOT TESTED` |

---

## 6. Area 5 — Validation

| ID | Priority | Preconditions & Steps | Network-Tab / Storage Verification | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| `TC-VAL-01` | **P0** | Sign-Up modal: invalid email, password < 6 chars, mismatched confirm password, or unchecked DPDP consent. | Zero network calls sent. | Inline validation messages shown; Sign Up button stays disabled. | — | `NOT TESTED` |
| `TC-VAL-02` | **P1** | Simulator: clear Symbol on `BUY`/`SELL` and click Recalculate. | Zero network calls sent. | Warning toast prompts for stock symbol before calling `/charges/simulate`. | — | `NOT TESTED` |
| `TC-VAL-03` | **P1** | Upload Transactions: pick `.xls` / `.csv` / >10 MB file. | Zero network calls sent. | Client validation rejects file with clear message (`Wrong file type` / `File too large`). | — | `NOT TESTED` |
| `TC-VAL-04` | **P1** | Change Password: enter same new password as old password or mismatched confirm. | Zero network calls sent. | Submit button remains disabled with inline error. | — | `NOT TESTED` |
| `TC-VAL-05` | **P2** | Demat Account modal: submit with empty BOID. | Zero network calls sent. | Warning toast `"Please enter a Demat Account ID / BOID"`. | — | `NOT TESTED` |

---

## 7. Area 6 — Error Handling (`400`, `401`, `403`, `404`, `409`, `429`, `500`, Network, Slow, Double Submit)

| ID | Priority | Preconditions & Steps | Network-Tab / Storage Verification | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| `TC-ERR-01` | **P0** | Trigger `400` RFC 9457 `ProblemDetail` (e.g. malformed upload sheet or invalid charge input). | Response `{ type, title, status: 400, detail, instance }`. | UI displays `ProblemDetail.detail` cleanly (even on `responseType: 'text'` endpoints). | — | `NOT TESTED` |
| `TC-ERR-02` | **P0** | Trigger `401` on Sign-In (wrong password). | `POST /api/v1/public/auth/login` → `401`. | No refresh attempt, no "Session Expired" redirect; Sign-In form shows invalid credentials message. | — | `NOT TESTED` |
| `TC-ERR-03` | **P0** | Trigger `401` with revoked/expired `refresh_token` on a protected request. | `POST /api/v1/public/auth/token/refresh` → `401`. | Clears `localStorage` + `sessionStorage`, shows "Session Expired" warning, opens Sign-In modal with `returnUrl`. | — | `NOT TESTED` |
| `TC-ERR-04` | **P0** | Trigger `403` by calling an `/api/v1/admin/...` action as a standard `USER`. | `403 ProblemDetail`. | "Access Denied" notification displays `ProblemDetail.detail`. | — | `NOT TESTED` |
| `TC-ERR-05` | **P1** | Trigger `404` (e.g. non-existent corporate action ID or contract note). | `404 ProblemDetail`. | Friendly not-found message displayed; no uncaught exception. | — | `NOT TESTED` |
| `TC-ERR-06` | **P1** | Register with an already-registered email (`409`). | `POST /api/v1/public/auth/register` → `409 ProblemDetail` (text error body). | Sign-Up shows `"already registered"` message from `ProblemDetail.detail`. | — | `NOT TESTED` |
| `TC-ERR-07` | **P0** | Exceed auth rate limit (5+ failed logins) to trigger `429 Too Many Requests` + `Retry-After`. | `429` with `Retry-After` header and `ProblemDetail`. | Form displays rate-limit cooldown message including wait time in seconds; does not trigger logout loop. | — | `NOT TESTED` |
| `TC-ERR-08` | **P1** | Simulate `500` on upload or broker charges. | `500 ProblemDetail` with `X-Request-Id` in `detail`. | Graceful error message shown; no raw stack trace or Angular `Http failure response for...` leaked. | — | `NOT TESTED` |
| `TC-ERR-09` | **P1** | Switch DevTools Network to **Offline** and submit login/upload. | Status `0` network error. | Clear connection-problem message shown; loading spinners reset. | — | `NOT TESTED` |
| `TC-ERR-10` | **P1** | Throttle network to **Slow 3G** and double-click Submit on Sign-Up, Change Password, and Reset Portfolio. | Only **one** HTTP request fired per action. | Buttons disable (`[loading]` / `[disabled]`) while in-flight; no duplicate submissions. | — | `NOT TESTED` |

---

## 8. Area 7 — Security

| ID | Priority | Preconditions & Steps | Network-Tab / Storage Verification | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| `TC-SEC-01` | **P0** | Visit `/investments-tracking`, `/portfolio-analytics`, `/broker-charges`, `/tax-filing`, `/settings` while signed out (empty `localStorage` & `sessionStorage`). | No protected API calls fired. | `authGuard` redirects to `(modal:sign-in)` with safe in-app `returnUrl`. | — | `NOT TESTED` |
| `TC-SEC-02` | **P0** | Inspect every `/api/v1/me/...` request URL in Network tab. | All `/me/` paths contain **no** user email in URL path or query string. | Caller identity is derived solely from `Authorization: Bearer <jwt>`. | — | `NOT TESTED` |
| `TC-SEC-03` | **P0** | Inspect `localStorage`, `sessionStorage`, and DevTools Console after login & logout. | `refreshToken` exists only in `sessionStorage` while signed in; completely removed on logout; no raw passwords or tokens logged. | Closing the browser tab drops `sessionStorage.refreshToken`; logout wipes both storages. | — | `NOT TESTED` |
| `TC-SEC-04` | **P0** | Inspect external requests (e.g. Google Sheets CSV live prices) and `/api/v1/public/...` requests. | Zero `Authorization` header sent cross-origin or to `/api/v1/public/...`. | Tokens are never leaked cross-origin or to public endpoints. | — | `NOT TESTED` |
| `TC-SEC-05` | **P1** | Open Sign-In with malicious `?returnUrl=https://evil.com` or `?returnUrl=//evil.com`. | After login, check `window.location`. | `getReturnUrl()` rejects external/protocol-relative URLs and navigates to `/home`. | — | `NOT TESTED` |
| `TC-SEC-06` | **P1** | Enter `<script>alert(1)</script>` in stock symbol / demat holder / search filter. | Inspect DOM rendering. | Angular interpolation escapes HTML; no script executes. | — | `NOT TESTED` |

---

## 9. Area 8 — UI Consistency, Responsiveness & Accessibility

| ID | Priority | Preconditions & Steps | Verification | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| `TC-UI-01` | **P1** | Inspect Sign-Up DPDP consent block and Broker Charges Simulator on desktop (`1440px`) and mobile (`375px`). | Visual & DevTools responsive mode. | Uses existing dark theme tokens (`bg-surface-alt`, `border-border`, `text-accent`); `Symbol` + `Transaction Date` stack cleanly on mobile without horizontal scroll. | — | `NOT TESTED` |
| `TC-UI-02` | **P1** | Keyboard-only navigation (`Tab` / `Space` / `Enter`) through Sign-Up modal (including DPDP checkbox & Privacy Notice link) and Simulator inputs. | Keyboard focus ring visible on every interactive element. | Checkbox toggles with `Space`; Privacy link opens in new tab with `noopener noreferrer`; labels focus associated inputs. | — | `NOT TESTED` |
| `TC-UI-03` | **P2** | Verify `ANNUALLY` dropdown options in Demat Account modal and Admin AMC Console. | Inspect `<option>` values & labels. | Displays `Annual` / `Annual AMC` with underlying value `ANNUALLY`. | — | `NOT TESTED` |
| `TC-UI-04` | **P2** | Verify `—` placeholder state in Broker Charges KPI ribbon, Simulator banner, and Contract Note modal when catalogue is empty. | Inspect text contrast & `title` tooltip. | Clear muted `—` shown with accessible `title` explanation; no layout shift. | — | `NOT TESTED` |

---

## 10. Area 9 — Regression

| ID | Priority | Preconditions & Steps | Network-Tab / Verification | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| `TC-REG-01` | **P0** | Click **Try Demo Mode** from Home; navigate Portfolio Analytics, Tax Filing, Broker Charges. | Zero backend HTTP calls fired for demo reads; demo writes refuse with `403`. | Demo mode works completely offline with sample data; `sessionStorage.refreshToken` stays empty. | — | `NOT TESTED` |
| `TC-REG-02` | **P0** | Verify Portfolio Analytics KPIs, holdings table, and charts for a real user. | `/api/v1/me/portfolio/transactions/search` + `/api/v1/me/portfolio/stocks`. | Calculations, filters, and charts match pre-migration behavior. | — | `NOT TESTED` |
| `TC-REG-03` | **P1** | Verify Tax Filing capital gains summary & tables for a real user. | `/api/v1/me/portfolio/transactions/search` (`queryFilters`). | Tax calculations render accurately with full paginated transaction history. | — | `NOT TESTED` |
| `TC-REG-04` | **P1** | Verify Investments Tracking tab switching (Upload, Holdings, Temporary, Corporate Actions). | All tabs load cleanly. | No console errors, broken bindings, or stale state across tabs. | — | `NOT TESTED` |

---

## 11. Summary & Riskiest Areas to Test First

| Priority | Total Cases | Automated Counterpart | Manual Status |
|---|---|---|---|
| **P0** (Critical) | 28 | Covered at unit/HTTP-mock level | 0 / 28 executed (`NOT TESTED`) |
| **P1** (High) | 23 | Covered at unit/HTTP-mock level | 0 / 23 executed (`NOT TESTED`) |
| **P2** (Medium) | 3 | — | 0 / 3 executed (`NOT TESTED`) |
| **Total** | **54** | **212 Vitest tests passing** | **0 / 54 executed (`NOT TESTED`)** |

**Riskiest Areas to Test First against Live Backend `master`:**
1. **Concurrent `401` single-flight refresh rotation (`TC-AUTH-06`, `TC-AUTH-07`, `TC-ERR-03`):** Any race condition or stale `Authorization` header on `/token/refresh` would trigger backend refresh-token reuse revocation.
2. **DPDP Sign-Up consent & `text/plain` endpoints (`TC-AUTH-01`–`TC-AUTH-04`, `TC-PORT-04`, `TC-PORT-08`):** First live verification of `privacyNoticeVersion`, `/privacy` HTML route, and `text/plain` responses without `{ data }` unwrapping.
3. **Pagination & `queryFilters` search (`TC-PORT-01`, `TC-CA-01`, `TC-BC-03`):** Verifies `PagedModel` (`via-dto`) unwrapping across real multi-page responses.
4. **Strict Jackson payloads & Broker Charges (`TC-BC-01`, `TC-BC-02`, `TC-BC-04`, `TC-BC-05`):** Verifies `transactionDate`, `ANNUALLY`, sanitized POST bodies, catalogue-backed deductibility (`—` fallback), and zero mock fallback for real users.

---

## Changelog
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-25 | Created in Phase 5 — Manual Test Checklist (54 structured manual cases across 9 areas; all marked `NOT TESTED` pending live backend execution) |
