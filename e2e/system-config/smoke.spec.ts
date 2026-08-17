import { test, expect } from '../fixtures/authenticated-admin.fixture';

test.describe('System Config smoke (authenticated)', () => {
  test('providers overview renders provider status cards', async ({ page }) => {
    await page.goto('/system-config/providers');

    await expect(page.getByRole('heading', { name: 'Providers Overview' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'OAuth Apps' })).toBeVisible();
    await expect(page.getByText('GitHub', { exact: true })).toBeVisible();
    await expect(page.getByText('Configured').first()).toBeVisible();
  });

  test('oauth apps list renders provider rows', async ({ page }) => {
    await page.goto('/system-config/oauth-apps');

    await expect(page.getByRole('heading', { name: 'OAuth Apps' })).toBeVisible();
    await expect(page.getByRole('button', { name: /GitHub/i })).toBeVisible();
    await expect(page.getByText('Configured').first()).toBeVisible();
  });

  test('service keys list renders table actions', async ({ page }) => {
    await page.goto('/system-config/service-keys');

    await expect(page.getByRole('heading', { name: 'Service Keys' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Service Key' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Verification' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Service Key' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Verify' })).toBeVisible();
    await expect(page.getByText('resend', { exact: true })).toBeVisible();
  });

  test('integration catalog renders table and add action', async ({ page }) => {
    await page.goto('/system-config/integrations');

    await expect(page.getByRole('heading', { name: 'Integration Catalog' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Integration' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'OAuth Provider' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Integration' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'GitHub' }).first()).toBeVisible();
  });

  test('payment gateways list renders table actions', async ({ page }) => {
    await page.goto('/system-config/payment-gateways');

    await expect(page.getByRole('heading', { name: 'Payment Gateways' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Gateway' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Actions' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Gateway' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rotate' })).toBeVisible();
    await expect(page.getByText('Stripe US')).toBeVisible();
  });

  test('tenant integrations renders tenant selector and credential table', async ({ page }) => {
    await page.goto('/system-config/tenant-integrations?tenantId=tenant-1');

    await expect(page.getByRole('heading', { name: 'Tenant Integrations' })).toBeVisible();
    await expect(page.getByLabel('Search Tenants', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Tenant', { exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Integration' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Actions' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Disconnect' })).toBeVisible();
    await expect(page.locator('td .table-primary', { hasText: 'github' })).toBeVisible();
  });
});
