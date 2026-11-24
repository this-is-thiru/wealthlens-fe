# Work Items — Service folder structure refactor

**Progress:** 9 / 10 sub-items done
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
| WI-4 | SonarQube Quality Gate remediation (Option 1B — controlled Rule 7 waiver for PR #30 only) | IN_PROGRESS | WI-3 | 2026-11-24 | Preserve 80% coverage & ≤ 3% duplication gate |
| WI-4.1 | Targeted deduplication in `portfolio-analytics.service.ts` (`aggregateByKey`, `accrualRow`) and `broker-charges.service.ts` (`catalogueEntry`) | DONE | WI-3 | 2026-11-24 | Extracted private helpers with zero behaviour change |
| WI-4.2 | Add `src/app/features/broker-charges/services/broker-charges.service.spec.ts` covering all 17 public HTTP methods (success + error fallback + simulation branches) | DONE | WI-4.1 | 2026-11-24 | Controlled Rule 7 waiver approved by Thiru; 17 methods reconciled & covered |
| WI-4.3 | Extend `src/app/features/portfolio-analytics/services/portfolio-analytics.service.spec.ts` for uncovered methods/branches (`computeBrokerBreakdown`, `computeExchangeBreakdown`, `computeTopMovers`, `computeAccrualSummary`, `computeInsights`) | DONE | WI-4.1 | 2026-11-24 | Added focused `describe` blocks |
| WI-4.4 | Re-run full Docker-free local checks (`lint`, `format:check`, `typecheck`, `test:ci`, dev/prod builds) & re-verify SonarQube Cloud Quality Gate on PR #30 | IN_PROGRESS | WI-4.2, WI-4.3 | 2026-11-24 | Verify `new_coverage >= 80%` and `new_duplicated_lines_density <= 3%` |

## Blocked items
| ID | Reason | Needed from |
|---|---|---|

## Changelog
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-24 | Created in Phase 2 (6 sub-items, all TODO) |
| 1.1 | 2026-11-24 | Completed WI-1.1–WI-2.2; started WI-3.1 |
| 1.2 | 2026-11-24 | Completed WI-3.1–WI-3.2 (6/6 DONE) |
| 1.3 | 2026-11-24 | Added WI-4 (Option 1B SonarQube remediation with controlled Rule 7 waiver for PR #30) |
