export const environment = {
  production: false,
  apiUrl: 'https://staging-api.platform-administration.com/admin/v1',
  wsUrl: 'wss://staging-api.platform-administration.com/ws',
  enableDebugLogs: true,
  appName: 'Platform Administration (Staging)',
  /** The admin SPA is only served on the admin host here; no redirect. */
  adminHostRedirectUrl: null as string | null,
};