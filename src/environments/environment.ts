import { buildAdminHostRedirectUrl, buildLocalApiUrl, buildLocalWsUrl } from './environment-url.helper';

const { hostname } = window.location;

export const environment = {
  production: false,
  apiUrl: buildLocalApiUrl(hostname),
  wsUrl: buildLocalWsUrl(hostname),
  enableDebugLogs: true,
  appName: 'Platform Administration',
  /** Set when the dev server was opened on a non-admin host; main.ts redirects before bootstrap. */
  adminHostRedirectUrl: buildAdminHostRedirectUrl(window.location),
};
