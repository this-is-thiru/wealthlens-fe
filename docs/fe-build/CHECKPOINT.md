# CHECKPOINT — where to pick up

**Overwrite this file, never append.** Keep it under ~25 lines. Update it **before** telling the owner anything, so
a session cut off mid-message loses nothing (START-HERE R9, §5).

```
Item            : FE-000b — DONE (owner "fix the pipeline", 2026-11-15), committed and pushed
Stage           : between items
Next step       : confirm the PR CI run passes; then FE-001 with prompt P2, plan only
Owner actions   : upgrade the local npm: npm install -g npm@11 (11.6.2 drops the @emnapi entries; npm 12 needs Node 24.15+)
Last verify     : hook test 5/5, npm run verify, plans:check, npm test 47 files/158 tests, ng build, all pass
Files touched   : none (all committed)
Last item commit: FE-000b: regenerate package-lock.json with npm 11.21 — npm 11.6.2 dropped Tailwind's @emnapi entries, and CI's npm ci rejected it
Updated         : 2026-11-15
```

## Resume check

```
git log --oneline --grep='^FE-' -1   # must equal "Last item commit"
git status --short                   # must list exactly "Files touched" (plus this file)
```

Mismatch → stop and report both outputs. Match → do **Next step** and nothing else.
