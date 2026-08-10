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
