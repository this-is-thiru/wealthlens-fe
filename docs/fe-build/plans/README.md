# Plans

One file per item, `FE-0nn.md`, written at stage 2 (EXPLAIN) from the template in `00-START-HERE.md` §2, so an
approved plan survives the session that wrote it.

- **Approval** holds the owner's exact words and the date. Blank means not approved.
- **Steps** are ticked as each finishes, with CHECKPOINT.md updated. A resumed session continues at the first
  unticked step and redoes nothing ticked.
- The plan is committed **with its item**, in the item's one commit.
- Once STATE marks the item `DONE`, every step is ticked or says "not taken" with why. `npm run plans:check`
  fails the build otherwise.
