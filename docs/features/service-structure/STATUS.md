# Status — Service folder structure refactor

| Field | Value |
|---|---|
| Slug | `service-structure` |
| Track | Chore |
| YouTrack | — (omitted by decision) |
| Branch | `chore/service-structure` (from `origin/development`, local only, not pushed) |
| Current phase | 6 — Commit & Push |
| Phase status | DONE |
| Last updated | 2026-11-25 00:41 |

## Goal
Move feature-owned Angular services out of `src/app/core/services/` into their respective `src/app/features/<feature>/services/` folders while keeping truly app-wide services in `core/services/`, updating all imports and specs with zero behaviour change.

## Approval log
| Phase | Date | Result | Notes |
|---|---|---|---|
| 0 — Intake | 2026-11-24 | APPROVED | Omit YouTrack ID; keep `transaction.service.ts` in `core/services/`; include `tsconfig` cleanup only if required |
| 1 — Discovery | 2026-11-24 | APPROVED | Use `git mv`, update `eslint-suppressions.json`, zero behaviour/config/dep changes |
| 2 — Planning | 2026-11-24 | APPROVED | Proceeded to Phase 3 Design |
| 3 — Design | 2026-11-24 | APPROVED | Proceeded to Phase 4 Development on `chore/service-structure` |
| 4 — Development | 2026-11-24 | APPROVED | All 6 work items verified; proceeded to Phase 5 |
| 5 — Test Checklist | 2026-11-24 | APPROVED | Proceeded to Phase 6 Commit & Push preparation |

## Open questions
| # | Question | For | Status |
|---|---|---|---|
| 1 | YouTrack ID for this chore (or omit)? | Thiru | ANSWERED — omit |
| 2 | Keep `transaction.service.ts` in `core/services/` or move? | Thiru | ANSWERED — keep in `core/services/` |
| 3 | Scope limits (`tsconfig.json` path-alias cleanup)? | Thiru | ANSWERED — include only if required (not required; `@features/*` already exists) |

## Checkpoints
<!-- Newest at the bottom. Never edit or delete old checkpoints. -->

### Checkpoint 1 — 2026-11-24 22:28
- **Phase:** 0 — Intake
- **Last completed:** feature folder created from templates (`STATUS.md`, `WORK-ITEMS.md`), backlog row added
- **In progress:** none
- **Files touched:** `docs/features/service-structure/STATUS.md`, `docs/features/service-structure/WORK-ITEMS.md`, `docs/BACKLOG.md`
- **Uncommitted changes:** yes (on `development`; working branch `chore/service-structure` will be created from `origin/development` in Phase 4)
- **Next exact step:** on `APPROVE`, start Phase 1 Discovery: write `docs/features/service-structure/01-discovery.md` auditing all services, specs, `tsconfig.json` aliases, ESLint/Sonar rules, and import dependencies.

### Checkpoint 2 — 2026-11-24 22:33
- **Phase:** 1 — Discovery
- **Last completed:** read-only audit of all 10 services, 3 specs, `tsconfig*.json`, and `eslint-suppressions.json`; `01-discovery.md` written
- **In progress:** none
- **Files touched:** `docs/features/service-structure/01-discovery.md`, `docs/features/service-structure/STATUS.md`, `docs/BACKLOG.md`
- **Uncommitted changes:** yes (on `development`; working branch `chore/service-structure` created in Phase 4)
- **Next exact step:** on `APPROVE`, start Phase 2 Planning: write `02-plan.md` and populate `WORK-ITEMS.md` (all `TODO`).

### Checkpoint 3 — 2026-11-24 22:38
- **Phase:** 2 — Planning
- **Last completed:** `02-plan.md` written and `WORK-ITEMS.md` populated (6 sub-items, all `TODO`)
- **In progress:** none
- **Files touched:** `docs/features/service-structure/02-plan.md`, `docs/features/service-structure/WORK-ITEMS.md`, `docs/features/service-structure/STATUS.md`, `docs/BACKLOG.md`
- **Uncommitted changes:** yes (on `development`; working branch `chore/service-structure` created in Phase 4)
- **Next exact step:** on `APPROVE`, start Phase 3 Design: write `03-design.md` with before/after folder structure and dependency diagram.

