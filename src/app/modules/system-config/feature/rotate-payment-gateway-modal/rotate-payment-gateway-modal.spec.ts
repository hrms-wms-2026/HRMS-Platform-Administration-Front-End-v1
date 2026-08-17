import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { RotatePaymentGatewayModal } from './rotate-payment-gateway-modal';
import { PaymentGatewaysService } from '../../data/payment-gateways.service';
import { PaymentGatewayConfig } from '../../data/payment-gateway.model';

describe('RotatePaymentGatewayModal', () => {
  const gateway: PaymentGatewayConfig = {
    id: 'gw-1',
    gatewayKey: 'stripe_us_prod',
    provider: 'stripe',
    environment: 'production',
    displayName: 'Stripe US',
    logoUrl: null,
    publicKey: null,
    merchantId: null,
    webhookUrl: null,
    isActive: true,
    hasActiveCredential: true,
    activeCredentialVersion: 1,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    countryRoutes: [],
  };

  let paymentGatewaysService: { rotateCredentials: jest.Mock };

  beforeEach(async () => {
    paymentGatewaysService = {
      rotateCredentials: jest.fn().mockReturnValue(of(undefined)),
    };

    await TestBed.configureTestingModule({
      imports: [RotatePaymentGatewayModal],
      providers: [{ provide: PaymentGatewaysService, useValue: paymentGatewaysService }],
    }).compileComponents();
  });

  function setup() {
    const fixture = TestBed.createComponent(RotatePaymentGatewayModal);
    fixture.componentRef.setInput('gateway', gateway);
    fixture.detectChanges();
    return fixture;
  }

  it('rotates credentials and emits rotated', () => {
    const fixture = setup();
    let rotated = false;
    fixture.componentInstance.rotated.subscribe(() => (rotated = true));

    fixture.componentInstance['form'].patchValue({
      secretKey: 'sk_live_new',
      webhookSecret: 'whsec_new',
    });
    fixture.componentInstance['submit']();

    expect(paymentGatewaysService.rotateCredentials).toHaveBeenCalledWith('gw-1', {
      secretKey: 'sk_live_new',
      webhookSecret: 'whsec_new',
    });
    expect(rotated).toBe(true);
  });

  it('shows backend error detail on failure', () => {
    paymentGatewaysService.rotateCredentials.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { detail: 'Invalid secret key.' } })),
    );
    const fixture = setup();

    fixture.componentInstance['form'].patchValue({ secretKey: 'bad' });
    fixture.componentInstance['submit']();

    expect(fixture.componentInstance['errorMessage']()).toBe('Invalid secret key.');
  });

  it('emits closed when cancelled', () => {
    const fixture = setup();
    let closed = false;
    fixture.componentInstance.closed.subscribe(() => (closed = true));

    fixture.componentInstance.cancel();

    expect(closed).toBe(true);
  });
});
