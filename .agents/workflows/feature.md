---
description: Start or resume a feature or chore using the phase-gated lifecycle. Usage — /feature start <name> | /feature resume <slug> | /feature status
---

1. Follow `.agents/rules/feature-lifecycle.md` and `.agents/rules/git-safety.md` exactly.
2. **start <name>**: if `docs/features/<slug>/` already exists, switch to resume instead. Otherwise run Phase 0 (Intake): copy the templates from `docs/templates/`, add the item to `docs/BACKLOG.md`, write Checkpoint 1, and stop at the Phase 0 Gate Report.
3. **resume <slug>**: follow the Resume protocol — read STATUS.md (latest checkpoint), WORK-ITEMS.md and the current phase document, verify against `git status` and the files, report in 3 lines, and wait for my go.
4. **status**: show `docs/BACKLOG.md` as a table plus, for each item in progress, its phase, work items done/total, and next step. Change nothing.
5. Never move to the next phase without my `APPROVE`.
