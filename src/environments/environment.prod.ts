import { buildAdminApiUrl, buildAdminWsUrl } from './environment-url.helper';

const { protocol, hostname } = window.location;

export const environment = {
  production: true,
  apiUrl: buildAdminApiUrl(protocol, hostname),
  wsUrl: buildAdminWsUrl(protocol, hostname),
  enableDebugLogs: false,
  appName: 'Platform Administration',
};
