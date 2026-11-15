# Frontend design

How WealthLens looks and flows. **What** each feature does is decided in the backend's own design and PRD
(`this-is-thiru/wealthlens`, `docs/`). These documents cite it and never re-derive it.

| File | What | Written by |
|---|---|---|
| `00-BRIEF.md` | who the app is for, its principles, the map of the whole app, the feature order. Wins over every other design document. Edited in place, with a Changes log | FE-002 |
| `01-feature-inventory.md` | every backend endpoint and what the frontend does with it today | FE-001 |
| `02-foundations.md` | the patterns every feature reuses: services, states, errors, demo mode, formatting, tests | FE-003 |
| `features/<feature>.md` | one per feature: screens, flows, fields with backend citations, states, copy | one design item per feature |

**Once a document is approved it is frozen.** A build session may only append an erratum under a statement it can
prove wrong (`docs/fe-build/00-START-HERE.md` §9). `00-BRIEF.md` is the one exception.
