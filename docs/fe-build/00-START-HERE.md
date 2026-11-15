# 00 — START HERE

You are building the WealthLens frontend, one feature at a time. This directory is the **execution** set.
`docs/fe-design/` is the **design**: reference it, never re-derive it. The **backend** repo is the source of truth
for what every feature does and every field it returns.

**Read this file completely before doing anything.** It is adapted from the backend's
`docs/taxplanning-build/00-START-HERE.md`, which built the tax-planning module the same way (FD-001).

---

## 1. The loop: one work item at a time, two stop points

```
  ┌─ 1. READ ──────── the item, the design sections it names, the backend files it cites. Only those.
  │
  ├─ 2. EXPLAIN ───── write plans/FE-0nn.md (§2).  ████ STOP. WAIT FOR APPROVAL. ████   status → EXPLAINED
  │
  ├─ 3. CODE ──────── exactly what was approved. Nothing more.                          status → IN_PROGRESS
  │
  ├─ 4. VERIFY ────── the item's Verify command, then `npm run verify`, `npm test`, `npm run build`
  │
  ├─ 5. REPORT ────── summary + pasted output (§3).  ████ STOP. WAIT FOR REVIEW. ████    status → AWAITING_REVIEW
  │
  └─ 6. REVIEW ────── owner approves → DONE, one commit, next item
                      owner requests changes → back to stage 3
```

Two more edges:

```
  stage 2 → stage 2   plan rejected (prompt P2b). Status stays EXPLAINED. Still no code.
  stage 3 → stage 2   the approved plan turns out to be wrong (R13). Revert, re-plan, re-approve.
```

**Never** go from READ straight to CODE. **Never** mark an item DONE yourself. **Never** start the next item
while one is `AWAITING_REVIEW`.

A **design item** (Phase 1, and the first item of every feature) runs the same loop. Its "code" is a design
document, and its Verify is the document's own checklist plus `npm run plans:check`.

| Status | Meaning | Set by |
|---|---|---|
| `NOT_STARTED` | untouched | — |
| `EXPLAINED` | plan written, waiting for approval | you |
| `IN_PROGRESS` | plan approved, work under way | you |
| `AWAITING_REVIEW` | done and verified, waiting for review | you |
| `DONE` | reviewed and accepted | **owner only** |
| `BLOCKED` | cannot proceed, reason recorded | you |

---

## 2. Stage 2: the EXPLAIN template (`plans/FE-0nn.md`)

```markdown
## Plan for FE-0nn — <title>

**What this item is for (one sentence, in my own words):**

**Files I will create:**
- path — <one line>

**Files I will modify:**
- path — <one line>
- (any file not in the item's Produces → STOP, that is a blocker)

**Backend contract I will use, and where each piece comes from:**
| Endpoint / field / status | Backend source (path:line, read this session) |
|---|---|
| GET /user-charges/user/{email} | backend/src/main/java/.../UserChargeController.java:41 |

**Design sections I read:**

**Copy I will show the user** (verbatim from the design, or "none"):

**What I am NOT doing:**

**How I will verify:**
<the item's Verify command, verbatim>

**Risks or ambiguities I noticed:**

## Approval
<owner's exact words> — <date>          ← blank means not approved

## Steps
- [ ] 1. <one file or one change>
- [ ] n. Verify + npm run verify + npm test + npm run build
```

If a row of the backend-contract table cannot be cited, **stop, mark `BLOCKED`, do not guess.**

---

## 3. Stage 5: the REPORT template

````markdown
## FE-0nn complete — awaiting review

**What I did:**

**Files created:**   **Files modified:**

**Verify output:**
```
<the actual command and its actual output, never a summary>
```

**npm run verify / npm test / npm run build:**
```
<the tail of each>
```

**Screens to look at** (route, and what to click): 

**Anything the reviewer should look at closely:**

**Anything I could not do:**
````

---

## 4. Absolute rules

