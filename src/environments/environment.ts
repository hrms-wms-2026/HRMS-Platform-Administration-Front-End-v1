import { buildLocalApiUrl, buildLocalWsUrl } from './environment-url.helper';

const { hostname } = window.location;

export const environment = {
  production: false,
  apiUrl: buildLocalApiUrl(hostname),
  wsUrl: buildLocalWsUrl(hostname),
  enableDebugLogs: true,
  appName: 'Platform Administration',
};
