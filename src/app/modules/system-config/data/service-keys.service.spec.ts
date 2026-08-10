import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ServiceKeysService } from './service-keys.service';
import { environment } from '../../../../environments/environment';

describe('ServiceKeysService', () => {
  let service: ServiceKeysService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ServiceKeysService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists service keys', () => {
    let result: unknown;
    service.list().subscribe((keys) => (result = keys));

    const req = httpMock.expectOne(`${environment.apiUrl}/system-config/service-keys`);
    expect(req.request.method).toBe('GET');
    const key = {
      id: 'k1',
      serviceKey: 'resend',
      displayName: 'Resend',
      isActive: true,
      lastVerifiedAt: null,
      updatedById: 'u1',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    req.flush([key]);
    expect(result).toEqual([key]);
  });

  it('lists provider options', () => {
    let result: unknown;
    service.listProviders().subscribe((options) => (result = options));

    const req = httpMock.expectOne(`${environment.apiUrl}/system-config/service-key-providers`);
    expect(req.request.method).toBe('GET');
    const option = { providerKey: 'resend', displayName: 'Resend', configured: false, isActive: true };
    req.flush([option]);
    expect(result).toEqual([option]);
  });

  it('creates a service key', () => {
    service.create('resend', 'Resend', 'secret-key').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/system-config/service-keys`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      serviceKey: 'resend',
      displayName: 'Resend',
      apiKey: 'secret-key',
    });
    req.flush({});
  });

  it('updates the display name', () => {
    service.updateDisplayName('resend', 'Resend Prod').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/system-config/service-keys/resend`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ displayName: 'Resend Prod' });
    req.flush({});
  });

  it('rotates the key', () => {
    service.rotateKey('resend', 'new-secret').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/system-config/service-keys/resend/rotate-key`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ apiKey: 'new-secret' });
    req.flush({});
  });

  it('verifies the saved key', () => {
    let result: unknown;
    service.verify('resend').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${environment.apiUrl}/system-config/service-keys/resend/verify`);
    expect(req.request.method).toBe('POST');
    const verification = { success: true, checkedAt: '2026-01-01T00:00:00Z', message: 'OK' };
    req.flush(verification);
    expect(result).toEqual(verification);
  });

  it('activates a service key', () => {
    service.setActive('resend', true).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/system-config/service-keys/resend/activate`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('deactivates a service key', () => {
    service.setActive('resend', false).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/system-config/service-keys/resend/deactivate`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });
});
