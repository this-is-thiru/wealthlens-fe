# Status — API v1 migration (backend master compatibility)

| Field | Value |
|---|---|
| Slug | `api-v1-migration` |
| Track | Feature |
| YouTrack | — (omitted by decision) |
| Branch | `feature/api-v1-migration` (from `origin/development` `9fafc2a`) |
| Current phase | 6 — Commit & Push |
| Phase status | IN PROGRESS |
| Last updated | 2026-11-26 00:02 |

## Goal
Update all existing Angular services, interceptors, models, and affected forms in `wealthlens-fe` to match `wealthlens` backend `master` API v1 contracts (`/api/v1/{public|me|admin}/...`, 15-min access + 14-day rotating refresh tokens, DPDP registration `privacyNoticeVersion`, RFC 9457 `ProblemDetail` errors, removal of legacy `{ data }` envelope, `Page<T>` responses, and stricter `@Valid` request payloads).

## Approval log
| Phase | Date | Result | Notes |
|---|---|---|---|
| 0 — Intake | 2026-11-25 | APPROVED | Omit YouTrack ID; cover all existing UI modules; Option A reusable pagination; priority order: Auth → Portfolio → Corporate Actions → Broker Charges → Templates |
| 1 — Discovery | 2026-11-25 | APPROVED | D1: `/transaction/v2`; D2: remove `anyCorporateActionToPerform`; D3: derive turnover & catalogue-backed deductibility only (no guessing); D4: `sessionStorage` for refresh token (cookie-extensible); D5: verify `quarter` from backend (`Q1`–`Q4` confirmed); Rule 7 waiver granted for unit tests |
| 2 — Planning | 2026-11-25 | APPROVED | A1 approved (demo-only mock fallback, surface real HTTP errors via toast); A2 approved with safeguards (`${baseUrl}/privacy` verified, unchecked-by-default consent checkbox, disable registration if version fetch fails) |
| 3 — Design | 2026-11-25 | APPROVED | Design system compliance, Sign-Up DPDP consent wireframe, Broker Charges simulator updates, and Mermaid flows approved |
| 4 — Development | 2026-11-25 | APPROVED | All 22/22 work items complete; lint, format:check, typecheck, test:ci (55/55 files, 212/212 tests), dev & prod builds all PASS |
| 5 — Manual Test Checklist | 2026-11-25 | APPROVED | 54 manual test cases across 9 areas approved (all remain `NOT TESTED` pending live backend execution) |
| 6 — Commit & Push | 2026-11-26 | APPROVED | Approved 6 Conventional Commits + push to `origin/feature/api-v1-migration` (PR into `development`, no merge) |

## Open questions
| # | Question | For | Status |
|---|---|---|---|
| 1 | YouTrack ID | Thiru | ANSWERED — omit |
| 2 | Scope boundary | Thiru | ANSWERED — existing UI modules only; defer new backend features |
| 3 | Pagination strategy | Thiru | ANSWERED — Option A (reusable pagination-aware fetching, extensible for server-side) |
| 4 | Deadline / priority order | Thiru | ANSWERED — Auth → Portfolio → Corporate Actions → Broker Charges → Templates |
| D1 | `addTransaction`: target `/transaction` (V1) or `/transaction/v2` (authoritative charges)? | Thiru / Backend dev | ANSWERED — `POST /api/v1/me/portfolio/transaction/v2` (`text/plain`) |
| D2 | Retired `PUT /corporate-action/perform/test`: remove if unused? | Thiru | ANSWERED — confirmed 0 callers; remove `anyCorporateActionToPerform` |
| D3 | `ChargeBreakdownResponse` lacks `deductibleCharges`/`nonDeductibleCharges`/`turnover`: derive client-side? | Thiru | ANSWERED — derive `turnover` from `price × qty`; derive deductibility only when every line code is classified in `ChargeCatalogueEntry[]`; never guess |
| D4 | `refresh_token` storage: `localStorage` (matches `JWT_TOKEN`) or `sessionStorage`? | Thiru | ANSWERED — `sessionStorage`, separate from access token, extensible for future HttpOnly cookies |
| D5 | Required `quarter` query param format on `/transactions/uploads` | Thiru / Backend dev | ANSWERED — verified in `AssetRequestParserImpl.java`: `Q1`–`Q4` (already in upload UI) |
| A1 | `BrokerChargesService` real-user error handling: mock fallback in demo mode only, surface real errors via toast | Thiru | ANSWERED — APPROVED |
| A2 | DPDP privacy notice link `${baseUrl}/privacy` + unchecked consent checkbox + fail-closed if version unavailable | Thiru | ANSWERED — APPROVED & verified in `PrivacyNotice.PAGE` |

## Checkpoints
<!-- Newest at the bottom. Never edit or delete old checkpoints. -->

### Checkpoint 1 — 2026-11-25 00:54
- **Phase:** 0 — Intake
- **Last completed:** feature folder created from templates (`STATUS.md`, `WORK-ITEMS.md`), backlog row #3 added
- **In progress:** none
- **Files touched:** `docs/features/api-v1-migration/STATUS.md`, `docs/features/api-v1-migration/WORK-ITEMS.md`, `docs/BACKLOG.md`
- **Uncommitted changes:** yes (working branch `feature/api-v1-migration` will be created from `origin/development` in Phase 4)
- **Next exact step:** on `APPROVE`, start Phase 1 Discovery: read `this-is-thiru/wealthlens` `master` controllers, DTOs, `ControllerAdviser`, `AuthConfig`, and module docs to write `docs/features/api-v1-migration/01-discovery.md` with exact request/response schemas, errors, pagination shapes, enums, and backend gaps.