| # | Rule |
|---|---|
| **R1** | **Never invent an endpoint, field, enum value or status.** Each is cited from the backend source, `path:line`, read in this session. Cannot find it → `BLOCKED`. |
| **R2** | **Never compute a financial figure.** Show what an endpoint returns; formatting is the only arithmetic. A figure no endpoint returns is a **backend gap**: record it in STATE "Backend gaps" and stop. |
| **R3** | **Never change a test's expected value to make it pass.** If the test follows the design or the contract, the code is wrong. |
| **R4** | **Never skip or reorder items.** Order is the board's. A `BLOCKED` item stops the session and asks the owner. |
| **R5** | **Never do more than the item says.** No refactor, no "while I'm here". Write it under STATE "Proposals". |
| **R6** | **Ambiguous design or contract → stop.** Mark `BLOCKED`, write what is ambiguous, stop. |
| **R7** | **Never rewrite an approved design document.** Append an erratum (§9). `00-BRIEF.md` alone is edited in place with its Changes log. |
| **R8** | **One item in flight.** |
| **R9** | **Update `CHECKPOINT.md` at every stage change and every plan step, and `STATE.md` before you stop.** |
| **R10** | **Nothing silent.** No `catchError` that returns invented or default data. A failure shows an error state. Sample data only in demo mode, and only with `ui-sample-data-notice` visible. |
| **R11** | **Never mark an item `DONE`.** Only the owner's review does. |
| **R12** | **Explain before you code.** No exceptions. |
| **R13** | **If the approved plan turns out to be wrong, stop.** Revert, set back to `EXPLAINED`, re-plan, wait. |
| **R14** | **Approval must be explicit.** Only a message that names the item and says *approved* or *changes requested* counts. "ok", "looks good", silence or a new instruction is not approval: ask. |
| **R15** | **Never edit the backend repo** from a frontend session. A backend gap or defect goes in STATE "Backend gaps" for the owner to take to the backend's own protocol. |

---

## 5. Resuming after an interruption

```
1. Read CHECKPOINT.md.
2. git log --oneline --grep='^FE-' -1      → must equal its "Last item commit"
3. git status --short                      → must list exactly its "Files touched"
   mismatch → STOP, report both outputs
4. Act on the status:
     EXPLAINED        → ask for approval. Do NOT code.
     IN_PROGRESS      → open plans/FE-0nn.md, continue at the first unticked step.
     AWAITING_REVIEW  → ask for review. Do NOT start the next item.
     BLOCKED          → report the blocker. STOP.
```

No work-in-progress commits. Uncommitted files survive between sessions; the item is still one commit.

---

## 6. Definition of done

- [ ] The item's Verify passes
- [ ] `npm run verify` passes (lint against the baseline, format of touched files, typecheck)
- [ ] `npm test` passes, and `npm run build` passes (budgets)
- [ ] `npm run format:changed` was run; if it formatted a file outside Produces, `git checkout --` it and say so
- [ ] If an old lint violation was fixed, `npx eslint src --prune-suppressions` was run
- [ ] The only files changed are: Produces, `plans/FE-0nn.md`, `STATE.md`, `CHECKPOINT.md`, and
      `eslint-suppressions.json` if pruned
- [ ] The owner reviewed and approved
- [ ] **One** commit, subject `FE-0nn: <title> — <why>`, with CHECKPOINT's "Last item commit" set to that
      subject **before** committing

---

## 7. Sizing

An item is one screen, one component, one service, or one small tightly-coupled set, finishable in a session:
under about 300 lines of new code. If it is bigger, say so in the EXPLAIN with a proposed split. Never split
or expand it yourself mid-code.

---

## 8. Escalation: mark `BLOCKED` and stop when

- an endpoint, field or status cannot be cited from the backend;
- a screen needs a figure the backend does not return (R2: also a backend gap);
- the design and the backend disagree (do not change either side);
- two design documents disagree;
- a gate fails for a reason the item did not anticipate;
- you would modify a file outside Produces;
- the item is mis-sized (§7), which you raise in the EXPLAIN.

Record it in STATE.md in this shape:

```
### FB-00n  (FE-0nn)
What I needed:
What I looked at:
What is ambiguous or missing:
What I would need to proceed:
```

---

## 9. Errata: the only permitted write to an approved design document

```markdown
> **Erratum (FE-0nn, YYYY-MM-DD):** <what is wrong, one sentence> — <the correction>.
> Verified by: <command or path:line>.
```

Immediately below the wrong text. Never edit or delete the original. Only with proof. Record it in STATE
"Notes for resume" too.

---

## 10. Files here

| File | What | When |
|---|---|---|
| `00-START-HERE.md` | this protocol | every session |
| `03-WORK-ITEMS.md` | the ordered backlog | every session |
| `04-PROMPTS.md` | copy-paste prompts per stage | every session |
| `STATE.md` | status board, decisions `FD-nnn`, blockers `FB-nnn`, backend gaps, proposals | when the checkpoint points there |
| `CHECKPOINT.md` | the resume point, overwritten | first and last thing |
| `plans/FE-0nn.md` | an item's plan, approval and steps | while the item is in flight; committed with it |

IDs: items `FE-0nn` (suffix letters for splits, never renumbered), decisions `FD-nnn`, blockers `FB-nnn`. A backend
ID is cited with its document prefix (`backend PRD F2.9`, `backend W-091`), because the two repos' numbers collide.
