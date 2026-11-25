import { TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { TenantSubscriptionPanel } from './tenant-subscription-panel';
import { TenantSubscriptionService } from '../../data/tenant-subscription.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';

describe('TenantSubscriptionPanel', () => {
  let subscriptionService: { get: jest.Mock; update: jest.Mock };

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
    includedSeats: null as number | null,
    overageAllowed: null as boolean | null,
    usedSeats: 3 as number | null,
    isTest: false,
  };

  let canManage = true;
  const notificationService = { success: jest.fn(), error: jest.fn() };

  function setup() {
    subscriptionService = { get: jest.fn(), update: jest.fn() };

    TestBed.configureTestingModule({
      imports: [TenantSubscriptionPanel],
      providers: [
        { provide: TenantSubscriptionService, useValue: subscriptionService },
        {
          provide: PermissionStore,
          useValue: { hasPermission: (code: string) => canManage && code === 'platform.subscriptions.manage' },
        },
        { provide: NotificationService, useValue: notificationService },
      ],
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

  describe('seats', () => {
    beforeEach(() => {
      canManage = true;
      notificationService.success.mockReset();
    });

    function button(fixture: { nativeElement: HTMLElement }, label: string): HTMLButtonElement | undefined {
      return Array.from(fixture.nativeElement.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === label,
      ) as HTMLButtonElement | undefined;
    }

    it('flags unconfigured seats and offers "Set seats"', () => {
      const fixture = setup();
      subscriptionService.get.mockReturnValue(of(subscription));
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Not configured');
      expect(text).toContain("Employees can't be invited until seats are set.");
      expect(button(fixture, 'Set seats')).toBeDefined();
    });

    it('shows usage and the test badge when configured', () => {
      const fixture = setup();
      subscriptionService.get.mockReturnValue(
        of({ ...subscription, includedSeats: 20, overageAllowed: false, usedSeats: 4, isTest: true }),
      );
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('4 of 20 used');
      expect(text).toContain('Hard limit');
      expect(text).toContain('Test tenant – not billed');
      expect(button(fixture, 'Edit')).toBeDefined();
    });

    it('hides editing without platform.subscriptions.manage', () => {
      canManage = false;
      const fixture = setup();
      subscriptionService.get.mockReturnValue(of(subscription));
      fixture.detectChanges();

      expect(button(fixture, 'Set seats')).toBeUndefined();
      expect(button(fixture, 'Edit')).toBeUndefined();
    });

    it('saves the seat allocation and shows the updated usage', () => {
      const fixture = setup();
      subscriptionService.get.mockReturnValue(of(subscription));
      subscriptionService.update.mockReturnValue(
        of({ ...subscription, includedSeats: 15, overageAllowed: false, usedSeats: 3, isTest: true }),
      );
      fixture.detectChanges();

      button(fixture, 'Set seats')!.click();
      fixture.detectChanges();
      const component = fixture.componentInstance;
      component['seatForm'].setValue({ includedSeats: 15, overageAllowed: false, isTest: true });
      component['saveSeats']();
      fixture.detectChanges();

      expect(subscriptionService.update).toHaveBeenCalledWith('tenant-1', {
        includedSeats: 15,
        overageAllowed: false,
        isTest: true,
      });
      expect(notificationService.success).toHaveBeenCalledWith('Seat allocation saved.');
      expect(fixture.nativeElement.textContent).toContain('3 of 15 used');
      expect(component['editingSeats']()).toBe(false);
    });

    it('pre-fills one more than the used count and warns when no seat would be free', () => {
      const fixture = setup();
      subscriptionService.get.mockReturnValue(of(subscription)); // usedSeats: 3, not configured
      fixture.detectChanges();

      button(fixture, 'Set seats')!.click();
      fixture.detectChanges();
      const form = fixture.componentInstance['seatForm'];
      expect(form.controls.includedSeats.value).toBe(4);
      expect(fixture.nativeElement.textContent).not.toContain('No free seats');

      form.controls.includedSeats.setValue(3);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('No free seats – new employees will be blocked.');

      form.controls.overageAllowed.setValue(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('No free seats');
    });

    it('blocks saving an invalid seat count', () => {
      const fixture = setup();
      subscriptionService.get.mockReturnValue(of(subscription));
      fixture.detectChanges();

      button(fixture, 'Set seats')!.click();
      fixture.detectChanges();
      fixture.componentInstance['seatForm'].controls.includedSeats.setValue(-2);
      fixture.componentInstance['saveSeats']();
      fixture.detectChanges();

      expect(subscriptionService.update).not.toHaveBeenCalled();
      expect(fixture.nativeElement.textContent).toContain('Enter a whole number from 0 to 100,000.');
    });
  });
});
