# E2E + Accessibility Tests for Public Auth Routes — Design

**Punch-list item:** #13 from the ONEVO_HRMS_Frontend_Architecture audit — "add Playwright e2e specs + axe-core accessibility checks." This repo has scaffolding only (`playwright.config.ts`, `e2e/smoke.spec.ts` placeholder, `@axe-core/playwright` devDependency already installed) but no real specs, and the CI `e2e-tests` job is `continue-on-error: true` with nothing that starts a server for Playwright to drive.

## Scope

Public (unauthenticated) routes only:

- `/auth/login`
- `/auth/forgot-password`
- `/auth/reset-password`
- `/auth/mfa-verify`
- `/auth/accept-invite`

Protected routes (`/`, `/tenants`, `/roles`, `/users`, `/settings/mfa`) are explicitly out of scope for this item — covering them requires a seeded test-admin account and an MFA-bypass mechanism in the backend, which doesn't exist yet. That's a separate future item.

## 1. CI test server

The existing `npm start` script requires a gitignored, CI-absent SSL cert (`.certs/localhost-cert.pem`) and restricts to `allowedHosts: ["admin.localhost"]`. None of the in-scope routes need a backend or the `admin_session`/`admin_csrf` cookie machinery, so e2e tests need only the frontend dev server, served over plain HTTP.

- `angular.json`: add a new `e2e` serve configuration under `architect.serve.configurations` that overrides the base options with `"ssl": false` and `"allowedHosts": true`.
- `playwright.config.ts`: add
  ```typescript
  webServer: {
    command: 'ng serve --configuration e2e --port 4300',
    url: 'http://localhost:4300',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: {
    baseURL: 'http://localhost:4300',
  },
  ```
  Playwright starts (and tears down) the server itself in CI; locally it reuses an already-running server on that port if present.

## 2. Test coverage

- `e2e/accessibility.spec.ts` — for each of the 5 routes, `page.goto(route)` then `new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()`, asserting `results.violations` is empty. Matches the architecture doc's example pattern.
- One functional spec per route under `e2e/auth/`:
  - `login.spec.ts` — form renders (email/password fields, submit button), submit button disabled when fields empty, "Forgot password?" link navigates to `/auth/forgot-password`.
  - `forgot-password.spec.ts` — form renders, submit disabled on empty email, "Back to sign in" link navigates to `/auth/login`.
  - `reset-password.spec.ts` — with no `token` query param, renders the existing "invalid link" state (`view() === 'invalid'`); with a token param present, renders the password form.
  - `mfa-verify.spec.ts` — form renders, 6-digit code input present, submit disabled until a valid 6-digit pattern is entered.
  - `accept-invite.spec.ts` — same invalid/valid-token split as reset-password.
- `e2e/smoke.spec.ts` — deleted; superseded by the above.

## 3. CI wiring

`.github/workflows/ci.yml`, `e2e-tests` job: remove `continue-on-error: true` and its explanatory comment. The job becomes a required, blocking check — matches the architecture doc's stated intent ("no accessibility regressions can reach production silently"). No change to the job's steps beyond that; `npm run e2e` already exists and Playwright's own `webServer` config now handles server startup, so no explicit "start backend/frontend" steps are needed.

## Out of scope / explicitly deferred

- Protected-route e2e coverage (needs seeded test-admin + MFA bypass — future item).
- Visual regression testing.
- Cross-browser matrix (Playwright config stays single-browser/chromium for now, matching the existing scaffold).
