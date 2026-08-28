import { buildLocalApiUrl, buildLocalWsUrl } from './environment-url.helper';

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
