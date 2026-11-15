# 03 — Work items

The ordered backlog. Take items in order (START-HERE R4). Every item states **Goal**, **Produces** (the only files
it may change, besides its plan, STATE.md and CHECKPOINT.md), **Reads**, and **Verify**.

The shape of the whole build: **design first, then the smallest feature end to end, then the next.** Each feature
starts with a design item that ends in an approved `docs/fe-design/features/<feature>.md`. Its build items are then
placed with prompt P7 and approved before they are written here.

---

## Phase 0 — The workflow (1 item)

### FE-000 — Set up the Claude Code workflow and its gates
- **Goal:** the protocol, rules and checks that let a session plan, build and commit a feature under the owner's
  two approvals, the same way the backend's tax-planning module was built.
- **Produces:** `CLAUDE.md`; `.claude/settings.json`; `.claude/hooks/pre-commit-gate.sh`;
  `.claude/hooks/pre-commit-gate-test.sh`; `eslint.config.js`; `eslint-suppressions.json`;
  `scripts/check-format.mjs`; `scripts/check-plans.mjs`; `package.json`; `package-lock.json`; `.gitignore`;
  `.github/workflows/ci-cd.yml`; `docs/fe-build/*`; `docs/fe-design/README.md`;
  `src/app/core/services/transaction.service.ts` (FD-007).
- **Verify:** `bash .claude/hooks/pre-commit-gate-test.sh && npm run verify && npm run plans:check && npm test && npm run build`

### FE-000a — Run CI and Docker on Node 24, the developers' version
- **Goal:** CI's `npm ci` failed on FE-000's push. CI and Docker ran Node 22 (npm 10), which rejects the npm 11
  lockfile written on a developer machine (Node 24). One Node major everywhere ends that class of failure (FD-009).
- **Produces:** `.github/workflows/ci-cd.yml`; `Dockerfile`; `README.md`; `CLAUDE.md`.
- **Verify:** `npx -y npm@10 ci --dry-run` fails on the committed lockfile and npm 11 `npm ci` passes (both pasted);
  `npm run verify && npm run plans:check && npm test && npm run build`; the PR's CI run passes.

### FE-000b — Regenerate the lockfile with npm 11.21, which keeps Tailwind's `@emnapi` entries
- **Goal:** after FE-000a, CI's `npm ci` (Node 24, npm 11.x) still failed: `@emnapi/core` and `@emnapi/runtime`
  were missing. npm 11.6.2 on the developer machine drops them, and npm 11.21.2 writes them (FD-010).
- **Produces:** `package-lock.json`; `CLAUDE.md`.
- **Verify:** the lockfile has `node_modules/@emnapi/core` and `node_modules/@emnapi/runtime`; `npx npm@11 ci` and
  npm 11.6.2 `npm ci --dry-run` both pass; `npm run verify && npm test && npm run build`; the PR's CI run passes.

---

## Phase 1 — Design foundations (3 items)

### FE-001 — Feature inventory: what the backend offers, and what the frontend does with it today
- **Goal:** one table of every backend endpoint, grouped by backend module and feature, saying for each what the
  frontend does today: the route and service that call it (`path:line`), or "none"; whether a failure shows an
  error, falls back to sample data with the notice, or **falls back silently**; and every frontend screen or
  service method that calls **no** real endpoint. Each backend feature gets a size (S/M/L, by screens and
  endpoints) and what it depends on. The document ends with a recommended order, smallest first. The owner picks
  the first feature, recorded as an `FD` decision.
- **Produces:** `docs/fe-design/01-feature-inventory.md`.
- **Reads:** every `*Controller.java` under the backend's `backend/src/main/java/com/thiru/wealthlens/`; the backend
  `CLAUDE.md` "Domain rules"; this repo's `src/app/app.routes.ts`, `core/services/`, `features/`.
- **Verify:** the number of method-level `@GetMapping|@PostMapping|@PutMapping|@PatchMapping|@DeleteMapping` in
  the backend's `backend/src/main/java` equals the number of endpoint rows in the inventory (command and both
  numbers pasted); `npm run plans:check`.

### FE-002 — The brief: who the app is for, its principles, its map
- **Goal:** `00-BRIEF.md`, the design's founding document. It wins over every other design doc. It covers who
  uses the app; the principles (the backend decides, nothing silent, plain language, demo honesty); the
  navigation map of the whole app; and the feature order chosen at FE-001. It is edited in place, with a
  Changes log.
- **Produces:** `docs/fe-design/00-BRIEF.md`.
- **Reads:** `01-feature-inventory.md`; the backend `docs/taxplanning-design/00-BRIEF.md` and
  `docs/taxplanning-build/01-PRD.md` (personas and features only).
- **Verify:** every feature in the inventory appears in the map, or is listed as out of scope with a reason;
  `npm run plans:check`.

### FE-003 — Foundations: the patterns every feature reuses
- **Goal:** `02-foundations.md`, covering:
  - the HTTP service pattern: the envelope, typed models, and the error status → user message table from the
    backend `ControllerAdviser`;
  - loading, empty, error, refusal and notice states;
  - demo mode and the sample-data rule;
  - session expiry;
  - money and date formatting;
  - the `shared/ui` inventory and what is missing;
  - accessibility;
  - the test pattern (`HttpTestingController`, contract cited).
- **Produces:** `docs/fe-design/02-foundations.md`.
- **Reads:** backend `shared/dto/ApiResponse.java`, `shared/exception/ControllerAdviser.java`,
  `auth/config/AuthConfig.java`; this repo's `core/interceptors/`, `shared/ui/`.
- **Verify:** every status code `ControllerAdviser` returns has a row; every `shared/ui` component is listed;
  `npm run plans:check`.

---

## Phase 2 — The first feature (placed after FE-001's decision)

### FE-004 — Design the first feature
- **Goal:** `docs/fe-design/features/<feature>.md` for the feature the owner chose at FE-001. It covers:
  - screens and flows;
  - every field shown and every request sent, each cited from the backend `path:line`;
  - each state from the foundations;
  - the copy, verbatim;
  - what the current screen does wrong today (from the inventory).
  When approved, its build items are proposed with prompt P7.
- **Produces:** `docs/fe-design/features/<feature>.md`.
- **Verify:** every field in the document has a backend citation; every state from `02-foundations.md` is
  addressed or ruled out with a reason; `npm run plans:check`.
