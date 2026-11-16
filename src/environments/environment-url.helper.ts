/**
 * Pure, testable helpers for deriving the backend origin URL in local development.
 *
 * The backend must be reached on the SAME hostname the admin SPA is currently served from
 * (e.g. admin.localhost, not bare localhost) - HostTenantResolutionMiddleware only recognizes
 * "admin"/"console" as an admin-mode subdomain of the request Host header, and just as
 * importantly, the browser only treats the admin_session cookie as same-site (so SameSite=Strict
 * lets it through) when the frontend and backend origins share that exact hostname. Calling a
 * mismatched hostname (e.g. bare "localhost" from an "admin.localhost" page) makes the browser
 * silently drop every Set-Cookie the login/MFA endpoints send.
 *
 * Local development is HTTPS-only (ONEVO.Api/Properties/launchSettings.json has a single "https"
 * profile on port 7229) - there is no local HTTP mode and no port-switching logic, so this always
 * produces https on the fixed local backend port.
 */

/**
 * Production: the API is reverse-proxied on the same origin the admin SPA is served from
 * (e.g. https://admin.<root>/admin/v1), with no port, so the session cookie stays same-site.
 */
export function buildAdminApiUrl(pageProtocol: string, hostname: string): string {
  return `${pageProtocol}//${hostname}/admin/v1`;
}

export function buildAdminWsUrl(pageProtocol: string, hostname: string): string {
  const wsProtocol = pageProtocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${hostname}/ws`;
}

const LOCAL_BACKEND_PORT = 7229;

export function buildLocalApiUrl(hostname: string): string {
  return `https://${hostname}:${LOCAL_BACKEND_PORT}/admin/v1`;
}

export function buildLocalWsUrl(hostname: string): string {
  return `wss://${hostname}:${LOCAL_BACKEND_PORT}/ws`;
}

/** The parts of `window.location` the admin-host redirect reads. */
export type AdminHostLocation = Pick<Location, 'protocol' | 'hostname' | 'port' | 'pathname' | 'search' | 'hash'>;

const ADMIN_SUBDOMAINS = new Set(['admin', 'console']);
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/**
 * Local dev only: where to send the browser when the admin SPA is opened on a host that is not an
 * admin host, or null to stay. The dev server answers on every *.<root> name (Vite skips its
 * allowed-hosts check over HTTPS), so e.g. `dapi.crownus.test:4300` would load this app, call the
 * backend from a tenant host, and every admin call would be refused (403 "Tenant host cannot access
 * admin routes"). The backend only treats "admin"/"console" as admin subdomains (see the helpers
 * above), so this keeps the port, path, query and hash and swaps the subdomain to `admin.<root>`.
 * Loopback names and IP addresses are left alone (e2e serves on plain localhost).
 */
export function buildAdminHostRedirectUrl(location: AdminHostLocation): string | null {
  const host = location.hostname.toLowerCase();
  if (LOOPBACK_HOSTS.has(host) || IPV4.test(host)) {
    return null;
  }

  const labels = host.split('.');
  if (labels.length < 2 || ADMIN_SUBDOMAINS.has(labels[0])) {
    return null;
  }

  // "dapi.crownus.test" -> "crownus.test"; a bare root ("crownus.test") is kept; "*.localhost" -> "localhost".
  const root = labels[labels.length - 1] === 'localhost'
    ? 'localhost'
    : labels.length > 2 ? labels.slice(1).join('.') : host;
  const port = location.port ? `:${location.port}` : '';
  return `${location.protocol}//admin.${root}${port}${location.pathname}${location.search}${location.hash}`;
}
