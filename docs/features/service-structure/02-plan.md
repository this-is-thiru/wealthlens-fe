# Plan — Service folder structure refactor

> Track: Chore · Slug: `service-structure` · Zero-behaviour-change refactor. Nothing is implemented yet.

## 1. Target setup & conventions
- **Feature-owned services** live in `src/app/features/<feature>/services/` alongside their pages, components, and models (matching `features/investments-tracking/services/corporate-action.service.ts` and `docs/design-system.md` §4).
- **App-wide / multi-feature services** remain in `src/app/core/services/` (`auth`, `baseurl`, `live-price`, `notification`, `storage`, `transaction`).
- **Imports:** Feature services are imported via the existing `@features/<feature>/services/<name>.service` alias (no `tsconfig*.json` changes needed).

## 2. Exact repository changes (agent, Phase 4)

All work happens on working branch `chore/service-structure` created from `origin/development`.

### 2.1 File moves via `git mv` (WI-1)
| Source | Destination | History preserved? |
|---|---|---|
| `src/app/core/services/broker-charges.service.ts` | `src/app/features/broker-charges/services/broker-charges.service.ts` | Yes (`git mv`) |
| `src/app/core/services/portfolio-analytics.service.ts` | `src/app/features/portfolio-analytics/services/portfolio-analytics.service.ts` | Yes (`git mv`) |
| `src/app/core/services/portfolio-analytics.service.spec.ts` | `src/app/features/portfolio-analytics/services/portfolio-analytics.service.spec.ts` | Yes (`git mv`) |

Internal import update inside moved `broker-charges.service.ts` (line 17):
- `'../../features/broker-charges/models/broker-charges.model'` → `'../models/broker-charges.model'`

### 2.2 Consumer import updates (WI-2.1)
| File | Old import | New import |
|---|---|---|
| `src/app/features/broker-charges/pages/broker-charges/broker-charges.component.ts` | `@core/services/broker-charges.service` | `@features/broker-charges/services/broker-charges.service` |
| `src/app/features/portfolio-analytics/pages/portfolio-analytics/portfolio-analytics.component.ts` | `@core/services/portfolio-analytics.service` | `@features/portfolio-analytics/services/portfolio-analytics.service` |
| `src/app/features/tax-filing/pages/tax-filing/tax-filing.component.ts` | `@core/services/portfolio-analytics.service` | `@features/portfolio-analytics/services/portfolio-analytics.service` |

### 2.3 Lint baseline update (WI-2.2)
Update the 3 exact file-path keys in `eslint-suppressions.json` (keep rule names and counts identical — zero new suppressions, zero rule changes):
- `"src/app/core/services/broker-charges.service.ts"` → `"src/app/features/broker-charges/services/broker-charges.service.ts"`
- `"src/app/core/services/portfolio-analytics.service.spec.ts"` → `"src/app/features/portfolio-analytics/services/portfolio-analytics.service.spec.ts"`
- `"src/app/core/services/portfolio-analytics.service.ts"` → `"src/app/features/portfolio-analytics/services/portfolio-analytics.service.ts"`

### 2.4 Verification (WI-3 — Docker-free local checks)
1. `npm run lint` — confirms `eslint-suppressions.json` keys match and zero new lint errors exist.
2. `npm run format:check` — confirms all touched files pass Prettier (note: if moved legacy files predate Prettier and `format:check` flags them, run `npm run format:changed` so CI's `Format check` passes, keeping zero logic changes).
3. `npm run typecheck` — confirms `ngc` + `tsc` resolve all updated imports cleanly.
4. `npm run test:ci` — confirms Vitest discovers and runs `src/app/features/portfolio-analytics/services/portfolio-analytics.service.spec.ts` and all coverage thresholds pass.
5. `npx ng build --configuration=development` & `npx ng build --configuration=production` — confirms full Angular builds succeed.
6. Confirm zero stale references to `@core/services/broker-charges.service` or `@core/services/portfolio-analytics.service` remain anywhere in `src/`.
7. Docker build & smoke test run exclusively in GitHub Actions on the PR (`Docker image` job) per the permanent Docker-free local development policy.

## 3. Manual configuration changes
None — no GitHub, SonarQube Cloud, or GHCR setting changes are required.

## 4. Out of scope
- Moving `auth`, `baseurl`, `live-price`, `notification`, `storage`, or `transaction` out of `core/services/`.
- Changing `tsconfig*.json`, `package.json`, `angular.json`, `.github/workflows/*`, or `sonar-project.properties`.
- Any API v1 endpoint/DTO changes (handled in the upcoming `api-v1-migration` feature).
- Any logic refactoring inside the moved services or components.

## 5. Open questions
None.

## Changelog
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-24 | Initial Phase 2 plan for `service-structure` |
