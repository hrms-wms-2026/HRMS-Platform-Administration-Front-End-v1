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
