import {
  AdminHostLocation,
  buildAdminHostRedirectUrl,
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

describe('buildAdminHostRedirectUrl (local dev - keep the SPA on an admin host)', () => {
  const at = (hostname: string, port = '4300', pathname = '/auth/login', search = '', hash = ''): AdminHostLocation => ({
    protocol: 'https:', hostname, port, pathname, search, hash,
  });

  it('sends a tenant subdomain to the admin subdomain of the same root, keeping port, path, query and hash', () => {
    expect(buildAdminHostRedirectUrl(at('dapi.crownus.test', '4300', '/tenants', '?page=2', '#top'))).toBe(
      'https://admin.crownus.test:4300/tenants?page=2#top',
    );
  });

  it('sends the bare root domain to its admin subdomain', () => {
    expect(buildAdminHostRedirectUrl(at('crownus.test'))).toBe('https://admin.crownus.test:4300/auth/login');
  });

  it('sends a tenant subdomain of localhost to admin.localhost', () => {
    expect(buildAdminHostRedirectUrl(at('acme.localhost'))).toBe('https://admin.localhost:4300/auth/login');
  });

  it('leaves admin and console hosts alone, in any letter case', () => {
    expect(buildAdminHostRedirectUrl(at('admin.crownus.test'))).toBeNull();
    expect(buildAdminHostRedirectUrl(at('Admin.Crownus.test'))).toBeNull();
    expect(buildAdminHostRedirectUrl(at('console.crownus.test'))).toBeNull();
    expect(buildAdminHostRedirectUrl(at('admin.localhost'))).toBeNull();
  });

  it('leaves loopback names and IP addresses alone (e2e serves on plain localhost)', () => {
    expect(buildAdminHostRedirectUrl(at('localhost'))).toBeNull();
    expect(buildAdminHostRedirectUrl(at('127.0.0.1'))).toBeNull();
    expect(buildAdminHostRedirectUrl(at('192.168.1.20'))).toBeNull();
  });

  it('omits the port when the page has none', () => {
    expect(buildAdminHostRedirectUrl(at('dapi.crownus.test', ''))).toBe('https://admin.crownus.test/auth/login');
  });
});
