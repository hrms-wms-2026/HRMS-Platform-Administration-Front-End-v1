import { test, expect } from '@playwright/test';

test.describe('Forgot Password', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/forgot-password');
  });

  test('renders the forgot-password form', async ({ page }) => {
    await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
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
