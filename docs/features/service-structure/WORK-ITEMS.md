# Work Items — Service folder structure refactor

**Progress:** 6 / 6 sub-items done
**Status values:** TODO · IN_PROGRESS · BLOCKED · IN_REVIEW · DONE
Rules: one sub-item IN_PROGRESS at a time · a parent is DONE only when all sub-items are DONE · BLOCKED needs a reason.

| ID | Work item | Status | Depends on | Updated | Notes |
|---|---|---|---|---|---|
| WI-1 | Move feature-owned services with `git mv` | DONE | — | 2026-11-24 | Plan §2.1 |
| WI-1.1 | `git mv` `broker-charges.service.ts` to `features/broker-charges/services/` + update relative model import | DONE | — | 2026-11-24 | Moved via `git mv`; model import updated to `../models/broker-charges.model` |
| WI-1.2 | `git mv` `portfolio-analytics.service.ts` & `.spec.ts` to `features/portfolio-analytics/services/` | DONE | WI-1.1 | 2026-11-24 | Both files moved via `git mv` |
| WI-2 | Update consumer imports & lint baseline | DONE | WI-1 | 2026-11-24 | Plan §2.2–2.3 |
| WI-2.1 | Update imports in `broker-charges`, `portfolio-analytics`, and `tax-filing` components | DONE | WI-1 | 2026-11-24 | Updated all 3 components to `@features/.../services/...` |
| WI-2.2 | Update the 3 moved file-path keys in `eslint-suppressions.json` | DONE | WI-1 | 2026-11-24 | Updated 3 path keys; rule counts preserved identically |
| WI-3 | Verification (Docker-free local checks) | DONE | WI-2 | 2026-11-24 | Plan §2.4 |
| WI-3.1 | Run `npm run lint`, `npm run format:check`, `npm run typecheck`, and stale-import grep | DONE | WI-2 | 2026-11-24 | Ran `format:changed` on 6 legacy `.ts` files; lint, format:check, typecheck, stale grep all exit 0 |
| WI-3.2 | Run `npm run test:ci` and `ng build` (`development` + `production`) | DONE | WI-3.1 | 2026-11-24 | `test:ci` + dev/prod builds all exit 0; moved spec verified |

## Blocked items
| ID | Reason | Needed from |
|---|---|---|

## Changelog
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-24 | Created in Phase 2 (6 sub-items, all TODO) |
| 1.1 | 2026-11-24 | Completed WI-1.1–WI-2.2; started WI-3.1 |
| 1.2 | 2026-11-24 | Completed WI-3.1–WI-3.2 (6/6 DONE) |
