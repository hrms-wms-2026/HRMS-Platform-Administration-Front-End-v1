import { TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { TenantSubscriptionPanel } from './tenant-subscription-panel';
import { TenantSubscriptionService } from '../../data/tenant-subscription.service';

describe('TenantSubscriptionPanel', () => {
  let subscriptionService: { get: jest.Mock };

  const subscription = {
    tenantId: 'tenant-1',
    tenantName: 'Acme Inc',
    tenantSlug: 'acme',
    subscriptionId: 'sub-1',
    subscriptionPlanId: 'plan-1',
    planName: 'Growth',
    planCode: 'growth_11_50',
    status: 'active',
    billingCycle: 'monthly',
    currency: 'USD',
    amount: 199,
    currentPeriodStart: '2026-01-01',
    currentPeriodEnd: '2026-01-31',
    trialEndsAt: null,
    graceEndsAt: null,
    accessEndsAt: null,
    unpaidGracePeriodDays: 7,
    gatewayProvider: 'stripe',
    gatewayCustomerRef: 'cus_123',
    gatewaySubscriptionRef: 'sub_123',
    maintenanceStatus: null,
    maintenanceBillingCycle: null,
    maintenanceRenewalAt: null,
    maintenanceAmount: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: null,
    isActiveAccess: true,
    isInTrial: false,
    isPastDue: false,
    isInGracePeriod: false,
    daysUntilRenewal: 12,
    daysUntilAccessEnds: null,
  };

  function setup() {
    subscriptionService = { get: jest.fn() };

    TestBed.configureTestingModule({
      imports: [TenantSubscriptionPanel],
      providers: [{ provide: TenantSubscriptionService, useValue: subscriptionService }],
    }).compileComponents();

    const fixture = TestBed.createComponent(TenantSubscriptionPanel);
    fixture.componentRef.setInput('tenantId', 'tenant-1');
    return fixture;
  }

  it('shows skeleton while loading', () => {
    const fixture = setup();
    subscriptionService.get.mockReturnValue(NEVER);
    fixture.detectChanges();

    expect(subscriptionService.get).toHaveBeenCalledWith('tenant-1');
    expect(fixture.nativeElement.querySelector('app-page-detail-skeleton')).not.toBeNull();
  });

  it('renders subscription details on success', () => {
    const fixture = setup();
    subscriptionService.get.mockReturnValue(of(subscription));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Billing & Renewal');
    expect(fixture.nativeElement.textContent).toContain('Growth');
    expect(fixture.nativeElement.textContent).toContain('growth_11_50');
    expect(fixture.nativeElement.textContent).toContain('Renews in 12 days');
    expect(fixture.nativeElement.textContent).toContain('USD 199.00');
  });

  it('shows error banner on failure', () => {
    const fixture = setup();
    subscriptionService.get.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No subscription found for this tenant.');
  });

  it('shows renewal due and past due labels from computed flags', () => {
    const fixture = setup();
    subscriptionService.get.mockReturnValue(
      of({ ...subscription, daysUntilRenewal: 0, isPastDue: false }),
    );
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Renewal due');

    subscriptionService.get.mockReturnValue(
      of({ ...subscription, daysUntilRenewal: -2, isPastDue: true }),
    );
    fixture.componentRef.setInput('tenantId', 'tenant-2');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Renewal date passed');
  });

  it('reloads when tenantId changes', () => {
    const fixture = setup();
    subscriptionService.get.mockReturnValue(of(subscription));
    fixture.detectChanges();

    fixture.componentRef.setInput('tenantId', 'tenant-2');
    fixture.detectChanges();

    expect(subscriptionService.get).toHaveBeenCalledWith('tenant-2');
  });
});
