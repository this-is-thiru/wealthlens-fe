# CLAUDE.md

Guidance for Claude Code in this repository.

## Project

WealthLens frontend: an Angular 21 single-page app for the WealthLens portfolio tracker for the Indian stock market
(transactions, corporate actions, P&L, broker charges, tax planning). Standalone components, Tailwind v4, PrimeNG,
lucide-angular, Chart.js, Vitest through `@angular/build:unit-test`.

**The backend is the product; this app is its face.** The Spring Boot backend (GitHub `this-is-thiru/wealthlens`)
holds every rule, figure and decision. Its own design and build docs are the source of truth for *what* a feature
does: `docs/taxplanning-design/`, `docs/taxplanning-build/01-PRD.md`, and the module docs under `docs/`. This repo
designs *how it looks and flows*, and never re-derives the *what*.

## How work happens here: read this before anything else

Every change goes through the protocol in **`docs/fe-build/00-START-HERE.md`**: one work item at a time, a written
plan the owner approves, then code, verify, report, and the owner's review before the single commit. Resume a
session from `docs/fe-build/CHECKPOINT.md`. Prompts are in `docs/fe-build/04-PROMPTS.md`. Design lives in
`docs/fe-design/` and is frozen once approved: errata only.

## Engineering standards: apply to every line

They override convenience. Where a check enforces one, the check is named.

### 1. Truth: never state what you have not checked

- **Every name you use must already exist.** That covers an endpoint, request or response field, enum value,
  route, component, service, CSS token or library API. Find it before you use it. An endpoint or field is cited
  from the **backend** source as `path:line` you read (controller, DTO or entity), never from memory, the old
  README, or another frontend file.
- **Every claim carries its evidence.** "Tests pass" means you ran them and can paste the output.
- **Unknown is an answer.** If a backend fact cannot be verified, say so and stop. A plausible wrong field name
  compiles, renders and fails in front of a user.
- **Report what happened, not what was intended.** Report failed, skipped and partial work as such.

### 2. The backend decides; the frontend shows

- **No financial figure is computed here.** Tax, P&L, charges, XIRR, holdings, cost basis and gains come from an
  endpoint. Formatting (₹, grouping, dates) is the only arithmetic allowed. If a screen needs a figure no endpoint
  returns, that is a **backend gap**: record it in `STATE.md` "Backend gaps" and stop. Do not compute it.
- **No law, rate, threshold or date in code.** Labels for legal concepts come from the backend's data or the
  approved design copy.
- **Nothing silent.** A failed request shows an error state with the backend's message. No `catchError` returns
  invented or default data. Sample data is allowed **only** in demo mode (`AuthService.isDemo()`), and only with
  `ui-sample-data-notice` visible. Existing fallbacks that break this are listed in the feature inventory and
  fixed feature by feature.
- **Plain language.** User-facing copy speaks to an everyday investor, not to the backend: no class names,
  no enum constants, no "DTO", no HTTP codes.

### 3. Scope: no slop

- Do what the item says and nothing else. Anything else worth doing goes in `STATE.md` "Proposals".
- No speculative input, option, flag or abstraction without a current caller.
- No dead code, commented-out code, unused imports, or `TODO` without an item id (`TODO(FE-012)`).
- Comments say *why*, never *what*.

### 4. Naming

- Names state the domain concept, using the **backend's word** for it (`ChargeSchedule`, `Draft`, `Workspace`),
  never a synonym. Search the backend before naming a model.
- Components: `<concept>-<role>` (`holding-list`, `charge-breakdown-card`). Selectors are prefixed `app-` for
  feature components and `ui-` for `shared/ui` (ESLint `component-selector`).
- Tests: `describe('<Unit>')` with `it('<does what> when <condition>')`, and `// Given` `// When` `// Then` blocks.
- Commits: `FE-0nn: <imperative what> — <why>`. The subject says what changed.

### 5. Design (Angular)

- Standalone components, `inject()` for DI (ESLint `prefer-inject`), built-in control flow (`@if`/`@for`, ESLint
  `prefer-control-flow`), signals for component state.
- One HTTP service per backend controller area under `core/services/`, typed with models under the feature's
  `models/`. The auth interceptor (`core/interceptors/auth.interceptor.ts:12`) unwraps the backend's
  `ApiResponse<T>` envelope (`{ data }`, backend `shared/dto/ApiResponse.java:10`) on success only. Error bodies
  stay wrapped.
- Backend error statuses (backend `shared/exception/ControllerAdviser.java`): 400 is a message for the user, shown
  as is; 401 means session expired; 403 means not allowed; 409 means a trade collided, retry; 503 means the
  charge engine is switched off; 500 is a generic failure.
- Reuse `shared/ui` before writing a new primitive. A component's styles stay under the 6 KB budget (`angular.json`).
- No `any` (ESLint `no-explicit-any`). Model the backend type, or `unknown` and narrow it.
- Accessible by default: labels bound to controls, keyboard reachable, focus visible (ESLint template a11y rules).

### 6. Tests

- Every behaviour change has a test that fails without it. Services are tested with `HttpTestingController`,
  asserting the exact URL, method and body the backend expects (cite the backend `path:line` in the test).
- Expected values come from the design or the backend contract, never from running the code and copying its output.
- Never weaken or delete an assertion to make a build pass.

## Commands

```bash
npm ci                    # install (Node 24 here, in CI and in Docker; FD-009)
npm start                 # dev server on http://localhost:4200, API at src/environments/environment.ts
npm run build             # production build, enforces bundle and style budgets
npm test                  # Vitest, single run
npm run test:ci           # with coverage thresholds (angular.json test.configurations.ci)
npm run lint              # ESLint against eslint-suppressions.json (the baseline)
npm run format:check      # Prettier on files changed since origin/master
npm run format:changed    # format those files in place
npm run typecheck         # ngc (templates) + tsc (specs), no emit
npm run verify            # lint + format:check + typecheck; the commit gate runs this
npm run plans:check       # a DONE item may not leave an open plan step
```

### Gates and gotchas

- **The commit gate.** `.claude/hooks/pre-commit-gate.sh` runs `npm run verify` before any `git commit` from a
  Claude Code session and blocks the commit on failure. Its test is `bash .claude/hooks/pre-commit-gate-test.sh`.
  Never bypass it (`--no-verify` or editing the hook).
- **The ESLint baseline only shrinks.** `eslint-suppressions.json` holds the violations that predate the gate
  (FD-003). A new violation fails. Fixing an old one also fails until you run
  `npx eslint src --prune-suppressions`, so the baseline records the fix. Never run `--suppress-all` or
  `--suppress-rule` to admit new code.
- **Prettier covers touched files only** (FD-002). The first change to a file formats all of it. Run
  `npm run format:changed` before committing and say so in the report.
- **CI** (`.github/workflows/ci-cd.yml`) runs lint, format check, typecheck, plans check, and tests with coverage,
  then SonarQube and the Docker image.
- **The backend checkout** must be readable for citations. Add it once with `/add-dir <path to wealthlens>`, or
  in `.claude/settings.local.json` under `permissions.additionalDirectories` (git-ignored, machine-specific).
- **One Node major everywhere: 24.** npm 11 (Node 24) leaves out optional entries that npm 10 (Node 22) `npm ci`
  requires, so a lockfile written on one fails on the other (FD-009). Do not lower `NODE_VERSION` or the Docker base.
- `.kimchi/docs/` holds notes from earlier work. They are background, not authoritative.
