# CHECKPOINT — where to pick up

**Overwrite this file, never append.** Keep it under ~25 lines. Update it **before** telling the owner anything, so
a session cut off mid-message loses nothing (START-HERE R9, §5).

```
Item            : FE-001 — feature inventory
Stage           : EXPLAINED (plan in plans/FE-001.md, awaiting approval)
Next step       : owner answers the plan's 4 risks and approves FE-001; owner confirms FE-000c (still AWAITING_REVIEW, PR 22 merged as 99a9371)
Owner actions   : none (local npm upgraded 11.6.2 → 11.21.2 on 2026-11-16)
Last verify     : n/a for FE-001 (no code); FE-000c: hook test 5/5, npm run verify, plans:check, npm test 47/158, ng build
Files touched   : docs/fe-build/plans/FE-001.md, docs/fe-build/STATE.md
Last item commit: FE-000c: pass the Sonar gate — fix check-format's sort, exclude developer tooling from analysis, test the demo account's guards in TransactionService
Updated         : 2026-11-16
```

## Resume check

```
git log --oneline --grep='^FE-' -1   # must equal "Last item commit"
git status --short                   # must list exactly "Files touched" (plus this file)
```

Mismatch → stop and report both outputs. Match → do **Next step** and nothing else.
