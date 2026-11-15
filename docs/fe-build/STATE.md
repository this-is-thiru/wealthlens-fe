# STATE — the build's mutable record

Read it when CHECKPOINT.md points here; write it before every stop.

```
Current position : FE-000a DONE (owner "FE-000a approved", 2026-11-15). Next: FE-001 NOT_STARTED, take it with prompt P2
Last updated     : 2026-11-15
```

## Status board

`check-plans.mjs` reads this table. Keep one row per item, in the `| FE-0nn | STATUS |` shape.

| Item | Status | Date | Note |
|---|---|---|---|
| FE-000 | DONE | 2026-11-15 | workflow and gates; owner "FE-000 approved" |
| FE-000a | DONE | 2026-11-15 | CI and Docker on Node 24; owner "FE-000a approved" |
| FE-001 | NOT_STARTED | | feature inventory |
| FE-002 | NOT_STARTED | | brief |
| FE-003 | NOT_STARTED | | foundations |
| FE-004 | NOT_STARTED | | first feature design |

## Decisions

| ID | Date | Question | Decision | Who |
|---|---|---|---|---|
| FD-001 | 2026-11-13 | How is frontend work run? | The backend's tax-planning protocol: one item at a time; the owner approves the plan, then reviews the result before the single commit | owner |
| FD-002 | 2026-11-13 | 131 files predate Prettier enforcement. Format all now? | No. Check only the files a change touches (`scripts/check-format.mjs`). A file is formatted the first time it changes, so the set only shrinks, and open branches (`sonar-fixes`) avoid a whole-tree conflict | owner ("yes to both", 2026-11-15) |
| FD-003 | 2026-11-13 | Add ESLint now? | Yes: angular-eslint 21 recommended, template accessibility, and `no-console`. The 244 existing violations (242 after FD-007) are recorded in `eslint-suppressions.json`, which can only shrink. The commit gate runs `npm run verify` | owner ("eslint now: yes") |
| FD-004 | 2026-11-13 | Scope? | The whole application, not only tax planning. Design comes first, then the smallest feature end to end, then the next | owner |
| FD-005 | 2026-11-13 | Which branch? | A new branch, `setup/claude-workflow`, from `origin/master` (5ff3bf4). `sonar-fixes` is untouched | owner ("new branch") |
| FD-006 | 2026-11-15 | The 13 `shared/ui` primitives use the selector prefix `ui-`. Is that a violation? | No, it is the design-system convention. ESLint allows `ui-` in `src/app/shared/ui/**` and `app-` elsewhere | owner ("yes to both", 2026-11-15) |
| FD-007 | 2026-11-15 | An uncommitted `sonar-fixes` edit to `src/app/core/services/transaction.service.ts` (unused imports removed) was carried onto this branch. Keep it? | Keep it in FE-000. The baseline is pruned for it (244 → 242: two `no-unused-vars`), and the file is Prettier-formatted on this first touch (FD-002) | owner ("shrink the baseline") |
| FD-008 | 2026-11-15 | How does a session read the backend for citations? | `.claude/settings.local.json` `permissions.additionalDirectories` holds the backend checkout path. It is git-ignored, because the path is machine-specific. It takes effect in a session started after it was written | owner ("please take the read access") |
| FD-009 | 2026-11-15 | CI failed: Node 22's npm 10 `npm ci` rejected the npm 11 lockfile (four entries missing). Regenerate the lockfile with npm 10, or move CI and Docker to Node 24? | Node 24 in CI and Docker, matching the developer machines (v24.13.0). The npm 10 lockfile would break again at the next npm 11 install (944 → 938 entries, measured) | owner ("2") |

## Blockers

None.

## Backend gaps

Figures or endpoints a screen needs that the backend does not provide (START-HERE R2, R15). The owner takes each
to the backend's own protocol.

None yet.

## Proposals

Worth doing, not yet asked for (START-HERE R5).

- `.prettierrc` sets `wrapAttributes` and `attributeSeparator`, which Prettier 3 does not know. It warns on every
  file and ignores them. Remove them in their own item.
- `lucide-angular` is deprecated in favour of `@lucide/angular` (npm warning at install).

## Notes for resume

- FE-000 had no plan file. It set up the protocol that plan files belong to. Every later item has one.

- The frontend repo is `wealthlens-fe`. `investment-tracker-fe` is an older clone of the same history. Never work there.
- The backend checkout must be readable from a session for citations. See CLAUDE.md "Gates and gotchas".
- `broker-charges.service.ts` has 16 `catchError(() => of(<mock>))` fallbacks. FE-001 classifies each as demo or silent.
