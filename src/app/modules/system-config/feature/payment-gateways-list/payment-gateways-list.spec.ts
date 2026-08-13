import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PaymentGatewaysList } from './payment-gateways-list';
import { PaymentGatewaysService } from '../../data/payment-gateways.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';
import { PaymentGatewayConfig } from '../../data/payment-gateway.model';

describe('PaymentGatewaysList', () => {
  const sampleGateway: PaymentGatewayConfig = {
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

  let paymentGatewaysService: {
    list: jest.Mock;
    update: jest.Mock;
  };
  let notificationService: { success: jest.Mock; error: jest.Mock };

  beforeEach(() => {
    paymentGatewaysService = {
      list: jest.fn().mockReturnValue(of([sampleGateway])),
      update: jest.fn().mockReturnValue(of({ ...sampleGateway, isActive: false })),
    };
    notificationService = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [PaymentGatewaysList],
      providers: [
        provideRouter([]),
        { provide: PaymentGatewaysService, useValue: paymentGatewaysService },
        {
          provide: PermissionStore,
          useValue: {
            hasPermission: (code: string) =>
              code === 'platform.system_config.read' || code === 'platform.system_config.manage',
          },
        },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compileComponents();
  });

  it('loads payment gateways on init', () => {
    const fixture = TestBed.createComponent(PaymentGatewaysList);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Stripe US');
    expect(fixture.nativeElement.textContent).toContain('stripe_us_prod');
  });

  it('opens the edit modal from the Edit action', () => {
    const fixture = TestBed.createComponent(PaymentGatewaysList);
    fixture.detectChanges();

    const editButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find((button: Element) =>
      button.textContent?.includes('Edit'),
    ) as HTMLButtonElement | undefined;

    editButton?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Edit Payment Gateway');
    expect(fixture.nativeElement.textContent).not.toContain('Secret Key');
  });

  it('deactivates a gateway from the table action', () => {
    const fixture = TestBed.createComponent(PaymentGatewaysList);
    fixture.detectChanges();

    const deactivateButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find((button: Element) =>
      button.textContent?.includes('Deactivate'),
    ) as HTMLButtonElement | undefined;

    deactivateButton?.click();
    fixture.detectChanges();

    expect(paymentGatewaysService.update).toHaveBeenCalledWith('gw-1', { isActive: false });
    expect(notificationService.success).toHaveBeenCalledWith('Gateway deactivated.');
  });
});
