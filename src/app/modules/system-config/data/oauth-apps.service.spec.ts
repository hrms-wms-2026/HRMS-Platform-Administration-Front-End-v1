import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { OAuthAppsService } from './oauth-apps.service';
import { environment } from '../../../../environments/environment';

describe('OAuthAppsService', () => {
  let service: OAuthAppsService;
  let httpMock: HttpTestingController;

  const sampleApp = {
    provider: 'github',
    displayName: 'GitHub',
    appName: null,
    logoUrl: null,
    configured: false,
    isActive: false,
    clientId: null,
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    defaultScopes: ['read:user'],
    capabilities: ['user_oauth'],
    clientSecretRequired: true,
    hasActiveCredential: false,
    activeCredentialVersion: null,
    hasPrivateKey: false,
    lastVerifiedAt: null,
    updatedAt: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(OAuthAppsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists all oauth apps', () => {
    let result: unknown;
    service.list().subscribe((apps) => (result = apps));

    const req = httpMock.expectOne(`${environment.apiUrl}/system-config/oauth-apps`);
    expect(req.request.method).toBe('GET');
    req.flush([sampleApp]);
    expect(result).toEqual([sampleApp]);
  });

  it('gets one oauth app by provider', () => {
    let result: unknown;
    service.getById('github').subscribe((app) => (result = app));

    const req = httpMock.expectOne(`${environment.apiUrl}/system-config/oauth-apps/github`);
    expect(req.request.method).toBe('GET');
    req.flush(sampleApp);
    expect(result).toEqual(sampleApp);
  });

  it('configures (upserts) an oauth app', () => {
    service.configure('github', { appName: 'ONEVO', clientId: 'abc123' }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/system-config/oauth-apps/github`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ appName: 'ONEVO', clientId: 'abc123' });
    req.flush({});
  });

  it('rotates the secret without a private key', () => {
    service.rotateSecret('github', 'new-secret').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/system-config/oauth-apps/github/rotate-secret`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ clientSecret: 'new-secret', privateKey: undefined });
    req.flush({});
  });

  it('activates an oauth app', () => {
    service.setActive('github', true).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/system-config/oauth-apps/github/activate`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('deactivates an oauth app', () => {
    service.setActive('github', false).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/system-config/oauth-apps/github/deactivate`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('validates the local configuration', () => {
    let result: unknown;
    service.validateConfig('github').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${environment.apiUrl}/system-config/oauth-apps/github/validate-config`);
    expect(req.request.method).toBe('POST');
    const validation = {
      provider: 'github',
      status: 'valid',
      verificationType: 'local',
      message: 'Configuration looks correct.',
      verifiedAt: '2026-01-01T00:00:00Z',
    };
    req.flush(validation);
    expect(result).toEqual(validation);
  });
});
