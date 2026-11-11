Figma Design: https://www.figma.com/design/6X64FBCdaWuRd38SQlgLJj/Investment-Tracker?node-id=0-1&t=E7xNouc0fvkMyIxN-1

# WealthLens

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 17.3.6.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Unit tests run on [Vitest](https://vitest.dev) through Angular's `@angular/build:unit-test` builder, in a [happy-dom](https://github.com/capricorn86/happy-dom) environment (no browser needed).

| Command | What it does |
| --- | --- |
| `npm test` | Run all tests once and exit |
| `npm run test:watch` | Re-run tests on file changes |
| `npm run test:coverage` | Run once with coverage: per-file table in the terminal, HTML report at `coverage/wealthlens/index.html` |

Run a single spec with `npx ng test --watch=false --include src/app/path/to/file.spec.ts`.

- Test globals (`describe`, `it`, `expect`, `vi`) are available without imports.
- Global test setup (stubs for browser APIs the DOM environment lacks) lives in `src/test-setup.ts`.
- To debug in VS Code, use the **ng test (debug all)** or **ng test (debug current file)** launch configurations.
- `npm run test:ci` is what CI runs: a single run with coverage (`text`, `html`, `lcov`, `json-summary`) that **fails if coverage drops below the thresholds** set in the `ci` configuration of the `test` target in `angular.json` (`coverageThresholds`). CI's coverage summary reads the same values, so that's the only place to change them.

## Docker

The image is a multi-stage build: `node:22-alpine` compiles the app, and `nginxinc/nginx-unprivileged` serves `dist/wealthlens/browser` as a non-root user on **port 8080**. nginx (`nginx.conf`) provides the SPA fallback, gzip, long-lived caching for fingerprinted assets, `no-cache` for `index.html`, security headers, and a `/healthz` endpoint used by the container `HEALTHCHECK`.

| Build arg | Default | Meaning |
| --- | --- | --- |
| `APP_NAME` | `wealthlens` | Angular project name; selects `dist/<APP_NAME>/browser` |
| `BUILD_CONFIG` | `production` | Angular configuration: `production`, `development`, `staging` or `testing` |

### Build and run locally

```bash
docker build -t wealthlens-fe .
docker run -d --name wealthlens-fe -p 4200:8080 wealthlens-fe   # host 4200 -> container 8080 (8080 on the host is the backend)
# open http://localhost:4200 ; stop with: docker rm -f wealthlens-fe

# another Angular configuration
docker build --build-arg BUILD_CONFIG=staging -t wealthlens-fe:staging .
```

Check health with `docker ps` (STATUS shows `healthy`) or `curl http://localhost:4200/healthz`.

Run the same smoke test CI runs (health, non-root, read-only files, SPA routing, 404 for missing chunks, security and cache headers):

```bash
bash scripts/docker-smoke-test.sh wealthlens-fe   # or any image tag; optional 2nd arg = host port, default 4200
```

### Pull from GitHub Container Registry

CI publishes to `ghcr.io/this-is-thiru/wealthlens-fe`:

```bash
docker pull ghcr.io/this-is-thiru/wealthlens-fe:latest          # latest release
docker pull ghcr.io/this-is-thiru/wealthlens-fe:staging         # tip of a branch
docker pull ghcr.io/this-is-thiru/wealthlens-fe:release-1a2b3c4 # exact commit
docker run -d --name wealthlens-fe -p 4200:8080 ghcr.io/this-is-thiru/wealthlens-fe:latest
```

While the package is private, log in first: `echo <PAT with read:packages> | docker login ghcr.io -u <github-user> --password-stdin`.

## CI/CD pipeline

`.github/workflows/ci-cd.yml` runs on pull requests targeting, and pushes to, `master`, `development`, `staging` and `release` (`release` = production). A newer run for the same branch or PR cancels the one in progress.

**1. `test` job**

| Step | What it does |
| --- | --- |
| Install | `npm ci` on Node 22 with the npm cache |
| Lint | `npm run lint` if a lint script exists (currently skipped) |
| Unit tests | `npm run test:ci`; fails on any failing test **or** if coverage is under the thresholds |
| Coverage summary | Writes a coverage table to the run's summary page |
| Coverage artifact | Uploads `coverage/` (HTML report, lcov) as the `coverage` artifact, kept 14 days |
| SonarQube Cloud | Analyses code and coverage (`sonar-project.properties`), then waits for the quality gate; **the run fails if the gate fails**. Skipped for PRs from forks, which can't read secrets. |

**2. `docker` job** (only after `test` passes)

| Event | Behaviour |
| --- | --- |
| Pull request | Builds the image and smoke-tests it; nothing is pushed |
| Push | Builds and smoke-tests, then logs in to ghcr.io with `GITHUB_TOKEN` and pushes (only if the smoke test passed) |

- **Build config:** `production` for `release` (and PRs into `release`), `development` otherwise.
- **Tags:** `<branch>`, `<branch>-<short sha>`, plus `latest` for `release` pushes only.
- Layers are cached in the GitHub Actions cache, so rebuilds only redo changed steps.

### Making the GHCR package public

Packages pushed with `GITHUB_TOKEN` start **private**, even in a public repo. After the first successful push:

1. Open the repo on GitHub, then **Packages** (right sidebar) and select **wealthlens-fe**.
2. **Package settings**, then **Danger Zone**, then **Change visibility**, then **Public**.
3. Under **Manage Actions access**, make sure this repository has **Write** access, so future pushes keep working.

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.

# Custom explanations:

## Build and Serve Commands

- **Development**: `ng serve`
  - Uses `environment.ts` for configuration.

- **Production Build**: `ng build --prod`
  - Uses `environment.prod.ts` for configuration.

## Adding Custom Environment Files

If you need additional environment configurations (e.g., for staging, testing), create new environment files (`environment.staging.ts`, `environment.testing.ts`) and specify them when serving or building your application using the `--configuration` flag:

```bash
ng serve --configuration=staging
ng build --configuration=testing

