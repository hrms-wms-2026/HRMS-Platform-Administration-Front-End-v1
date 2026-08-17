import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { EditPaymentGatewayModal } from './edit-payment-gateway-modal';
import { PaymentGatewaysService } from '../../data/payment-gateways.service';
import { PaymentGatewayConfig } from '../../data/payment-gateway.model';

describe('EditPaymentGatewayModal', () => {
  const gateway: PaymentGatewayConfig = {
    id: 'gw-1',
    gatewayKey: 'stripe_us_prod',
    provider: 'stripe',
    environment: 'production',
    displayName: 'Stripe US',
    logoUrl: null,
    publicKey: 'pk_live',
    merchantId: 'merchant-1',
    webhookUrl: 'https://example.com/webhook',
    isActive: true,
    hasActiveCredential: true,
    activeCredentialVersion: 2,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    countryRoutes: [
      {
        id: 'r1',
        countryCode: 'US',
        countryNameSnapshot: 'United States',
        environment: 'production',
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
      },
    ],
  };

  let paymentGatewaysService: { update: jest.Mock };

  beforeEach(async () => {
    paymentGatewaysService = {
      update: jest.fn().mockReturnValue(of({ ...gateway, displayName: 'Stripe Global' })),
    };

    await TestBed.configureTestingModule({
      imports: [EditPaymentGatewayModal],
      providers: [{ provide: PaymentGatewaysService, useValue: paymentGatewaysService }],
    }).compileComponents();
  });

  function setup() {
    const fixture = TestBed.createComponent(EditPaymentGatewayModal);
    fixture.componentRef.setInput('gateway', gateway);
    fixture.detectChanges();
    return fixture;
  }

  it('prefills editable metadata without secret fields', () => {
    const fixture = setup();

    expect(fixture.nativeElement.textContent).toContain('Edit Payment Gateway');
    expect(fixture.nativeElement.textContent).not.toContain('Secret Key');
    expect(fixture.componentInstance['form'].controls.displayName.value).toBe('Stripe US');
    expect(fixture.componentInstance['form'].controls.countryCodes.value).toBe('US');
  });

  it('saves updated metadata and country routes without isActive', () => {
    const fixture = setup();
    let updated = false;
    fixture.componentInstance.updated.subscribe(() => (updated = true));

    fixture.componentInstance['form'].patchValue({
      displayName: 'Stripe Global',
      countryCodes: 'US, GB',
    });
    fixture.componentInstance['submit']();

    expect(paymentGatewaysService.update).toHaveBeenCalledWith(
      'gw-1',
      expect.objectContaining({
        displayName: 'Stripe Global',
        countryCodes: ['US', 'GB'],
      }),
    );
    expect(paymentGatewaysService.update.mock.calls[0][1]).not.toHaveProperty('isActive');
    expect(updated).toBe(true);
  });

  it('rejects whitespace or comma-only country codes and does not call update', () => {
    const fixture = setup();

    fixture.componentInstance['form'].patchValue({
      countryCodes: '  ,  , ',
    });
    fixture.componentInstance['submit']();

    expect(paymentGatewaysService.update).not.toHaveBeenCalled();
    expect(fixture.componentInstance['errorMessage']()).toBe('At least one country route is required.');
  });

  it('sends blank optional fields as empty strings so backend can clear them', () => {
    const fixture = setup();

    fixture.componentInstance['form'].patchValue({
      logoUrl: '',
      publicKey: '',
      merchantId: '',
      webhookUrl: '',
      countryCodes: 'US',
    });
    fixture.componentInstance['submit']();

    expect(paymentGatewaysService.update).toHaveBeenCalledWith(
      'gw-1',
      expect.objectContaining({
        displayName: 'Stripe US',
        logoUrl: '',
        publicKey: '',
        merchantId: '',
        webhookUrl: '',
        countryCodes: ['US'],
        countryNameSnapshots: [expect.any(String)],
      }),
    );
  });

  it('emits closed on backdrop click', () => {
    const fixture = setup();
    let closed = false;
    fixture.componentInstance.closed.subscribe(() => (closed = true));

    const backdrop = fixture.nativeElement.querySelector('[aria-label="Close dialog"]') as HTMLElement;
    backdrop.click();

    expect(closed).toBe(true);
  });

  it('emits closed on Escape', () => {
    const fixture = setup();
    let closed = false;
    fixture.componentInstance.closed.subscribe(() => (closed = true));

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(closed).toBe(true);
  });

  it('does not close on inner modal click', () => {
    const fixture = setup();
    let closed = false;
    fixture.componentInstance.closed.subscribe(() => (closed = true));

    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    dialog.click();

    expect(closed).toBe(false);
  });
});