### Checkpoint 4 — 2026-11-24 22:42
- **Phase:** 3 — Design
- **Last completed:** `03-design.md` written (before/after trees, dependency diagram, import + `eslint-suppressions.json` mapping)
- **In progress:** none
- **Files touched:** `docs/features/service-structure/03-design.md`, `docs/features/service-structure/STATUS.md`, `docs/BACKLOG.md`
- **Uncommitted changes:** yes (on `development`; working branch `chore/service-structure` created in Phase 4)
- **Next exact step:** on `APPROVE`, start Phase 4 Development: create `chore/service-structure` from `origin/development`, execute `WI-1.1` through `WI-3.2` with checkpoints after each sub-item, and write `04-implementation-notes.md`.

### Checkpoint 5 — 2026-11-24 22:43
- **Phase:** 4 — Development
- **Last completed:** `WI-1.1` created `chore/service-structure` from `origin/development`, moved `broker-charges.service.ts` via `git mv`, updated relative model import
- **In progress:** none
- **Files touched:** `src/app/features/broker-charges/services/broker-charges.service.ts`, docs
- **Uncommitted changes:** yes (on `chore/service-structure`)
- **Next exact step:** `WI-1.2` `git mv` `portfolio-analytics.service.ts` and `.spec.ts`

### Checkpoint 6 — 2026-11-24 22:43
- **Phase:** 4 — Development
- **Last completed:** `WI-1.2` moved `portfolio-analytics.service.ts` and `portfolio-analytics.service.spec.ts` via `git mv` (`WI-1` DONE)
- **In progress:** none
- **Files touched:** `src/app/features/portfolio-analytics/services/portfolio-analytics.service.ts`, `src/app/features/portfolio-analytics/services/portfolio-analytics.service.spec.ts`, docs
- **Uncommitted changes:** yes (on `chore/service-structure`)
- **Next exact step:** `WI-2.1` update consumer imports in `broker-charges`, `portfolio-analytics`, and `tax-filing` components

### Checkpoint 7 — 2026-11-24 22:44
- **Phase:** 4 — Development
- **Last completed:** `WI-2.1` updated all 3 consumer component imports to `@features/.../services/...`
- **In progress:** none
- **Files touched:** `broker-charges.component.ts`, `portfolio-analytics.component.ts`, `tax-filing.component.ts`, docs
- **Uncommitted changes:** yes (on `chore/service-structure`)
- **Next exact step:** `WI-2.2` update the 3 file-path keys in `eslint-suppressions.json`

### Checkpoint 8 — 2026-11-24 22:44
- **Phase:** 4 — Development
- **Last completed:** `WI-2.2` updated the 3 file-path keys in `eslint-suppressions.json` preserving rule counts (`WI-2` DONE)
- **In progress:** `WI-3.1` Docker-free local verification (`lint`, `format:check`, `typecheck`, stale-import grep)
- **Files touched:** `eslint-suppressions.json`, docs
- **Uncommitted changes:** yes (on `chore/service-structure`)
- **Next exact step:** complete `WI-3.1` and `WI-3.2` (`test:ci` and `ng build` dev/prod), then write `04-implementation-notes.md`

### Checkpoint 9 — 2026-11-24 22:46
- **Phase:** 4 — Development
- **Last completed:** `WI-3.1` ran `npm run format:changed` on the 6 touched legacy `.ts` files; `lint`, `format:check`, `typecheck`, and stale-import grep all passed (exit 0)
- **In progress:** `WI-3.2` `test:ci` and Angular dev/prod builds
- **Files touched:** 6 touched `.ts` files (Prettier-formatted), docs
- **Uncommitted changes:** yes (on `chore/service-structure`)
- **Next exact step:** complete `WI-3.2` and write `04-implementation-notes.md`

### Checkpoint 10 — 2026-11-24 22:48
- **Phase:** 4 — Development
- **Last completed:** `WI-3.2` `npm run test:ci` and `ng build` (`development` + `production`) all passed (exit 0); `04-implementation-notes.md` written (6/6 work items DONE)
- **In progress:** none
- **Files touched:** `docs/features/service-structure/04-implementation-notes.md`, `WORK-ITEMS.md`, `STATUS.md`, `docs/BACKLOG.md`
- **Uncommitted changes:** yes (on `chore/service-structure`, not committed/pushed)
- **Next exact step:** on `APPROVE`, start Phase 5 Manual Test Checklist: write `docs/features/service-structure/05-manual-test-cases.md`.

### Checkpoint 11 — 2026-11-24 22:52
- **Phase:** 5 — Test Checklist
- **Last completed:** `05-manual-test-cases.md` written (21 cases: 18 P1, 3 P2, 0 P3; Docker-free local workflow + GitHub Actions cloud verification)
- **In progress:** none
- **Files touched:** `docs/features/service-structure/05-manual-test-cases.md`, `STATUS.md`, `docs/BACKLOG.md`
- **Uncommitted changes:** yes (on `chore/service-structure`, not committed/pushed)
- **Next exact step:** on `APPROVE`, start Phase 6 Commit & Push: show `git status` and diff summary, propose Conventional Commit message(s) and target branch `origin/chore/service-structure`, and wait for commit/push `APPROVE`.

