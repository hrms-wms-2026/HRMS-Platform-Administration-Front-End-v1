import { test, expect } from '@playwright/test';

test.describe('Accept Invite', () => {
  test('shows the invalid-invitation state when no token is present', async ({ page }) => {
    await page.goto('/auth/accept-invite');
    await expect(page.getByRole('heading', { name: 'Invitation not found' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go to sign in' })).toBeVisible();
  });

  test('shows the password form when a token is present', async ({ page }) => {
    await page.goto('/auth/accept-invite?token=e2e-test-token');
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Confirm password', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Activate account' })).toBeVisible();
  });
});
