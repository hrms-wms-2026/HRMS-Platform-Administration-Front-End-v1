# E2E + Accessibility Tests for Public Auth Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder Playwright scaffold with real e2e + axe-core accessibility specs for the 5 public (unauthenticated) auth routes, running against a certificate-free CI dev server, and turn the CI `e2e-tests` job into a required (blocking) gate.

**Architecture:** Playwright's `webServer` config auto-starts a new SSL-free `ng serve --configuration e2e` build so no backend, database, or `.certs/` cert is needed. One `accessibility.spec.ts` axe-core sweep covers all 5 routes; one functional spec per route covers rendering and client-side validation/navigation behavior using accessible (`getByRole`/`getByLabel`) locators.

**Tech Stack:** Angular 21, `@playwright/test` ^1.61.1, `@axe-core/playwright` ^4.12.1.

## Global Constraints

- Scope is the 5 public routes only: `/auth/login`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/mfa-verify`, `/auth/accept-invite`. Protected routes are explicitly out of scope.
- No backend/API calls of any kind in these specs — every assertion is about client-side rendering, form state, or client-side routing.
- Locator style: `getByRole`/`getByLabel` (accessible locators), matching the architecture doc's own example style.
- The CI `e2e-tests` job becomes a required/blocking check — remove `continue-on-error: true`.
- Repo root: `C:\Users\User\OneDrive\Desktop\onexso\platform-administration`. Branch: `feature/e2e-accessibility-public-routes` (already created off up-to-date `origin/development`; spec doc already committed there).

---

### Task 1: CI-safe e2e dev server

**Files:**
- Modify: `angular.json` (add `architect.serve.configurations.e2e`)
- Modify: `playwright.config.ts`

**Interfaces:**
- Produces: an `http://localhost:4300` server, startable via `ng serve --configuration e2e --port 4300`, that all later tasks' specs load pages from through Playwright's `baseURL`.

- [ ] **Step 1: Add the `e2e` serve configuration to `angular.json`**

Find this block (inside `projects.platform-administration.architect.serve`):

```json
        "serve": {
          "builder": "@angular/build:dev-server",
          "options": {
            "allowedHosts": ["admin.localhost"],
            "ssl": true,
            "sslCert": ".certs/localhost-cert.pem",
            "sslKey": ".certs/localhost-key.pem"
          },
          "configurations": {
            "production": {
              "buildTarget": "platform-administration:build:production"
            },
            "staging": {
              "buildTarget": "platform-administration:build:staging"
            },
            "development": {
              "buildTarget": "platform-administration:build:development"
            }
          },
          "defaultConfiguration": "development"
        },
```

Replace with (adds an `e2e` key to `configurations`):

```json
        "serve": {
          "builder": "@angular/build:dev-server",
          "options": {
            "allowedHosts": ["admin.localhost"],
            "ssl": true,
            "sslCert": ".certs/localhost-cert.pem",
            "sslKey": ".certs/localhost-key.pem"
          },
          "configurations": {
            "production": {
              "buildTarget": "platform-administration:build:production"
            },
            "staging": {
              "buildTarget": "platform-administration:build:staging"
            },
            "development": {
              "buildTarget": "platform-administration:build:development"
            },
            "e2e": {
              "buildTarget": "platform-administration:build:development",
              "ssl": false,
              "allowedHosts": true
            }
          },
          "defaultConfiguration": "development"
        },
```

The `e2e` configuration overrides `ssl`/`allowedHosts` from the base `options` block and drops `sslCert`/`sslKey` (irrelevant once `ssl` is `false`), so no `.certs/` files are needed to serve.

- [ ] **Step 2: Add `webServer` and `baseURL` to `playwright.config.ts`**

