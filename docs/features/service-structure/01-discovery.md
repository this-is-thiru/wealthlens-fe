# Discovery — Service folder structure refactor

> Track: Chore · Slug: `service-structure` · Read-only audit of all Angular services, specs, path aliases, lint suppressions, and import graphs.

## 1. Plain-language summary
The app currently has **10 Angular services** (plus 3 service spec files): 8 live in `src/app/core/services/`, 1 is already colocated in its feature (`src/app/features/investments-tracking/services/corporate-action.service.ts`), and 1 is a shared UI primitive service (`src/app/shared/ui/confirm-dialog/confirm-dialog.service.ts`).

Two services in `src/app/core/services/` are feature-owned and can be cleanly moved to their feature folders with zero behaviour change:
1. `broker-charges.service.ts` → `src/app/features/broker-charges/services/broker-charges.service.ts`
2. `portfolio-analytics.service.ts` (+ `portfolio-analytics.service.spec.ts`) → `src/app/features/portfolio-analytics/services/`

All other 6 services in `src/app/core/services/` (including `transaction.service.ts`, per your Phase 0 decision) are app-wide or shared across 2–17 files and remain in `core/services/`.

---

## 2. Full service inventory & dependency audit

| Service | Spec exists? | Current path | Consumers (non-spec) | Decision |
|---|---|---|---|---|
| `BrokerChargesService` | No | `src/app/core/services/broker-charges.service.ts` | 1 (`features/broker-charges/pages/broker-charges/broker-charges.component.ts`) | **Move** → `src/app/features/broker-charges/services/` |
| `PortfolioAnalyticsService` | Yes | `src/app/core/services/portfolio-analytics.service.ts` (+ `.spec.ts`) | 2 (`features/portfolio-analytics/pages/...`, `features/tax-filing/pages/...`) | **Move** → `src/app/features/portfolio-analytics/services/` |
| `TransactionService` | Yes | `src/app/core/services/transaction.service.ts` (+ `.spec.ts`) | 7 across 4 areas (`investments-tracking`, `portfolio-analytics`, `tax-filing`, `shared/settings`) | **Keep** in `core/services/` (Decision 2) |
| `AuthService` | No | `src/app/core/services/auth.service.ts` | 15 (`core/guards`, `core/interceptors`, `shared/`, 4 features) | **Keep** in `core/services/` |
| `NotificationService` | No | `src/app/core/services/notification.service.ts` | 17 (`core/guards`, `core/interceptors`, `shared/`, all features) | **Keep** in `core/services/` |
| `StorageService` | No | `src/app/core/services/storage.service.ts` | 6 (`core/guards`, `core/interceptors`, core services) | **Keep** in `core/services/` |
| `BaseurlService` | No | `src/app/core/services/baseurl.service.ts` | 4 (all API services) | **Keep** in `core/services/` |
| `LivePriceService` | No | `src/app/core/services/live-price.service.ts` | 2 (`tax-filing`, `shared/settings`) | **Keep** in `core/services/` |
| `CorporateActionService` | No | `src/app/features/investments-tracking/services/corporate-action.service.ts` | `investments-tracking` | Already colocated |
| `ConfirmDialogService` | Yes | `src/app/shared/ui/confirm-dialog/confirm-dialog.service.ts` (+ `.spec.ts`) | `shared/ui` | Already colocated |

---

## 3. Exact file-movement & reference impact

### 3.1 Files to move (3 files via `git mv` to preserve history)
| From | To |
|---|---|
| `src/app/core/services/broker-charges.service.ts` | `src/app/features/broker-charges/services/broker-charges.service.ts` |
| `src/app/core/services/portfolio-analytics.service.ts` | `src/app/features/portfolio-analytics/services/portfolio-analytics.service.ts` |
| `src/app/core/services/portfolio-analytics.service.spec.ts` | `src/app/features/portfolio-analytics/services/portfolio-analytics.service.spec.ts` |

