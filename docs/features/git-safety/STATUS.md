# Status — Git safety & branch environments

| Field | Value |
|---|---|
| Slug | `git-safety` |
| Track | Chore |
| YouTrack | — (omitted by decision; link later) |
| Branch | `chore/git-safety` (from `master`, local only, not pushed) |
| Current phase | 6 — Commit & Push |
| Phase status | AWAITING APPROVAL |
| Last updated | 2026-11-23 22:18 |

## Goal
Set up the branch environments `development` → `staging` → `release`, the PR-only promotion flow, CI and Sonar gates per branch, Docker image tags per environment, and the git hooks that back `.agents/rules/git-safety.md`.

## Approval log
| Phase | Date | Result | Notes |
|---|---|---|---|
| 0 — Intake | 2026-11-23 | APPROVED | Open intake questions carried into Phase 1 |
| 1 — Discovery | 2026-11-23 | APPROVED | Six decisions supplied with approval (see plan §1) |
| 2 — Planning | 2026-11-23 | APPROVED | Decisions A–G supplied (plan §11) |
| 3 — Design | 2026-11-23 | APPROVED | Proceeded to Phase 4 (bootstrap PR to master as temporary exception) |
| 4 — Development | 2026-11-23 | APPROVED | Permanent Docker-free local development policy added; proceeded to Phase 5 |
| 5 — Test Checklist | 2026-11-23 | APPROVED | Added permanent Docker-free policy to `.agents/rules/`; proceeded to Phase 6 |

## Open questions
| # | Question | For | Status |
|---|---|---|---|
| 1 | YouTrack ID | Thiru | ANSWERED — omit |
| 2 | Scope limits | Thiru | ANSWERED — include manual GitHub/Sonar/GHCR checklists |
| 3 | Retire `master`, `development` default | Thiru | ANSWERED — yes, after verification |
| 4 | Enforce promotion order in CI | Thiru | ANSWERED — yes |
| 5 | Hooks mechanism | Thiru | ANSWERED — `.githooks/` Node `.mjs`, `hooks:install` |
| 6 | Staging build + tags | Thiru | ANSWERED — `staging` config + hashing; tags unchanged |
| A | Create `chore/git-safety` from `master`? | Thiru | ANSWERED — yes |
| B | Real staging/production `apiUrl` — separate chore? | Thiru | ANSWERED — yes, keep current config |
| C | Soak period before deleting `master` | Thiru | ANSWERED — 1 full promotion cycle + 7 days |
| D | Required approvals on rulesets | Thiru | ANSWERED — 0, checks stay required |
| E | Keep hook extras (branch/secret guards)? | Thiru | ANSWERED — yes |
| F | `pre-push` `npm test` vs `test:ci` | Thiru | ANSWERED — `test:ci` (verified, ~69 s) |
| G | Allow `hotfix/*` → `release`? | Thiru | ANSWERED — no |

## Checkpoints
<!-- Newest at the bottom. Never edit or delete old checkpoints. -->

### Checkpoint 1 — 2026-11-22 23:17
- **Phase:** 0 — Intake
- **Last completed:** feature folder created, backlog row updated
- **In progress:** none
- **Files touched:** `docs/features/git-safety/STATUS.md`, `docs/features/git-safety/WORK-ITEMS.md`, `docs/BACKLOG.md`
- **Uncommitted changes:** yes (on `master`; no working branch until Phase 4)
- **Next exact step:** on `APPROVE`, start Phase 1 Discovery: write `01-discovery.md` describing the current branches, `.github/workflows/ci-cd.yml` triggers and jobs, Sonar setup, Dockerfile and image tagging, and hooks, then gaps and risks.

### Checkpoint 2 — 2026-11-23 01:05
- **Phase:** 1 — Discovery
- **Last completed:** read-only repository audit and `01-discovery.md` written
- **In progress:** none
- **Files touched:** `docs/features/git-safety/01-discovery.md`, `docs/features/git-safety/STATUS.md`, `docs/BACKLOG.md`
- **Uncommitted changes:** yes (on `master`; no working branch until Phase 4)
- **Next exact step:** on `APPROVE` (and decisions on open questions), start Phase 2 Planning: write `02-plan.md` (target setup, repo changes vs manual GitHub/Sonar/GHCR steps) and populate `WORK-ITEMS.md`.

### Checkpoint 3 — 2026-11-23 21:05
- **Phase:** 2 — Planning
- **Last completed:** `02-plan.md` written; `WORK-ITEMS.md` populated (22 sub-items, all TODO)
- **In progress:** none
- **Files touched:** `docs/features/git-safety/02-plan.md`, `docs/features/git-safety/WORK-ITEMS.md`, `docs/features/git-safety/STATUS.md`, `docs/BACKLOG.md`
- **Uncommitted changes:** yes (on `master`; no working branch until Phase 4)
- **Next exact step:** on `APPROVE` (and decisions A–G), start Phase 3 Design: write `03-design.md` with the branch-flow diagram, pipeline-steps-per-branch and Docker-tags-per-environment tables (`docs/design-system.md` is not needed for a chore).

