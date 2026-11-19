import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
  });

  test('renders the login form', async ({ page }) => {
    await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
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
