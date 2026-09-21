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

const LOCAL_BACKEND_PORT = 7229;

export function buildLocalApiUrl(hostname: string): string {
  return `https://${hostname}:${LOCAL_BACKEND_PORT}/admin/v1`;
}

export function buildLocalWsUrl(hostname: string): string {
  return `wss://${hostname}:${LOCAL_BACKEND_PORT}/ws`;
}
