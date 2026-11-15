# 04 — Prompts

Copy-paste these. Replace `<FE-0nn>` and nothing else.

---

## P1 — Start a session

> Read `docs/fe-build/00-START-HERE.md` completely, then `docs/fe-build/CHECKPOINT.md` and
> `docs/fe-build/STATE.md`. Run the resume check in START-HERE §5.
> Tell me in under ten lines: the current item and status, anything `IN_PROGRESS`, `AWAITING_REVIEW` or
> `BLOCKED`, open backend gaps, and the next action. **Write nothing. Start nothing.** Wait for me.

## P1-quick — Resume after an interruption

> Resume the frontend build: read `docs/fe-build/CHECKPOINT.md`, run its resume check, and if it matches, do its
> **Next step** only. If a plan file is named, continue at its first unticked step. Update `CHECKPOINT.md` before
> you report to me.

---

## P2 — Explain an item *(first stop)*

> Take **`<FE-0nn>`** from `docs/fe-build/03-WORK-ITEMS.md`.
> Read the item, the design sections it names, and the backend files it cites, and only those.
> Write `docs/fe-build/plans/<FE-0nn>.md` with the exact template in START-HERE §2.
> - Every row of the backend-contract table cites a backend `path:line` you read in this session. Cannot → `BLOCKED`.
> - A file outside Produces → blocker.
> - A figure no endpoint returns → backend gap (R2) → blocker.
>
> **Write no code.** Set the item to `EXPLAINED` in STATE.md, update CHECKPOINT.md, and stop.

## P2b — Reject or amend a plan

> The plan for **`<FE-0nn>`** is **not approved**. Problems:
> 1. …
>
> Keep it `EXPLAINED`. Revise only these points in the plan file. **Write no code.** Stop and wait.

---

## P3 — Implement after approval *(to the second stop)*

> **`<FE-0nn>` approved** *(or: approved with these changes: …)*.
>
> Record my exact words under "Approval" in the plan file. Then implement the plan step by step, ticking each step
> and updating CHECKPOINT.md as you go.
> - Touch only Produces. Cite the backend for every field you use.
> - A failing test means the code is wrong: never change an expected value.
> - If the plan cannot work, stop (R13): revert, set back to `EXPLAINED`, revise the plan, wait.
>
> Then run: the item's Verify; `npm run format:changed`; `npm run verify`; `npm test`; `npm run build`;
> `git status --short`. You may fix your own code twice on a failure, pasting the output each time. A third
> failure → `BLOCKED` with the output.
>
> Report with the template in START-HERE §3, pasting real output. Set `AWAITING_REVIEW`. **Stop.**

---

## P4 — Record my review

**Approving:**

> **`<FE-0nn>` review: approved.**
> 1. STATE.md: set it `DONE` with today's date on the board, advance "Current position", and add anything learned
>    to "Notes for resume".
> 2. CHECKPOINT.md: set "Last item commit" to the subject you are about to use, `FE-0nn: <title> — <why>`.
> 3. Commit **only** Produces, the plan file, STATE.md, CHECKPOINT.md (and `eslint-suppressions.json` if pruned),
>    in **one** commit with that subject, ending with the session's attribution line. Use `git commit -- <paths>`.
> 4. Run `npm run plans:check`. Show me `git log --oneline -1` and `git status --short`. Stop.

**Requesting changes:**

> **`<FE-0nn>` review: changes requested.**
> 1. …
>
> Back to `IN_PROGRESS`. Fix only these, re-run every check, report again with the §3 template. Stop.

---

## P5 — A blocker is answered

> On **FB-00n**: <the answer>. Record it in STATE.md as a decision `FD-nnn` and close the blocker. Then return
> **`<FE-0nn>`** to stage 2 (P2). Do not code.

## P6 — The design and the backend disagree

> For **`<FE-0nn>`**: list each disagreement as *design says / backend does (path:line)*. Change neither side.
> Recommend which should give way and why, as a backend gap or a design erratum. Stop and wait.

## P7 — Place the build items for a designed feature

> The feature design `docs/fe-design/features/<feature>.md` is approved. Propose its build items for
> `03-WORK-ITEMS.md` under the feature's phase: each one screen, component or service, under 300 lines, each
> with Goal, Produces, Design sections, Backend contract (path:line), Verify. Order them so every item runs on
> what came before. Show me the rows. **Do not write them into the file until I approve.**
