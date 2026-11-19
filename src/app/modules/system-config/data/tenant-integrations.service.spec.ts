import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TenantIntegrationsService } from './tenant-integrations.service';
import { environment } from '../../../../environments/environment';

describe('TenantIntegrationsService', () => {
  let service: TenantIntegrationsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TenantIntegrationsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists tenant integrations by tenant id', () => {
    let result: unknown;
    service.listByTenant('tenant-1').subscribe((items) => (result = items));

    const req = httpMock.expectOne(
      (request) =>
        request.url === `${environment.apiUrl}/system-config/tenant-integrations` &&
        request.params.get('tenantId') === 'tenant-1',
    );
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        id: 'cred-1',
        tenantId: 'tenant-1',
        integrationKey: 'github',
        status: 'connected',
        scopesGranted: ['repo'],
        externalAccountId: 'acct-1',
        externalAccountName: 'Org',
        tokenExpiresAt: null,
        lastSyncAt: null,
        connectedAt: '2026-01-01T00:00:00Z',
        connectedByUserId: 'user-1',
        disconnectedAt: null,
        errorMessage: null,
        hasAccessToken: true,
        hasRefreshToken: true,
      },
    ]);

    expect(result).toEqual([expect.objectContaining({ integrationKey: 'github', status: 'connected' })]);
  });

  it('disconnects a tenant integration credential', () => {
    let result: unknown;
    service.disconnect('cred-1').subscribe((item) => (result = item));

    const req = httpMock.expectOne(
      `${environment.apiUrl}/system-config/tenant-integrations/cred-1/disconnect`,
    );
    expect(req.request.method).toBe('POST');
    req.flush({
      id: 'cred-1',
      tenantId: 'tenant-1',
      integrationKey: 'github',
      status: 'disconnected',
      scopesGranted: ['repo'],
      externalAccountId: 'acct-1',
      externalAccountName: 'Org',
      tokenExpiresAt: null,
      lastSyncAt: null,
      connectedAt: '2026-01-01T00:00:00Z',
      connectedByUserId: 'user-1',
      disconnectedAt: '2026-02-01T00:00:00Z',
      errorMessage: null,
      hasAccessToken: false,
      hasRefreshToken: false,
    });

    expect(result).toEqual(expect.objectContaining({ status: 'disconnected' }));
  });
});