### Checkpoint 4 — 2026-11-23 21:30
- **Phase:** 3 — Design
- **Last completed:** `docs/design-system.md` created; `03-design.md` written (branch flow, pipeline per branch, promotion policy, hooks, Docker tags, migration gates, rollback); `02-plan.md` updated to v1.1 with decisions A–G; `npm run test:ci` verified (exit 0, ~69 s)
- **In progress:** none
- **Files touched:** `docs/design-system.md`, `docs/features/git-safety/03-design.md`, `docs/features/git-safety/02-plan.md`, `docs/features/git-safety/STATUS.md`, `docs/BACKLOG.md`
- **Uncommitted changes:** yes (on `master`; no working branch until Phase 4)
- **Next exact step:** on `APPROVE`, start Phase 4 Development: create `chore/git-safety` from `master`, then WI-1.1 (`.gitignore` + `.gitattributes`), checkpointing after each sub-item.

### Checkpoint 5 — 2026-11-23 21:44
- **Phase:** 4 — Development
- **Last completed:** WI-1.1 .gitignore (.env*) and .gitattributes (LF for .githooks/* and *.sh)
- **In progress:** none
- **Files touched:** \.gitignore\, \.gitattributes\, docs
- **Uncommitted changes:** yes (branch \chore/git-safety\, not pushed)
- **Next exact step:** WI-1.2: .dockerignore additions; sonar-project.properties exclusion + comment

### Checkpoint 6 — 2026-11-23 21:46
- **Phase:** 4 — Development
- **Last completed:** WI-1.2 .dockerignore additions; sonar-project.properties excludes .githooks/** and comment fixed (WI-1 DONE)
- **In progress:** none
- **Files touched:** \.dockerignore\, \sonar-project.properties\, docs
- **Uncommitted changes:** yes (branch \chore/git-safety\, not pushed)
- **Next exact step:** WI-2.1: .githooks/lib.mjs helpers + pre-commit/commit-msg/pre-push sh shims

### Checkpoint 7 — 2026-11-23 21:46
- **Phase:** 4 — Development
- **Last completed:** WI-2.1 .githooks/lib.mjs helpers and pre-commit/commit-msg/pre-push sh shims (LF verified, Prettier-formatted)
- **In progress:** WI-2.2 started: scripts/hooks-install.mjs written, package.json scripts next
- **Files touched:** \.githooks/lib.mjs\, \.githooks/pre-commit\, \.githooks/commit-msg\, \.githooks/pre-push\, \scripts/hooks-install.mjs\, docs
- **Uncommitted changes:** yes (branch \chore/git-safety\, not pushed)
- **Next exact step:** WI-2.2: add hooks:install / hooks:uninstall npm scripts and test the installer

### Checkpoint 8 — 2026-11-23 21:50
- **Phase:** 4 — Development
- **Last completed:** WI-2.2 scripts/hooks-install.mjs (+ --uninstall) and package.json scripts added
- **In progress:** none
- **Files touched:** \scripts/hooks-install.mjs\, \package.json\, docs
- **Uncommitted changes:** yes (branch \chore/git-safety\, not pushed)
- **Next exact step:** WI-2.3: .githooks/pre-commit.mjs (protected-branch + secret guard, ESLint + Prettier on staged files)

### Checkpoint 9 — 2026-11-23 21:51
- **Phase:** 4 — Development
- **Last completed:** WI-2.3 .githooks/pre-commit.mjs (protected-branch + secret guard, ESLint + Prettier on staged files)
- **In progress:** none
- **Files touched:** .githooks/pre-commit.mjs, docs
- **Uncommitted changes:** yes (branch chore/git-safety, not pushed)
- **Next exact step:** WI-2.4: .githooks/commit-msg.mjs

### Checkpoint 10 — 2026-11-23 21:51
- **Phase:** 4 — Development
- **Last completed:** WI-2.4 .githooks/commit-msg.mjs (Conventional Commits, max 100 chars, Merge/Revert/fixup/squash allowed)
- **In progress:** none
- **Files touched:** .githooks/commit-msg.mjs, docs
- **Uncommitted changes:** yes (branch chore/git-safety, not pushed)
- **Next exact step:** WI-2.5: .githooks/pre-push.mjs

### Checkpoint 11 — 2026-11-23 21:51
- **Phase:** 4 — Development
- **Last completed:** WI-2.5 .githooks/pre-push.mjs (protected-branch + branch-name guard, typecheck + test:ci) — WI-2 DONE
- **In progress:** none
- **Files touched:** .githooks/pre-push.mjs, docs
- **Uncommitted changes:** yes (branch chore/git-safety, not pushed)
- **Next exact step:** WI-3.1: angular.json staging outputHashing: all

### Checkpoint 12 — 2026-11-23 21:53
- **Phase:** 4 — Development
- **Last completed:** WI-3.1 angular.json staging outputHashing: all
- **In progress:** none
- **Files touched:** angular.json, docs
- **Uncommitted changes:** yes (branch chore/git-safety, not pushed)
- **Next exact step:** WI-3.2: scripts/check-format.mjs fallback & zero-SHA handling

### Checkpoint 13 — 2026-11-23 21:53
- **Phase:** 4 — Development
- **Last completed:** WI-3.2 scripts/check-format.mjs base fallback and zero-SHA handling verified
- **In progress:** none
- **Files touched:** scripts/check-format.mjs, docs
- **Uncommitted changes:** yes (branch chore/git-safety, not pushed)
- **Next exact step:** WI-3.3: .github/workflows/ci-cd.yml staging BUILD_CONFIG and zero-SHA FORMAT_BASE

### Checkpoint 14 — 2026-11-23 21:53
- **Phase:** 4 — Development
- **Last completed:** WI-3.3 .github/workflows/ci-cd.yml updated for staging build config and zero-SHA format base
- **In progress:** none
- **Files touched:** .github/workflows/ci-cd.yml, docs
- **Uncommitted changes:** yes (branch chore/git-safety, not pushed)
- **Next exact step:** WI-3.4: scripts/check-promotion.mjs + .github/workflows/pr-policy.yml

### Checkpoint 15 — 2026-11-23 21:53
- **Phase:** 4 — Development
- **Last completed:** WI-3.4 scripts/check-promotion.mjs and .github/workflows/pr-policy.yml added — WI-3 DONE
- **In progress:** none
- **Files touched:** scripts/check-promotion.mjs, .github/workflows/pr-policy.yml, docs
- **Uncommitted changes:** yes (branch chore/git-safety, not pushed)
- **Next exact step:** WI-4.1: docs/branching-strategy.md

### Checkpoint 16 — 2026-11-23 21:54
- **Phase:** 4 — Development
- **Last completed:** WI-4.1 docs/branching-strategy.md written
- **In progress:** none
- **Files touched:** docs/branching-strategy.md, docs
- **Uncommitted changes:** yes (branch chore/git-safety, not pushed)
- **Next exact step:** WI-4.2: README.md drift fixes + Branching & hooks section

### Checkpoint 17 — 2026-11-23 21:54
- **Phase:** 4 — Development
- **Last completed:** WI-4.2 README.md updated — WI-4 DONE
- **In progress:** none
- **Files touched:** README.md, docs
- **Uncommitted changes:** yes (branch chore/git-safety, not pushed)
- **Next exact step:** WI-5.1: lint, format:check, typecheck, test:ci, ng build (development, staging, production)

### Checkpoint 18 — 2026-11-23 21:58
- **Phase:** 4 — Development
- **Last completed:** WI-5.1 full lint/format/typecheck/build/test:ci suite passed
- **In progress:** none
- **Files touched:** docs
- **Uncommitted changes:** yes (branch chore/git-safety, not pushed)
- **Next exact step:** WI-5.2: Docker build check

### Checkpoint 19 — 2026-11-23 21:58
- **Phase:** 4 — Development
- **Last completed:** WI-5.2 Docker unavailable locally (noted in 04-implementation-notes.md; runs in CI)
- **In progress:** none
- **Files touched:** docs
- **Uncommitted changes:** yes (branch chore/git-safety, not pushed)
- **Next exact step:** WI-5.3: dry-run hooks & promotion policy

### Checkpoint 20 — 2026-11-23 21:58
- **Phase:** 4 — Development
- **Last completed:** WI-5.3 dry-runs passed (WI-5 DONE, 16/22 total; all agent items WI-1..WI-5 DONE) and 04-implementation-notes.md written
- **In progress:** none
- **Files touched:** docs/features/git-safety/04-implementation-notes.md, STATUS.md, WORK-ITEMS.md, docs/BACKLOG.md
- **Uncommitted changes:** yes (branch chore/git-safety, not pushed)
- **Next exact step:** on APPROVE, start Phase 5 Manual Test Checklist: write 05-manual-test-cases.md

### Checkpoint 21 — 2026-11-23 22:13
- **Phase:** 5 — Test Checklist
- **Last completed:** Phase 5 manual test checklist written (42 cases, Docker-free local workflow); Docker-free local policy documented in docs/branching-strategy.md and README.md
- **In progress:** none
- **Files touched:** docs/features/git-safety/05-manual-test-cases.md, docs/branching-strategy.md, README.md, STATUS.md, docs/BACKLOG.md
- **Uncommitted changes:** yes (branch chore/git-safety, not pushed)
- **Next exact step:** on APPROVE, start Phase 6 Commit & Push: show git status/diff summary, propose commit message(s) and target branch chore/git-safety, wait for commit/push APPROVE

### Checkpoint 22 — 2026-11-23 22:18
- **Phase:** 6 — Commit & Push
- **Last completed:** Added permanent Docker-free local development policy to .agents/rules/feature-lifecycle.md and .agents/rules/git-safety.md; prepared Phase 6 git status, diff summary, and commit proposal
- **In progress:** none
- **Files touched:** .agents/rules/feature-lifecycle.md, .agents/rules/git-safety.md, STATUS.md, docs/BACKLOG.md
- **Uncommitted changes:** yes (branch chore/git-safety, not committed/pushed)
- **Next exact step:** wait for Thiru APPROVE on commit message(s) and push to origin/chore/git-safety