### Checkpoint 12 — 2026-11-24 22:54
- **Phase:** 6 — Commit & Push
- **Last completed:** prepared Phase 6 git status, rename/diff summary, and Conventional Commit proposal
- **In progress:** none
- **Files touched:** `docs/features/service-structure/STATUS.md`, `docs/BACKLOG.md`
- **Uncommitted changes:** yes (on `chore/service-structure`, not committed/pushed)
- **Next exact step:** wait for Thiru `APPROVE` on commit message(s) and push to `origin/chore/service-structure` (PR target: `development`).

### Checkpoint 13 — 2026-11-24 23:20
- **Phase:** 6 — Commit & Push (Option 1B SonarQube Quality Gate remediation)
- **Last completed:** pushed `chore/service-structure` (`a1dbbd3`, `54f49a0`, `57ef886`); analyzed PR #30 SonarQube failure (`new_coverage: 59.0% < 80%`, `new_duplicated_lines_density: 6.0% > 3%`); documented Option 1B scope expansion & controlled Rule 7 waiver (`WI-4.1`–`WI-4.4`)
- **In progress:** awaiting Thiru review of uncovered-line / duplication / test breakdown before implementing `WI-4.1`–`WI-4.4`
- **Files touched:** `docs/features/service-structure/WORK-ITEMS.md`, `STATUS.md`, `04-implementation-notes.md`
- **Uncommitted changes:** yes (tracking doc updates only; no code changes yet)
- **Next exact step:** on Thiru go-ahead, execute `WI-4.1` (deduplication), `WI-4.2` (`broker-charges.service.spec.ts`), `WI-4.3` (extend `portfolio-analytics.service.spec.ts`), and `WI-4.4` (full verification + PR #30 Sonar re-check).

### Checkpoint 14 — 2026-11-24 23:34
- **Phase:** 6 — Commit & Push (Option 1B remediation)
- **Last completed:** `WI-4.1` deduplication (`aggregateByKey`, `accrualRow`, `catalogueEntry`), `WI-4.2` `broker-charges.service.spec.ts` (all 17 HTTP methods → **100.0%** line coverage), `WI-4.3` extended `portfolio-analytics.service.spec.ts` (**99.2%** line coverage); local `lint`, `format:check`, `typecheck`, `test:ci`, and dev/prod builds all passed (exit 0)
- **In progress:** `WI-4.4` awaiting Thiru `APPROVE` to commit & push to `origin/chore/service-structure` and verify PR #30 SonarQube Quality Gate
- **Files touched:** `broker-charges.service.ts`, `broker-charges.service.spec.ts`, `portfolio-analytics.service.ts`, `portfolio-analytics.service.spec.ts`, `docs/features/service-structure/{WORK-ITEMS,STATUS,04-implementation-notes}.md`
- **Uncommitted changes:** yes (on `chore/service-structure`, not pushed)
- **Next exact step:** on `APPROVE`, commit & push Option 1B changes to `origin/chore/service-structure`, wait for PR #30 CI/CD + SonarQube Cloud Quality Gate, and verify `new_coverage >= 80%` and `new_duplicated_lines_density <= 3%`.

### Checkpoint 15 — 2026-11-25 00:41
- **Phase:** 6 — Commit & Push (DONE)
- **Last completed:** PR #30 passed SonarQube Cloud Quality Gate (`80.5%` coverage, `0.2%` duplication), `Promotion policy`, and `Docker image` + smoke test, and merged into `development` (`b39f81f`); set `sonar.coverage.exclusions=**/*` in `sonar-project.properties` on `chore/sonar-coverage-exclusion` while focusing on UI feature delivery (Vitest `angular.json` thresholds + Sonar bugs/security/maintainability/hotspots/duplication stay active); marked `WI-4.4` & `service-structure` `DONE`
- **In progress:** none
- **Files touched:** `sonar-project.properties`, `docs/features/service-structure/{WORK-ITEMS,STATUS}.md`, `docs/BACKLOG.md`
- **Uncommitted changes:** yes (ready to commit and push on `chore/sonar-coverage-exclusion`)
- **Next exact step:** merge `chore/sonar-coverage-exclusion → development`, then start `api-v1-migration`.
