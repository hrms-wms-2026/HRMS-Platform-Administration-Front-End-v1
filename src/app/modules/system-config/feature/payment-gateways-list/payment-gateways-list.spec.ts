import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PaymentGatewaysList } from './payment-gateways-list';
import { PaymentGatewaysService } from '../../data/payment-gateways.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';

describe('PaymentGatewaysList', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PaymentGatewaysList],
      providers: [
        provideRouter([]),
        {
          provide: PaymentGatewaysService,
          useValue: {
            list: jest.fn().mockReturnValue(
              of([
                {
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
                  countryRoutes: [{ id: 'r1', countryCode: 'US', countryNameSnapshot: 'United States', environment: 'production', isActive: true, createdAt: '2026-01-01T00:00:00Z' }],
                },
              ]),
            ),
          },
        },
        {
          provide: PermissionStore,
          useValue: {
            hasPermission: (code: string) =>
              code === 'platform.system_config.read' || code === 'platform.system_config.manage',
          },
        },
        { provide: NotificationService, useValue: { success: jest.fn(), error: jest.fn() } },
      ],
    }).compileComponents();
  });

  it('loads payment gateways on init', () => {
    const fixture = TestBed.createComponent(PaymentGatewaysList);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Stripe US');
    expect(fixture.nativeElement.textContent).toContain('stripe_us_prod');
  });
});
