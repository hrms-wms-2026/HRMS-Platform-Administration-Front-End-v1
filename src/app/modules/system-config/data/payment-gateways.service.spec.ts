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
});
