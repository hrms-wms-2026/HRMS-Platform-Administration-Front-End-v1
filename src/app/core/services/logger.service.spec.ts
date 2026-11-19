import { LoggerService } from './logger.service';
import { environment } from '../../../environments/environment';

function setCsrfCookie(value: string | null): void {
  document.cookie = 'admin_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  if (value !== null) {
    document.cookie = `admin_csrf=${value}; path=/`;
  }
}

describe('LoggerService', () => {
  let service: LoggerService;
  let fetchSpy: jest.Mock;
  const originalFetch = global.fetch;

  beforeEach(() => {
    service = new LoggerService();
    fetchSpy = jest.fn().mockResolvedValue(undefined);
    global.fetch = fetchSpy;
    setCsrfCookie(null);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    setCsrfCookie(null);
  });

  it('reports error-level logs to the backend', () => {
    service.error('Something broke', { route: '/tenants' });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe(`${environment.apiUrl}/logs`);
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');

    const body = JSON.parse(init.body as string);
    expect(body.level).toBe('error');
    expect(body.message).toBe('Something broke');
    expect(body.context).toEqual({ route: '/tenants' });
    expect(typeof body.timestamp).toBe('string');
  });

  it('attaches the CSRF header when the admin_csrf cookie is present', () => {
    setCsrfCookie('csrf-token-value');

    service.error('Something broke');

    const [, init] = fetchSpy.mock.calls[0];
    expect(init.headers['X-CSRF-Token']).toBe('csrf-token-value');
  });

  it('omits the CSRF header when no admin_csrf cookie is present', () => {
    service.error('Something broke');

    const [, init] = fetchSpy.mock.calls[0];
    expect(init.headers['X-CSRF-Token']).toBeUndefined();
  });

  it('does not report warn/info/debug logs to the backend', () => {
    service.warn('a warning');
    service.info('some info');
    service.debug('debug detail');

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('does not throw when the report request fails', async () => {
    fetchSpy.mockRejectedValue(new Error('network down'));

    expect(() => service.error('Something broke')).not.toThrow();
    await Promise.resolve();
  });
});
