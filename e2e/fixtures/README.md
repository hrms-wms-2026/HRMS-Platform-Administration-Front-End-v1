# E2E fixtures

Protected Platform Admin routes require an authenticated session. The backend is not
started in CI or local Playwright runs, so authenticated specs use **Playwright network
mocks** instead of real login or Google SSO.

## Pattern

1. `mock-admin-api.ts` — registers `page.route()` handlers for `**/admin/v1/**` endpoints.
2. `authenticated-admin.fixture.ts` — extends Playwright `test` so every spec gets a
   `page` with mocks installed **before** the first navigation (required for the Angular
   `SessionInitializerService` `/auth/me` bootstrap).

## Usage

```typescript
import { test, expect } from '../fixtures/authenticated-admin.fixture';

test('my protected page smoke', async ({ page }) => {
  await page.goto('/system-config/service-keys');
  await expect(page.getByRole('heading', { name: 'Service Keys' })).toBeVisible();
});
```

## Auth mock

`GET /admin/v1/auth/me` returns a platform super-admin context with
`platform.system_config.read` and `platform.system_config.manage`. No cookies or SSO flow
is exercised.

## Extending mocks

Add handlers in `installSystemConfigAdminMocks()` (or a dedicated helper) for new API
calls your page issues on load. Unhandled admin API requests fail the test run with a
500 stub so missing mocks are obvious.
