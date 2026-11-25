# Work Items — API v1 migration (`api-v1-migration`)

**Progress:** 22 / 22 sub-items done
**Status values:** TODO · IN_PROGRESS · BLOCKED · IN_REVIEW · DONE
Rules: one sub-item IN_PROGRESS at a time · a parent is DONE only when all sub-items are DONE · BLOCKED needs a reason.

| ID | Work item | Status | Depends on | Updated | Notes |
|---|---|---|---|---|---|
| **WI-1** | **Shared Core Foundations (Pagination, ProblemDetail, Token Storage)** | DONE | — | 2026-11-25 | Reusable core models & utilities |
| WI-1.1 | Add `PagedResponse<T>` model and `fetchAllPages` pagination utility + unit tests | DONE | — | 2026-11-25 | Respects backend `max-page-size: 200`, Option A |
| WI-1.2 | Add RFC 9457 `ProblemDetail` model and `http-error.util.ts` (`extractErrorMessage`, `parseRetryAfterSeconds`) + unit tests | DONE | — | 2026-11-25 | Handles JSON objects, text error bodies, `429 Retry-After` |
| WI-1.3 | Extend `StorageKey` (`REFRESH_TOKEN`) and `StorageService` with `sessionStorage` helpers | DONE | — | 2026-11-25 | D4: refresh token in `sessionStorage`, separate from access token |
| **WI-2** | **Priority 1 — Auth, Refresh-Token Lifecycle, DPDP Consent & AuthInterceptor** | DONE | WI-1 | 2026-11-25 | |
| WI-2.1 | Update Auth models (`LoginResponse`, `RefreshResponse`, `RegisterRequest`, `PrivacyNotice`) | DONE | WI-1.3 | 2026-11-25 | Strict types matching backend `master` |
| WI-2.2 | Migrate `AuthService` to `/api/v1/{public|me}/auth/...` with rotating refresh token, single-flight refresh, `204` logout, `text/plain` register/password, and `getPrivacyNotice()` | DONE | WI-2.1 | 2026-11-25 | Extensible for future HttpOnly cookie transport (D4) |
| WI-2.3 | Update `AuthInterceptor` (remove `{ data }` unwrap, skip Bearer on `/api/v1/public/`, single-flight `401` refresh + retry-once, `429` & `403` `ProblemDetail`) and `authGuard` silent refresh | DONE | WI-2.2 | 2026-11-25 | |
| WI-2.4 | Update `SignUpComponent` for DPDP `privacyNoticeVersion` consent checkbox & `/privacy` link, and update `SignInComponent`, `ChangePasswordComponent`, `SettingsComponent` error handling (`ProblemDetail` + `429`) | DONE | WI-2.3 | 2026-11-25 | |
| WI-2.5 | Add/update unit tests for `AuthService`, `AuthInterceptor` (concurrent `401` single-flight refresh, rotation, `204` logout, `429`), `authGuard`, and auth forms | DONE | WI-2.4 | 2026-11-25 | Controlled Rule 7 waiver |
| **WI-3** | **Priority 2 — Portfolio & Transactions** | DONE | WI-2 | 2026-11-25 | |
| WI-3.1 | Add strict `AssetRequest` model and update `TransactionsResponse` model | DONE | WI-1.1 | 2026-11-25 | Matches `AssetRequest.java` & `TransactionResponse` |
| WI-3.2 | Migrate `TransactionService` to `/api/v1/me/portfolio/...` (`fetchAllPages` on transactions & search with `queryFilters`, `/transaction/v2` `text/plain`, `uploads?quarter=` `text/plain`, `DELETE /api/v1/me/portfolio`, `ProblemDetail` in `classifyUploadError`, updated `interpretUploadResponse`) | DONE | WI-3.1 | 2026-11-25 | D1 (`/transaction/v2`) & D5 (`Q1`–`Q4` + new response text) |
| WI-3.3 | Verify `UploadTransactionsComponent`, `SettingsComponent`, `PortfolioAnalyticsComponent`, and `TaxFilingComponent` compatibility | DONE | WI-3.2 | 2026-11-25 | Removed legacy `res?.data` fallback in holdings consumers |
| WI-3.4 | Update `transaction.service.spec.ts` and `upload-transactions.component.spec.ts` for v1 routes, pagination, `/transaction/v2`, `DELETE`, `ProblemDetail`, and new upload text | DONE | WI-3.3 | 2026-11-25 | Controlled Rule 7 waiver |
| **WI-4** | **Priority 3 — Corporate Actions** | DONE | WI-3 | 2026-11-25 | |
| WI-4.1 | Migrate `CorporateActionService` to `/api/v1/{me|admin}/corporate-actions/...` (`fetchAllPages`, `PATCH` priority `{ priority }`, JSON batch perform, `void` delete, remove retired `anyCorporateActionToPerform`, `ProblemDetail` in `describeHttpError`) | DONE | WI-1.1, WI-1.2 | 2026-11-25 | D2 (remove retired endpoint) |
| WI-4.2 | Verify `CorporateActionListComponent`, `AddCorporateActionComponent`, and `TempTransactionsTableComponent` with updated return types | DONE | WI-4.1 | 2026-11-25 | |
| WI-4.3 | Add/update unit tests for `CorporateActionService` and affected corporate-action specs | DONE | WI-4.2 | 2026-11-25 | Controlled Rule 7 waiver |
| **WI-5** | **Priority 4 — Broker Charges** | DONE | WI-4 | 2026-11-25 | |
| WI-5.1 | Update `broker-charges.model.ts` (`ANNUALLY`, `transactionDate`, strict `ChargeAccountRequest` & `ChargeScheduleRequest`, `ChargeBreakdownResponse`, `ChargeLine`) and add catalogue-backed `charge-deductibility.util.ts` | DONE | WI-1.1 | 2026-11-25 | D3: zero guessed financial calculations |
| WI-5.2 | Migrate `BrokerChargesService` to `/api/v1/{me|admin}/charges/...` with `fetchAllPages` on `user-charges`, sanitized POST bodies, and demo-only mock fallback | DONE | WI-5.1 | 2026-11-25 | A1: demo-only mock fallback |
| WI-5.3 | Update `BrokerChargesComponent` & template (`simTransactionDate`, `ANNUALLY` options, catalogue-backed deductibility summary with graceful `—` fallback, error toasts) | DONE | WI-5.2 | 2026-11-25 | |
| WI-5.4 | Update `broker-charges.service.spec.ts`, `broker-charges.component.spec.ts`, and add `charge-deductibility.util.spec.ts` | DONE | WI-5.3 | 2026-11-25 | Controlled Rule 7 waiver |
| **WI-6** | **Priority 5 — Templates** | DONE | WI-5 | 2026-11-25 | |
| WI-6.1 | Migrate `TransactionService.downloadTemplate()` to `GET /api/v1/me/templates/excel` (`Blob`) + unit test | DONE | WI-3.2 | 2026-11-25 | |
| **WI-7** | **Local Verification & Implementation Notes** | DONE | WI-6 | 2026-11-25 | |
| WI-7.1 | Run Docker-free local checks: `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm run test:ci`, `npm run build` (dev & prod) | DONE | WI-6.1 | 2026-11-25 | 55/55 spec files, 212/212 tests, lint/format/typecheck/dev+prod builds all PASS |
| WI-7.2 | Write `docs/features/api-v1-migration/04-implementation-notes.md` | DONE | WI-7.1 | 2026-11-25 | |

## Blocked items
| ID | Reason | Needed from |
|---|---|---|

## Changelog
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-25 | Created in Phase 2 — Planning (22 sub-items across WI-1 through WI-7 in approved priority order) |
| 1.1 | 2026-11-25 | Completed all 22 sub-items in Phase 4 — Development; all Docker-free local checks passed |
