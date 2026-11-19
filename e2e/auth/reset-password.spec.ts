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
    await expect(page.getByLabel('New password', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Confirm password', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reset password' })).toBeDisabled();
  });
});