### Checkpoint 2 — 2026-11-25 22:55
- **Phase:** 1 — Discovery
- **Last completed:** audited `this-is-thiru/wealthlens` `master` controllers, DTOs, enums, `application.yaml`, `ApiZones`, `ControllerAdviser`, and module docs; wrote `docs/features/api-v1-migration/01-discovery.md`
- **In progress:** none
- **Files touched:** `docs/features/api-v1-migration/01-discovery.md`, `docs/features/api-v1-migration/STATUS.md`, `docs/BACKLOG.md`
- **Uncommitted changes:** yes (working branch `feature/api-v1-migration` created in Phase 4)
- **Next exact step:** on `APPROVE` (and answers to D1–D5), start Phase 2 Planning: scan existing UI components/models/forms, write `docs/features/api-v1-migration/02-plan.md`, and populate `WORK-ITEMS.md`.

### Checkpoint 3 — 2026-11-25 23:14
- **Phase:** 2 — Planning
- **Last completed:** scanned frontend services/interceptors/guards/components/models, verified backend `master` contracts for D1 (`/transaction/v2`), D3 (`ChargeLine` + `ChargeCatalogueEntry`), and D5 (`ALLOWED_QUARTERS = Q1..Q4` + new upload response text), wrote `docs/features/api-v1-migration/02-plan.md` and populated `WORK-ITEMS.md` (22 sub-items across WI-1..WI-7)
- **In progress:** none
- **Files touched:** `docs/features/api-v1-migration/02-plan.md`, `docs/features/api-v1-migration/WORK-ITEMS.md`, `docs/features/api-v1-migration/STATUS.md`, `docs/BACKLOG.md`
- **Uncommitted changes:** yes (working branch `feature/api-v1-migration` created in Phase 4)
- **Next exact step:** on `APPROVE`, start Phase 3 Design: audit/create `docs/design-system.md` if absent and write `docs/features/api-v1-migration/03-design.md` (wireframes for Sign-Up DPDP consent and Broker Charges simulator `transactionDate` + catalogue-backed deductibility display, plus Mermaid auth/refresh/pagination flow diagrams).

### Checkpoint 4 — 2026-11-25 23:21
- **Phase:** 3 — Design
- **Last completed:** verified existing `docs/design-system.md` and `WealthLensPreset`, confirmed backend `PrivacyNotice.PAGE = "/privacy"` public HTML endpoint, wrote `docs/features/api-v1-migration/03-design.md` with wireframes and Mermaid flows
- **In progress:** none
- **Files touched:** `docs/features/api-v1-migration/03-design.md`, `docs/features/api-v1-migration/STATUS.md`, `docs/BACKLOG.md`
- **Uncommitted changes:** yes (working branch `feature/api-v1-migration` created in Phase 4)
- **Next exact step:** on `APPROVE`, start Phase 4 Development: create `feature/api-v1-migration` from `origin/development` and execute `WI-1.1` through `WI-7.2` in order with checkpoints and local Docker-free verification.

### Checkpoint 5 — 2026-11-25 23:37
- **Phase:** 4 — Development
- **Last completed:** created `feature/api-v1-migration` from `origin/development`, implemented `WI-1.1` through `WI-7.2`, passed all Docker-free local checks (`lint`, `format:check`, `typecheck`, `test:ci` 55/55 files & 212/212 tests, dev & prod builds), and wrote `docs/features/api-v1-migration/04-implementation-notes.md`
- **In progress:** none
- **Files touched:** core pagination/ProblemDetail/storage/auth/interceptor/guard/transaction service + specs, auth forms, corporate-actions service + specs, broker-charges models/utils/service/component/template + specs, `eslint-suppressions.json`, `docs/features/api-v1-migration/*`, `docs/BACKLOG.md`
- **Uncommitted changes:** yes (on `feature/api-v1-migration`)
- **Next exact step:** on `APPROVE`, start Phase 5 Manual Test Checklist: write `docs/features/api-v1-migration/05-manual-test-cases.md` covering functional journeys, Network-tab API verification, validation, error handling (400/401/403/404/409/429/500), security, UI consistency, responsiveness, accessibility, and regression.

### Checkpoint 6 — 2026-11-25 23:54
- **Phase:** 5 — Manual Test Checklist
- **Last completed:** wrote `docs/features/api-v1-migration/05-manual-test-cases.md` (54 manual cases across 9 areas, clearly distinguishing passed Vitest automated checks from `NOT TESTED` live-backend manual checks)
- **In progress:** none
- **Files touched:** `docs/features/api-v1-migration/05-manual-test-cases.md`, `docs/features/api-v1-migration/STATUS.md`, `docs/BACKLOG.md`
- **Uncommitted changes:** yes (on `feature/api-v1-migration`; no implementation code modified)
- **Next exact step:** on `APPROVE`, start Phase 6 Commit & Push: show `git status` & change summary, propose Conventional Commit message(s) and `origin/feature/api-v1-migration` push, and await explicit commit/push `APPROVE`.

### Checkpoint 7 — 2026-11-26 00:02
- **Phase:** 6 — Commit & Push
- **Last completed:** Phase 5 & Phase 6 commit/push approved; committing 6 focused Conventional Commits on `feature/api-v1-migration` and pushing to `origin/feature/api-v1-migration`
- **In progress:** PR creation & CI/Sonar verification (54 manual test cases remain `NOT TESTED` pending live backend run)
- **Files touched:** all 47 files across `WI-1`–`WI-7` and `docs/features/api-v1-migration/*` + `docs/BACKLOG.md`
- **Uncommitted changes:** no (committed cleanly across 6 Conventional Commits)
- **Next exact step:** open PR `feature/api-v1-migration` → `development`, verify CI + SonarQube checks, execute manual test checklist against live backend `master`, and await merge approval.
