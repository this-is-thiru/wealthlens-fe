# CHECKPOINT — where to pick up

**Overwrite this file, never append.** Keep it under ~25 lines. Update it **before** telling the owner anything, so
a session cut off mid-message loses nothing (START-HERE R9, §5).

```
Item            : FE-000a — DONE (owner "FE-000a approved", 2026-11-15), committed and pushed
Stage           : between items
Next step       : confirm the PR CI run passes (Node 24); then FE-001 with prompt P2, plan only
Owner actions   : start the next session inside wealthlens-fe, so the backend read access (FD-008) applies
Last verify     : hook test 5/5, npm run verify, plans:check, npm test 47 files/158 tests, ng build, all pass
Files touched   : none (all committed)
Last item commit: FE-000a: run CI and Docker on Node 24 — Node 22's npm 10 rejected the npm 11 lockfile, failing CI's npm ci
Updated         : 2026-11-15
```

## Resume check

```
git log --oneline --grep='^FE-' -1   # must equal "Last item commit"
git status --short                   # must list exactly "Files touched" (plus this file)
```

Mismatch → stop and report both outputs. Match → do **Next step** and nothing else.