Replace the full file content:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4300',
  },
  webServer: {
    command: 'ng serve --configuration e2e --port 4300',
    url: 'http://localhost:4300',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 3: Run the existing placeholder spec to prove the server auto-starts**

Run: `npm run e2e`
Expected: PASS (1 test) — `e2e/smoke.spec.ts`'s placeholder assertion runs successfully, proving Playwright can start `ng serve --configuration e2e` and reach `http://localhost:4300`. This may take 30–60s the first time while Angular builds.

- [ ] **Step 4: Commit**

```bash
git add angular.json playwright.config.ts
git commit -m "feat: add CI-safe SSL-free e2e serve configuration"
```

---

### Task 2: Accessibility sweep

**Files:**
- Create: `e2e/accessibility.spec.ts`
- Delete: `e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: the `e2e`-configured dev server from Task 1 (via `playwright.config.ts`'s `webServer`/`baseURL`).

- [ ] **Step 1: Delete the placeholder spec**

```bash
rm e2e/smoke.spec.ts
```

- [ ] **Step 2: Write `e2e/accessibility.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const publicRoutes = [
  '/auth/login',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/mfa-verify',
  '/auth/accept-invite',
];

for (const route of publicRoutes) {
  test(`${route} — no WCAG 2.1 AA violations`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);
  });
}
```

- [ ] **Step 3: Run it**

Run: `npx playwright test e2e/accessibility.spec.ts`
Expected: PASS (5 tests, one per route)

- [ ] **Step 4: Commit**

```bash
git add e2e/accessibility.spec.ts
git rm e2e/smoke.spec.ts
git commit -m "test: add axe-core WCAG 2.1 AA sweep for public auth routes"
```

---

### Task 3: Login e2e spec

**Files:**
- Create: `e2e/auth/login.spec.ts`

**Interfaces:**
- Consumes: `/auth/login` rendered by `src/app/modules/auth/feature/login/login.html` — email input `id="email"` (label text "Email"), password input `id="password"` (label text "Password"), submit button labeled "Sign In" bound to `[disabled]="loginForm.invalid"`, a "Forgot password?" button that calls `goToForgotPassword()` → `router.navigateByUrl('/auth/forgot-password')`.

- [ ] **Step 1: Write `e2e/auth/login.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
  });

  test('renders the login form', async ({ page }) => {
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('disables submit while the form is empty', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeDisabled();
  });

  test('navigates to forgot-password', async ({ page }) => {
    await page.getByRole('button', { name: 'Forgot password?' }).click();
    await expect(page).toHaveURL(/\/auth\/forgot-password$/);
  });
});
```

Each test gets an isolated browser context (Playwright Test's default `page` fixture), so the `onevo_admin_remembered_email` localStorage key from `login.ts`'s `readRememberedEmail()` is always empty here — the email field starts blank, and the form starts invalid.

- [ ] **Step 2: Run it**

Run: `npx playwright test e2e/auth/login.spec.ts`
Expected: PASS (3 tests)

- [ ] **Step 3: Commit**

```bash
git add e2e/auth/login.spec.ts
git commit -m "test: add login page e2e spec"
```

---

### Task 4: Forgot-password e2e spec

**Files:**
- Create: `e2e/auth/forgot-password.spec.ts`

**Interfaces:**
- Consumes: `/auth/forgot-password` rendered by `src/app/modules/auth/feature/forgot-password/forgot-password.html` — email input `id="email"` (label text "Email"), submit button labeled "Send Reset Link" bound to `[disabled]="forgotPasswordForm.invalid"`, a "Back to sign in" button that calls `goToLogin()` → `router.navigateByUrl('/auth/login')`.

- [ ] **Step 1: Write `e2e/auth/forgot-password.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Forgot Password', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/forgot-password');
  });

  test('renders the forgot-password form', async ({ page }) => {
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send Reset Link' })).toBeVisible();
  });

  test('disables submit while the email is empty', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Send Reset Link' })).toBeDisabled();
  });

  test('navigates back to sign in', async ({ page }) => {
    await page.getByRole('button', { name: 'Back to sign in' }).click();
    await expect(page).toHaveURL(/\/auth\/login$/);
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx playwright test e2e/auth/forgot-password.spec.ts`
Expected: PASS (3 tests)

- [ ] **Step 3: Commit**

```bash
git add e2e/auth/forgot-password.spec.ts
git commit -m "test: add forgot-password page e2e spec"
```

---

### Task 5: Reset-password e2e spec

**Files:**
- Create: `e2e/auth/reset-password.spec.ts`

**Interfaces:**
- Consumes: `/auth/reset-password` rendered by `src/app/modules/auth/feature/reset-password/reset-password.html`. `reset-password.ts`'s `ngOnInit` reads the `token` query param and sets `view` to `'invalid'` when absent (rendering the `<p>This reset link has expired or is no longer valid.</p>` + "Request a new link" button), or captures the token and leaves `view` at `'form'` when present (rendering `id="newPassword"`/`id="confirmPassword"` inputs, labels "New password"/"Confirm password", submit button "Reset password" bound to `[disabled]="resetPasswordForm.invalid"`). The token is stripped from the visible URL immediately after being read, but that happens after capture, so passing `?token=...` still renders the form.

- [ ] **Step 1: Write `e2e/auth/reset-password.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Reset Password', () => {
  test('shows the invalid-link state when no token is present', async ({ page }) => {
    await page.goto('/auth/reset-password');
    await expect(
      page.getByText('This reset link has expired or is no longer valid.'),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Request a new link' })).toBeVisible();
  });

  test('shows the password form when a token is present', async ({ page }) => {
    await page.goto('/auth/reset-password?token=e2e-test-token');
    await expect(page.getByLabel('New password')).toBeVisible();
    await expect(page.getByLabel('Confirm password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reset password' })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx playwright test e2e/auth/reset-password.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 3: Commit**

```bash
git add e2e/auth/reset-password.spec.ts
git commit -m "test: add reset-password page e2e spec"
```

---

### Task 6: MFA-verify e2e spec

**Files:**
- Create: `e2e/auth/mfa-verify.spec.ts`

**Interfaces:**
- Consumes: `/auth/mfa-verify` rendered by `src/app/modules/auth/feature/mfa-verify/mfa-verify.html` — code input `id="code"` (label text "Enter the 6-digit code from your authenticator app"), submit button "Verify" bound to `[disabled]="codeForm.invalid"`.

**Important constraint:** `mfa-verify.ts` has an `effect()` that auto-calls `submit()` — which calls `authService.verifyMfa(code)`, a real HTTP request to `environment.apiUrl` — the instant the code field holds a full, pattern-valid 6-digit value. There is no backend running in this e2e setup (by design, per the global constraints), so **never fill a complete valid 6-digit code** in this spec. Test the disabled state with incomplete/invalid input only.

- [ ] **Step 1: Write `e2e/auth/mfa-verify.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

test.describe('MFA Verify', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/mfa-verify');
  });

  test('renders the code input', async ({ page }) => {
    await expect(
      page.getByLabel('Enter the 6-digit code from your authenticator app'),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Verify' })).toBeVisible();
  });

  test('disables submit for incomplete or invalid codes', async ({ page }) => {
    // Never fill a complete valid 6-digit numeric code here: mfa-verify.ts auto-submits
    // on a valid code, firing a real HTTP call to environment.apiUrl. No backend runs
    // in this e2e setup, so that would be a flaky/failing network call, not a UI check.
    const codeInput = page.getByLabel('Enter the 6-digit code from your authenticator app');
    const verifyButton = page.getByRole('button', { name: 'Verify' });

    await expect(verifyButton).toBeDisabled();

    await codeInput.fill('123');
    await expect(verifyButton).toBeDisabled();

    await codeInput.fill('12a456');
    await expect(verifyButton).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx playwright test e2e/auth/mfa-verify.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 3: Commit**

```bash
git add e2e/auth/mfa-verify.spec.ts
git commit -m "test: add mfa-verify page e2e spec"
```

---

### Task 7: Accept-invite e2e spec

**Files:**
- Create: `e2e/auth/accept-invite.spec.ts`

**Interfaces:**
- Consumes: `/auth/accept-invite` rendered by `src/app/modules/auth/feature/accept-invite/accept-invite.html`. `accept-invite.ts`'s `ngOnInit` sets `view` to `'invalid'` when no `token` query param is present (rendering `<h1>Invitation not found</h1>` + "Go to sign in" button), or leaves `view` at `'form'` when a token is present (rendering `id="password"`/`id="confirmPassword"` inputs, both labeled "Password"/"Confirm password" respectively, submit button "Activate account").

**Note:** unlike the other 4 routes, this submit button has no `[disabled]` binding at all (`Button`'s `disabled` input defaults to `false`, and `accept-invite.html` never passes it) — so there is no disabled-state assertion to make here; `submit()` guards invalid submissions internally instead (`markAllAsTouched()` + early return, no HTTP call).

- [ ] **Step 1: Write `e2e/auth/accept-invite.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Accept Invite', () => {
  test('shows the invalid-invitation state when no token is present', async ({ page }) => {
    await page.goto('/auth/accept-invite');
    await expect(page.getByRole('heading', { name: 'Invitation not found' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go to sign in' })).toBeVisible();
  });

  test('shows the password form when a token is present', async ({ page }) => {
    await page.goto('/auth/accept-invite?token=e2e-test-token');
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByLabel('Confirm password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Activate account' })).toBeVisible();
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx playwright test e2e/auth/accept-invite.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 3: Commit**

```bash
git add e2e/auth/accept-invite.spec.ts
git commit -m "test: add accept-invite page e2e spec"
```

---

### Task 8: Make the CI e2e job a required gate + full verification

**Files:**
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: all specs from Tasks 2–7, the `webServer` config from Task 1.

- [ ] **Step 1: Remove `continue-on-error` from the `e2e-tests` job**

Find:

```yaml
  # Known gap: nothing here starts the backend or the frontend for Playwright to drive,
  # so e2e/ only has a placeholder spec for now. Non-blocking (continue-on-error) so it
  # isn't part of the required status check for branch protection.
  e2e-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    continue-on-error: true
    needs: build-and-test
```

Replace with:

```yaml
  e2e-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    needs: build-and-test
```

The rest of the job (checkout, Setup Node, `npm ci`, `npx playwright install --with-deps`, `npm run e2e`) is unchanged — Playwright's own `webServer` config (Task 1) starts the app, so no explicit server-startup step is needed.

- [ ] **Step 2: Run the full verification suite**

Run each of these from the repo root and confirm all pass:

```bash
npm run e2e
```
Expected: PASS (17 tests total — 5 accessibility + 3 login + 3 forgot-password + 2 reset-password + 2 mfa-verify + 2 accept-invite)

```bash
npm test
```
Expected: PASS (116 tests, unaffected by this change)

```bash
npm run build
```
Expected: builds cleanly, unaffected by this change

```bash
npm run lint
```
Expected: no errors, unaffected by this change

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: make e2e accessibility/functional tests a required gate"
```

---

## Final Step

After Task 8, use superpowers:finishing-a-development-branch to verify the full test suite one more time and present merge/PR/keep options.
