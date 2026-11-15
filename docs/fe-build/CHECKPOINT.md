# CHECKPOINT — where to pick up

**Overwrite this file, never append.** Keep it under ~25 lines. Update it **before** telling the owner anything, so
a session cut off mid-message loses nothing (START-HERE R9, §5).

```
Item            : FE-000c — Sonar gate (FD-011), committed and pushed before review to unblock CI
Stage           : AWAITING_REVIEW
Next step       : confirm the PR 22 CI and quality gate pass; the owner confirms FE-000c (option A); then FE-001 with P2
Owner actions   : upgrade the local npm: npm install -g npm@11 (11.6.2 drops the @emnapi entries; npm 12 needs Node 24.15+)
Last verify     : hook test 5/5, npm run verify, plans:check, npm test 47 files/158 tests, ng build, all pass
Files touched   : none (all committed)
Last item commit: FE-000c: pass the Sonar gate — fix check-format's sort, exclude developer tooling from analysis, test the demo account's guards in TransactionService
Updated         : 2026-11-15
```

## Resume check

```
git log --oneline --grep='^FE-' -1   # must equal "Last item commit"
git status --short                   # must list exactly "Files touched" (plus this file)
```

Mismatch → stop and report both outputs. Match → do **Next step** and nothing else.