### 3.2 Internal imports inside moved files
- `broker-charges.service.ts:17`: `'../../features/broker-charges/models/broker-charges.model'` → update to `'../models/broker-charges.model'`. (Other imports use `@core/services/*` aliases — no change needed.)
- `portfolio-analytics.service.ts`: uses `'@models/transactions-response.model'` — no change needed.
- `portfolio-analytics.service.spec.ts`: uses `'./portfolio-analytics.service'` and `'@models/transactions-response.model'` — stays valid when moved alongside its service!

### 3.3 Consumer imports to update (3 files)
| File | Current import | New import |
|---|---|---|
| `src/app/features/broker-charges/pages/broker-charges/broker-charges.component.ts:11` | `'@core/services/broker-charges.service'` | `'@features/broker-charges/services/broker-charges.service'` |
| `src/app/features/portfolio-analytics/pages/portfolio-analytics/portfolio-analytics.component.ts:16` | `'@core/services/portfolio-analytics.service'` | `'@features/portfolio-analytics/services/portfolio-analytics.service'` |
| `src/app/features/tax-filing/pages/tax-filing/tax-filing.component.ts:16` | `'@core/services/portfolio-analytics.service'` | `'@features/portfolio-analytics/services/portfolio-analytics.service'` |

### 3.4 Configuration & tooling audit
| Config | Finding | Action needed? |
|---|---|---|
| `tsconfig.json`, `tsconfig.app.json`, `tsconfig.spec.json` | All 3 already define `@features/*: ["./src/app/features/*"]`, `@core/*`, `@shared/*`, `@models/*`, `@services/*`, `@env/*`. | **None** — `@features/*` works out of the box, and `@services/*` still cleanly maps to `core/services/`. |
| **`eslint-suppressions.json`** | **Critical catch:** contains 3 path-keyed entries (`lines 28, 58, 66`) for `src/app/core/services/broker-charges.service.ts`, `portfolio-analytics.service.spec.ts`, and `portfolio-analytics.service.ts`! | **Must update** the 3 file keys to their new `src/app/features/...` paths (keeping counts identical), or `npm run lint` and CI will fail! |
| `angular.json` | No hardcoded service paths (`test` builder discovers `src/**/*.spec.ts` automatically). | **None** |
| `sonar-project.properties` | Exclusions use globs (`**/*.spec.ts`, `src/environments/**`, etc.) — no hardcoded service paths. | **None** |
| `docs/design-system.md` | Already documents `features/<name>/{pages,components,models,services}` as the feature layout convention. | **None** |

---

## 4. Gaps & risks

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| 1 | `eslint-suppressions.json` stale path keys | `npm run lint` fails on moved files because existing baseline suppressions won't match old keys | Update the 3 path keys in `eslint-suppressions.json` in the same commit; verify with `npm run lint` |
| 2 | Prettier formatting on touched files | `scripts/check-format.mjs` checks every file touched by the PR (including moved files if git sees them as modified/renamed!) | Run `npm run format:check` before committing; if a moved file predates Prettier, format only if required by `format:check` (or verify `check-format.mjs` output) |
| 3 | SonarQube Cloud new-code analysis on moved files | Moving existing files with `git mv` preserves git history, though Sonar may evaluate changed lines on the PR | Use `git mv` and keep diffs minimal (import line changes only, no unrelated refactors) |
| 4 | Cross-feature import (`tax-filing` → `portfolio-analytics`) | `tax-filing.component.ts` imports `PortfolioAnalyticsService` from `@features/portfolio-analytics/services/portfolio-analytics.service` | Acceptable for a pure stateless analytics engine owned by `portfolio-analytics`; no circular dependency (`portfolio-analytics` does not import `tax-filing`) |

---

## 5. Open questions
None — all Phase 0 decisions are locked in and every affected file and config has been verified.

---

## Changelog
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-24 | Initial Phase 1 Discovery audit of services, imports, tsconfig aliases, and eslint-suppressions.json |
