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

