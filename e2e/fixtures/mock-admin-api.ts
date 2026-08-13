import type { Page, Route } from '@playwright/test';

const ADMIN_API = '**/admin/v1/**';

const authContext = {
  platform_user_id: 'e2e-admin-user',
  email: 'admin@example.com',
  platform_role: 'Platform Super Admin',
  expires_at: '2099-01-01T00:00:00Z',
  mfa_required: false,
  permissions: ['platform.system_config.read', 'platform.system_config.manage'],
};

const providers = [
  {
    id: 'p-oauth',
    providerKey: 'github',
    displayName: 'GitHub',
    providerFamily: 'oauth_app',
    configured: true,
    configurationActive: true,
    lastVerifiedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'p-email',
    providerKey: 'resend',
    displayName: 'Resend',
    providerFamily: 'transactional_email',
    configured: true,
    configurationActive: true,
    lastVerifiedAt: '2026-01-01T00:00:00Z',
  },
];

const oauthApps = [
  {
    provider: 'github',
    displayName: 'GitHub',
    appName: 'ONEVO Admin',
    logoUrl: null,
    configured: true,
    isActive: true,
    clientId: 'gh-client-id',
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    defaultScopes: ['read:user'],
    capabilities: ['user_oauth'],
    clientSecretRequired: true,
    hasActiveCredential: true,
    activeCredentialVersion: 1,
    hasPrivateKey: false,
    lastVerifiedAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

const serviceKeys = [
  {
    id: 'k-resend',
    serviceKey: 'resend',
    displayName: 'Resend',
    isActive: true,
    lastVerifiedAt: '2026-01-01T00:00:00Z',
    updatedById: 'e2e-admin-user',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

const integrations = [
  {
    integrationKey: 'github',
    displayName: 'GitHub',
    description: null,
    connectionScope: 'user',
    onevoAppProvider: 'github',
    logoUrl: null,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    linkedModuleKeys: ['work_management'],
  },
];

const paymentGateways = [
  {
    id: 'gw-stripe',
    gatewayKey: 'stripe_us_prod',
    provider: 'stripe',
    environment: 'production',
    displayName: 'Stripe US',
    logoUrl: null,
    publicKey: 'pk_test',
    merchantId: null,
    webhookUrl: null,
    isActive: true,
    hasActiveCredential: true,
    activeCredentialVersion: 1,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    countryRoutes: [{ countryCode: 'US', countryNameSnapshot: 'United States' }],
  },
];

const tenants = {
  items: [
    {
      id: 'tenant-1',
      name: 'Acme Corp',
      slug: 'acme',
      status: 'active',
      createdAt: '2026-01-01T00:00:00Z',
    },
  ],
  total: 1,
  page: 1,
  pageSize: 25,
};

const tenantIntegrations = [
  {
    id: 'cred-1',
    tenantId: 'tenant-1',
    integrationKey: 'github',
    status: 'connected',
    scopesGranted: ['repo'],
    externalAccountId: 'acct-1',
    externalAccountName: 'Acme Org',
    tokenExpiresAt: null,
    lastSyncAt: null,
    connectedAt: '2026-01-01T00:00:00Z',
    connectedByUserId: 'user-1',
    disconnectedAt: null,
    errorMessage: null,
    hasAccessToken: true,
    hasRefreshToken: true,
  },
];

function json(route: Route, body: unknown, status = 200): Promise<void> {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

function pathname(url: string): string {
  return new URL(url).pathname.replace(/^\/admin\/v1/, '') || '/';
}

async function handleAdminApi(route: Route): Promise<void> {
  const request = route.request();
  const method = request.method();
  const path = pathname(request.url());

  if (method === 'GET' && path === '/auth/me') {
    await json(route, authContext);
    return;
  }

  if (method === 'GET' && path === '/system-config/providers') {
    await json(route, providers);
    return;
  }

  if (method === 'GET' && path === '/system-config/oauth-apps') {
    await json(route, oauthApps);
    return;
  }

  if (method === 'GET' && path === '/system-config/service-keys') {
    await json(route, serviceKeys);
    return;
  }

  if (method === 'GET' && path === '/system-config/integrations') {
    await json(route, integrations);
    return;
  }

  if (method === 'GET' && path === '/system-config/payment-gateways') {
    await json(route, paymentGateways);
    return;
  }

  if (method === 'GET' && path === '/tenants') {
    await json(route, tenants);
    return;
  }

  if (method === 'GET' && path === '/system-config/tenant-integrations') {
    await json(route, tenantIntegrations);
    return;
  }

  if (method === 'POST' && path === '/logs') {
    await route.fulfill({ status: 204 });
    return;
  }

  await json(route, { detail: `Unhandled e2e mock: ${method} ${path}` }, 500);
}

/**
 * Installs Playwright network mocks for authenticated System Config smoke tests.
 * Must be called before the first `page.goto()` so `/auth/me` succeeds during bootstrap.
 */
export async function installSystemConfigAdminMocks(page: Page): Promise<void> {
  await page.route(ADMIN_API, handleAdminApi);
}
