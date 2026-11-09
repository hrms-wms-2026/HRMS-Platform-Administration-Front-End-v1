import {
  buildAdminApiUrl,
  buildAdminWsUrl,
  buildLocalApiUrl,
  buildLocalWsUrl,
} from './environment-url.helper';

describe('buildAdminApiUrl (production - same origin as the admin SPA)', () => {
  it('targets /admin/v1 on the page hostname with no port', () => {
    expect(buildAdminApiUrl('https:', 'admin.9-223-115-62.sslip.io')).toBe(
      'https://admin.9-223-115-62.sslip.io/admin/v1',
    );
  });
});

describe('buildAdminWsUrl (production - same origin as the admin SPA)', () => {
  it('uses wss on an https page', () => {
    expect(buildAdminWsUrl('https:', 'admin.9-223-115-62.sslip.io')).toBe(
      'wss://admin.9-223-115-62.sslip.io/ws',
    );
  });

  it('uses ws on an http page', () => {
    expect(buildAdminWsUrl('http:', 'localhost')).toBe('ws://localhost/ws');
  });
});

describe('buildLocalApiUrl (local dev - HTTPS-only, fixed backend port 7229)', () => {
  it('preserves the admin subdomain hostname, so the request stays same-site as the SPA', () => {
    expect(buildLocalApiUrl('admin.localhost')).toBe('https://admin.localhost:7229/admin/v1');
  });

  it('builds an https apiUrl on the fixed local backend port for bare localhost', () => {
    expect(buildLocalApiUrl('localhost')).toBe('https://localhost:7229/admin/v1');
  });

  it('always produces an https url, never http', () => {
    expect(buildLocalApiUrl('admin.localhost')).toMatch(/^https:\/\//);
  });
});

describe('buildLocalWsUrl (local dev - HTTPS-only, fixed backend port 7229)', () => {
  it('preserves the admin subdomain hostname', () => {
    expect(buildLocalWsUrl('admin.localhost')).toBe('wss://admin.localhost:7229/ws');
  });

  it('always produces a wss url, never plain ws', () => {
    expect(buildLocalWsUrl('admin.localhost')).toMatch(/^wss:\/\//);
  });
});
