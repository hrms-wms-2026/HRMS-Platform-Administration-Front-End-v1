import { test as base, expect } from '@playwright/test';
import { installSystemConfigAdminMocks } from './mock-admin-api';

/**
 * Playwright test fixture for authenticated Platform Admin pages without a live backend
 * or Google SSO. Network mocks are registered before the page is used so Angular session
 * bootstrap (`GET /auth/me`) succeeds on first navigation.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await installSystemConfigAdminMocks(page);
    await use(page);
  },
});

export { expect };
