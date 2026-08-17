import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AddPaymentGatewayModal } from './add-payment-gateway-modal';
import { PaymentGatewaysService } from '../../data/payment-gateways.service';

describe('AddPaymentGatewayModal', () => {
  let paymentGatewaysService: {
    listProviders: jest.Mock;
    verifyCredentials: jest.Mock;
    create: jest.Mock;
  };

  beforeEach(async () => {
    paymentGatewaysService = {
      listProviders: jest.fn().mockReturnValue(
        of([{ providerKey: 'stripe', displayName: 'Stripe', configured: false, isActive: true }]),
      ),
      verifyCredentials: jest.fn().mockReturnValue(
        of({ isVerified: true, accountName: 'Acme', defaultCurrency: 'USD', errorMessage: null }),
      ),
      create: jest.fn().mockReturnValue(of({ id: 'gw-1' })),
    };

    await TestBed.configureTestingModule({
      imports: [AddPaymentGatewayModal],
      providers: [{ provide: PaymentGatewaysService, useValue: paymentGatewaysService }],
    }).compileComponents();
  });

  function setup() {
    const fixture = TestBed.createComponent(AddPaymentGatewayModal);
    fixture.detectChanges();
    return fixture;
  }

  it('loads payment gateway providers on init', () => {
    const fixture = setup();
    expect(paymentGatewaysService.listProviders).toHaveBeenCalled();
    expect(fixture.componentInstance['providers']().length).toBe(1);
  });

  it('requires provider and secret key before verifying credentials', () => {
    const fixture = setup();
    fixture.componentInstance['verifyCredentials']();
    expect(fixture.componentInstance['verifyMessage']()).toContain('Select a provider');
    expect(paymentGatewaysService.verifyCredentials).not.toHaveBeenCalled();
  });

  it('shows verified account details after a successful verify call', () => {
    const fixture = setup();
    fixture.componentInstance['form'].patchValue({ provider: 'stripe', secretKey: 'sk_test' });

    fixture.componentInstance['verifyCredentials']();

    expect(paymentGatewaysService.verifyCredentials).toHaveBeenCalledWith('stripe', 'sk_test');
    expect(fixture.componentInstance['verifyMessage']()).toContain('Verified: Acme (USD)');
  });

  it('shows verify failure message when credentials are rejected', () => {
    paymentGatewaysService.verifyCredentials.mockReturnValue(
      of({ isVerified: false, accountName: null, defaultCurrency: null, errorMessage: 'Invalid secret key.' }),
    );
    const fixture = setup();
    fixture.componentInstance['form'].patchValue({ provider: 'stripe', secretKey: 'sk_bad' });

    fixture.componentInstance['verifyCredentials']();

    expect(fixture.componentInstance['verifyMessage']()).toBe('Invalid secret key.');
  });

  it('creates a gateway with parsed country routes', () => {
    const fixture = setup();
    let created = false;
    fixture.componentInstance.created.subscribe(() => (created = true));

    fixture.componentInstance['form'].patchValue({
      gatewayKey: 'stripe_us_prod',
      provider: 'stripe',
      environment: 'production',
      displayName: 'Stripe US',
      secretKey: 'sk_live',
      countryCodes: 'US, GB',
      isActive: true,
    });
    fixture.componentInstance['submit']();

    expect(paymentGatewaysService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        gatewayKey: 'stripe_us_prod',
        countryCodes: ['US', 'GB'],
        countryNameSnapshots: expect.arrayContaining(['United States of America', expect.any(String)]),
      }),
    );
    expect(created).toBe(true);
  });

  it('rejects invalid country code lengths before create', () => {
    const fixture = setup();
    fixture.componentInstance['form'].patchValue({
      gatewayKey: 'stripe_us_prod',
      provider: 'stripe',
      displayName: 'Stripe US',
      secretKey: 'sk_live',
      countryCodes: 'USA',
    });

    fixture.componentInstance['submit']();

    expect(fixture.componentInstance['errorMessage']()).toContain('2-letter ISO codes');
    expect(paymentGatewaysService.create).not.toHaveBeenCalled();
  });

  it('shows backend error detail on create failure', () => {
    paymentGatewaysService.create.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { detail: 'Gateway key already exists.' } })),
    );
    const fixture = setup();

    fixture.componentInstance['form'].patchValue({
      gatewayKey: 'stripe_us_prod',
      provider: 'stripe',
      displayName: 'Stripe US',
      secretKey: 'sk_live',
      countryCodes: 'US',
    });
    fixture.componentInstance['submit']();

    expect(fixture.componentInstance['errorMessage']()).toBe('Gateway key already exists.');
  });

  it('emits closed when cancelled', () => {
    const fixture = setup();
    let closed = false;
    fixture.componentInstance.closed.subscribe(() => (closed = true));

    fixture.componentInstance.cancel();

    expect(closed).toBe(true);
  });
});
