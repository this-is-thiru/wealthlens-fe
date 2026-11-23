# Design System — WealthLens (wealthlens-fe)

> Created once at the first Phase 3 (chore `git-safety`) by auditing the app. Used by every feature. Feature work must reuse these tokens and components; no hard-coded colours, new fonts or new UI libraries.

## 1. Stack
| Concern | Choice | Source |
|---|---|---|
| Framework | Angular 21, standalone components, lazy `loadChildren` routes | `package.json`, `src/app/app.routes.ts` |
| Styling | Tailwind CSS 4 (`@theme` tokens in `src/styles.scss`) + `@tailwindcss/forms` + `@tailwindcss/typography`; per-component CSS | `src/styles.scss`, `postcss.config.json` |
| Component library | In-house primitives in `src/app/shared/ui` (prefix `ui-`, enforced by ESLint); PrimeNG / PrimeFlex are installed | `eslint.config.js`, `package.json` |
| Icons | `primeicons` (imported in `styles.scss`), Material Icons (CDN in `index.html`), `lucide-angular` (`src/app/core/icons`) | `index.html`, `package.json` |
| Font | Manrope 400/500/700/800 (Google Fonts) | `src/index.html` |
| Theme | Dark only (`<html class="dark">`); base font size 15px | `index.html`, `styles.scss` |
| Charts / data | `chart.js`, `xlsx` | `package.json` |

## 2. Theme tokens (`@theme` in `src/styles.scss`)
| Group | Tokens |
|---|---|
| Surfaces | `--color-background #191919`, `--color-surface #232323`, `--color-surface-alt #1C1C1C`, `--color-surface-hover #2E2E2E`, `--color-surface-input #2A2A2A`, `--color-overlay rgba(0,0,0,.8)` |
| Borders | `--color-border #3A3A3A`, `--color-border-hover #525252`, `--color-divider #2A2A2A` |
| Text | `--color-text-primary #FFF`, `-secondary #B3B3B3`, `-muted #8A8A8A` (WCAG AA), `-disabled #666` |
| Accents | `--color-accent #10A37F` (+`-hover #1AA97D`), `--color-blue-accent #3B82F6` (+`-hover #2563EB`), `--color-purple-accent #8B5CF6` |
| Status | `--color-success #22C55E`, `--color-warning #FACC15`, `--color-danger #EF4444` |
| Radius | `--radius-md .625rem`, `-lg .75rem`, `-xl 1rem`, `-2xl 1.25rem` |
| Shadow | `--shadow-card`, `--shadow-modal`, `--shadow-inner` |
| Motion | `--transition-duration-fast 100ms`, `-slow 300ms`, `--animate-spin-slow`; many keyframes in `styles.scss`; `prefers-reduced-motion` honoured globally |
| Type scale | Tailwind defaults plus `--text-2xs 0.6875rem` (smallest allowed size) |

Use via Tailwind utilities (e.g. `bg-surface`, `text-text-secondary`, `border-border`) or `var(--color-*)` in component CSS.

## 3. Shared UI primitives (`src/app/shared/ui`)
`alert`, `badge`, `button`, `card`, `confirm-dialog` (+ service), `empty-state`, `input`, `modal`, `radio-card`, `sample-data-notice`, `spinner`, `tabs`, `toggle` — exported from `ui/index.ts`.
Other shared pieces: `shared/components` (header, footer, notification-toast, settings, expansion-panel), `shared/pipes/loader` and `snackbar`, `shared/directives/tooltip`. Global utility class: `.premium-card`.

## 4. Layout patterns
- Root: `<router-outlet>` in `app.component.html`; pages lazy-loaded per feature (`home`, `investments-tracking`, `portfolio-analytics`, `tax-filing`, `broker-charges`, `notifications`, `auth`), protected by `authGuard`.
- Auth flows are **modal secondary-outlet routes** (`sign-in`, `sign-up`, `forgot-password`, `change-password`); the background `main` is blurred while one is open.
- Feature layout: `features/<name>/{pages,components,models,services}`; feature components use selector prefix `app-`, design primitives use `ui-`.

## 5. Reference pages
| Use case | Model on |
|---|---|
| Data page with tabs and cards | `features/portfolio-analytics`, `features/tax-filing` |
| Form / upload flow | `features/investments-tracking/components/upload-transactions` |
| Auth modal | `features/auth/components/sign-in` |
| Component catalogue | `features/style-guide` |

## Changelog
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-23 | Initial audit |
