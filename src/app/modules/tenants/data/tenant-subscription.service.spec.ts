import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TenantSubscriptionService } from './tenant-subscription.service';
import { environment } from '../../../../environments/environment';

describe('TenantSubscriptionService', () => {
  let service: TenantSubscriptionService;
  let httpMock: HttpTestingController;

  const subscriptionApi = {
    tenant_id: 'tenant-1',
    tenant_name: 'Acme Inc',
    tenant_slug: 'acme',
    subscription_id: 'sub-1',
    subscription_plan_id: 'plan-1',
    plan_name: 'Growth',
    plan_code: 'growth_11_50',
    status: 'active',
    billing_cycle: 'monthly',
    currency: 'USD',
    amount: 199,
    current_period_start: '2026-01-01',
    current_period_end: '2026-01-31',
    trial_ends_at: null,
    grace_ends_at: null,
    access_ends_at: null,
    unpaid_grace_period_days: 7,
    gateway_provider: 'stripe',
    gateway_customer_ref: 'cus_123',
    gateway_subscription_ref: 'sub_123',
    maintenance_status: null,
    maintenance_billing_cycle: null,
    maintenance_renewal_at: null,
    maintenance_amount: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    is_active_access: true,
    is_in_trial: false,
    is_past_due: false,
    is_in_grace_period: false,
    days_until_renewal: 12,
    days_until_access_ends: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TenantSubscriptionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('gets tenant subscription and maps snake_case fields', () => {
    let result: unknown;
    service.get('tenant-1').subscribe((subscription) => (result = subscription));

    const req = httpMock.expectOne(`${environment.apiUrl}/tenants/tenant-1/subscription`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush(subscriptionApi);

    expect(result).toEqual({
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
      updatedAt: '2026-01-02T00:00:00Z',
      isActiveAccess: true,
      isInTrial: false,
      isPastDue: false,
      isInGracePeriod: false,
      daysUntilRenewal: 12,
      daysUntilAccessEnds: null,
    });
  });
});
