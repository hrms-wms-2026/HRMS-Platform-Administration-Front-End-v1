export const environment = {
  production: false,
  // Relative path, not an absolute https://localhost:7229 URL: the dev server proxies
  // /admin/v1/* to the API (see proxy.conf.json), so the browser only ever talks to
  // admin.localhost:4200. Admin auth cookies are SameSite=Strict, which a cross-origin
  // XHR to a different host (localhost) would silently drop - keeping this same-origin
  // is what makes the cookies actually arrive.
  apiUrl: '/admin/v1',
  wsUrl: 'wss://localhost:7229/ws',
  enableDebugLogs: true,
  appName: 'Platform Administration',
};
