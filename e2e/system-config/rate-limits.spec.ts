import type { Page, Route } from '@playwright/test';
import { test, expect } from '../fixtures/authenticated-admin.fixture';

/**
 * Improvements task 48: an admin changes the global SignedIn limit, sees the new value and a
 * history row, then resets it to the default. The admin API is mocked with a small in-memory
 * store (like the other e2e tests), so the page's reload-after-save path is exercised for real.
 */
interface Change {
  id: string;
  changedAt: string;
  platformUserId: string;
  platformUserName: string;
  scope: 'global';
  limitName: string;
  oldPerMinute: number | null;
  oldBurst: number | null;
  newPerMinute: number | null;
  newBurst: number | null;
  reason: string;
}

const signedInDefault = { perMinute: 600, burst: 100 };

async function installRateLimitApi(page: Page) {
  let override: { perMinute: number; burst: number; rowVersion: string } | null = null;
  const changes: Change[] = [];
  const requests: { method: string; body: unknown }[] = [];

  const limits = () => [
    {
      limitName: 'SignedIn',
      algorithm: 'token_bucket',
      override: override && {
        perMinute: override.perMinute,
        burst: override.burst,
        updatedAt: '2026-11-21T10:00:00Z',
        updatedByPlatformUserId: 'e2e-admin-user',
        rowVersion: override.rowVersion,
      },
      appSettings: signedInDefault,
      effective: override ? { perMinute: override.perMinute, burst: override.burst } : signedInDefault,
      effectiveSource: override ? 'global' : 'appsettings',
      bounds: { minPerMinute: 120, maxPerMinute: 3000, minBurst: 30, maxBurst: 500 },
    },
    {
      limitName: 'Anonymous',
      algorithm: 'sliding_window',
      appSettings: { perMinute: 300 },
      effective: { perMinute: 300 },
      effectiveSource: 'appsettings',
      bounds: { minPerMinute: 60, maxPerMinute: 1200 },
    },
  ];

  const record = (before: typeof override, after: typeof override, reason: string) =>
    changes.unshift({
      id: `c${changes.length + 1}`,
      changedAt: new Date().toISOString(),
      platformUserId: 'e2e-admin-user',
      platformUserName: 'E2E Admin',
      scope: 'global',
      limitName: 'SignedIn',
      oldPerMinute: before?.perMinute ?? null,
      oldBurst: before?.burst ?? null,
      newPerMinute: after?.perMinute ?? null,
      newBurst: after?.burst ?? null,
      reason,
    });

  await page.route('**/admin/v1/system-config/rate-limits**', async (route: Route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^\/admin\/v1/, '');
    const method = request.method();
    const json = (body: unknown) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

    if (method === 'GET' && path === '/system-config/rate-limits') return json(limits());
    if (method === 'GET' && path === '/system-config/rate-limits/changes') {
      return json({ items: changes, pageNumber: 1, pageSize: 10, totalCount: changes.length });
    }
    if (path === '/system-config/rate-limits/SignedIn' && (method === 'PUT' || method === 'DELETE')) {
      const body = request.postDataJSON() as { perMinute?: number; burst?: number; reason: string; rowVersion: string | null };
      requests.push({ method, body });
      const before = override;
      override = method === 'PUT' ? { perMinute: body.perMinute!, burst: body.burst!, rowVersion: `v${changes.length + 1}` } : null;
      record(before, override, body.reason);
      return json({});
    }
    return route.fulfill({ status: 500, body: `Unhandled rate limit mock: ${method} ${path}` });
  });

  return { requests };
}

test('an admin changes the global signed-in limit and resets it, with history', async ({ page }) => {
  const api = await installRateLimitApi(page);
  await page.goto('/system-config/rate-limits');

  await expect(page.getByRole('heading', { name: 'Rate Limits' })).toBeVisible();
  const signedIn = page.locator('[data-limit="SignedIn"]');
  await expect(signedIn.getByTestId('effective-per-minute')).toHaveText('600');
  await expect(page.getByText('No changes yet')).toBeVisible();

  await signedIn.getByRole('button', { name: 'Edit' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Limits are counted per API server')).toBeVisible();
  await dialog.getByTestId('rate-limit-per-minute').fill('900');
  await dialog.getByTestId('rate-limit-burst').fill('150');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog.getByText('A reason is required.')).toBeVisible();
  await dialog.getByTestId('rate-limit-reason').fill('Customer import week');
  await dialog.getByRole('button', { name: 'Save' }).click();

  await expect(dialog).toBeHidden();
  await expect(signedIn.getByTestId('effective-per-minute')).toHaveText('900');
  const history = page.getByTestId('rate-limit-changes-table');
  await expect(history.getByText('Customer import week')).toBeVisible();
  await expect(history.getByText('default → 900/min, burst 150')).toBeVisible();

  await signedIn.getByRole('button', { name: 'Reset to default' }).click();
  await page.getByRole('dialog').getByTestId('rate-limit-reason').fill('Import finished');
  await page.getByRole('dialog').getByRole('button', { name: 'Remove override' }).click();

  await expect(signedIn.getByTestId('effective-per-minute')).toHaveText('600');
  await expect(history.getByText('900/min, burst 150 → default')).toBeVisible();
  expect(api.requests).toEqual([
    { method: 'PUT', body: { perMinute: 900, burst: 150, reason: 'Customer import week', rowVersion: null } },
    { method: 'DELETE', body: { reason: 'Import finished', rowVersion: 'v1' } },
  ]);
});
