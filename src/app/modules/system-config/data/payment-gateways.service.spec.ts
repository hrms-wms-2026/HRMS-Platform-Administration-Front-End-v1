import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PaymentGatewaysService } from './payment-gateways.service';
import { environment } from '../../../../environments/environment';

describe('PaymentGatewaysService', () => {
  let service: PaymentGatewaysService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PaymentGatewaysService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists payment gateways', () => {
    let result: unknown;
    service.list().subscribe((items) => (result = items));

    const req = httpMock.expectOne(`${environment.apiUrl}/system-config/payment-gateways`);
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        id: 'gw-1',
        gatewayKey: 'stripe_us_prod',
        provider: 'stripe',
        environment: 'production',
        displayName: 'Stripe US',
        logoUrl: null,
        publicKey: 'pk_test',
        merchantId: null,
        webhookUrl: null,
        isActive: true,
        hasActiveCredential: true,
        activeCredentialVersion: 1,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        countryRoutes: [],
      },
    ]);

    expect(result).toEqual([
      expect.objectContaining({ gatewayKey: 'stripe_us_prod', provider: 'stripe' }),
    ]);
  });

  it('updates payment gateway metadata', () => {
    let result: unknown;
    service
      .update('gw-1', {
        displayName: 'Stripe Global',
        isActive: false,
        countryCodes: ['US', 'GB'],
        countryNameSnapshots: ['United States', 'United Kingdom of Great Britain and Northern Ireland'],
      })
      .subscribe((item) => (result = item));

    const req = httpMock.expectOne(`${environment.apiUrl}/system-config/payment-gateways/gw-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      displayName: 'Stripe Global',
      isActive: false,
      countryCodes: ['US', 'GB'],
      countryNameSnapshots: ['United States', 'United Kingdom of Great Britain and Northern Ireland'],
    });
    req.flush({
      id: 'gw-1',
      gatewayKey: 'stripe_us_prod',
      provider: 'stripe',
      environment: 'production',
      displayName: 'Stripe Global',
      logoUrl: null,
      publicKey: 'pk_test',
      merchantId: null,
      webhookUrl: null,
      isActive: false,
      hasActiveCredential: true,
      activeCredentialVersion: 1,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
      countryRoutes: [],
    });

    expect(result).toEqual(expect.objectContaining({ displayName: 'Stripe Global', isActive: false }));
  });

  it('lists payment gateway providers', () => {
    let result: unknown;
    service.listProviders().subscribe((items) => (result = items));

    const req = httpMock.expectOne(`${environment.apiUrl}/system-config/payment-gateway-providers`);
    expect(req.request.method).toBe('GET');
    req.flush([{ providerKey: 'stripe', displayName: 'Stripe', configured: false, isActive: true }]);
    expect(result).toEqual([expect.objectContaining({ providerKey: 'stripe' })]);
  });

  it('verifies gateway credentials', () => {
    let result: unknown;
    service.verifyCredentials('stripe', 'sk_test').subscribe((response) => (result = response));

    const req = httpMock.expectOne(`${environment.apiUrl}/system-config/payment-gateways/verify`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      provider: 'stripe',
      credentials: { secret_key: 'sk_test' },
    });
    req.flush({ isVerified: true, accountName: 'Acme', defaultCurrency: 'USD', errorMessage: null });
    expect(result).toEqual(expect.objectContaining({ isVerified: true, accountName: 'Acme' }));
  });

  it('creates a payment gateway', () => {
    service
      .create({
        gatewayKey: 'stripe_us_prod',
        provider: 'stripe',
        environment: 'production',
        displayName: 'Stripe US',
        secretKey: 'sk_live',
        countryCodes: ['US'],
        countryNameSnapshots: ['United States of America'],
        isActive: true,
      })
      .subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/system-config/payment-gateways`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 'gw-1', gatewayKey: 'stripe_us_prod' });
  });

  it('rotates gateway credentials', () => {
    service.rotateCredentials('gw-1', { secretKey: 'sk_live_new' }).subscribe();

    const req = httpMock.expectOne(
      `${environment.apiUrl}/system-config/payment-gateways/gw-1/credentials/rotate`,
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ secretKey: 'sk_live_new' });
    req.flush(null);
  });

  it('resolves a gateway for country and environment', () => {
    service.resolveForCountry('US', 'production').subscribe();

    const req = httpMock.expectOne(
      (request) =>
        request.url === `${environment.apiUrl}/payment-gateways/resolve` &&
        request.params.get('country') === 'US' &&
        request.params.get('environment') === 'production',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ gatewayKey: 'stripe_us_prod' });
  });
});
