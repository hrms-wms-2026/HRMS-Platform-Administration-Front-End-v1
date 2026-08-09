import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { SubscriptionPlanDetail } from './subscription-plan-detail';
import { SubscriptionPlansService } from '../../data/subscription-plans.service';
import { ModuleCatalogService } from '../../../module-catalog/data/module-catalog.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';

describe('SubscriptionPlanDetail', () => {
  let plansService: { getById: jest.Mock; update: jest.Mock; archive: jest.Mock };
  let moduleCatalogService: { list: jest.Mock };
  let notificationService: { success: jest.Mock; error: jest.Mock };

  const planDetail = {
    id: 'plan-1',
    name: 'Starter',
    code: 'starter_1_10',
    tier: 'Starter',
    companySizeRange: '1-10',
    pricingUnit: 'per_employee',
    includedModules: ['core-hr'],
    calculatedMonthlyPrice: 10,
    calculatedAnnualPrice: 100,
    overrideMonthlyPrice: null,
    overrideAnnualPrice: null,
    effectiveMonthlyPrice: 10,
    effectiveAnnualPrice: 100,
    currency: 'USD',
    aiTokenLimitPerMonth: null,
    trialPeriodDays: 30,
    unpaidGracePeriodDays: 7,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: null,
  };

  function setup(permissions: string[] = ['platform.subscriptions.read', 'platform.subscriptions.manage']) {
    plansService = {
      getById: jest.fn().mockReturnValue(of(planDetail)),
      update: jest.fn(),
      archive: jest.fn(),
    };
    moduleCatalogService = { list: jest.fn().mockReturnValue(of([])) };
    notificationService = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [SubscriptionPlanDetail],
      providers: [
        { provide: SubscriptionPlansService, useValue: plansService },
        { provide: ModuleCatalogService, useValue: moduleCatalogService },
        { provide: NotificationService, useValue: notificationService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'plan-1' }) } },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SubscriptionPlanDetail);
    const store = TestBed.inject(PermissionStore);
    store.setAuthorizationContext({
      userId: 'u1',
      email: 'admin@example.com',
      platformRole: 'Platform Super Admin',
      expiresAt: '',
      mfaRequired: false,
      permissions,
      scopes: {},
      entitlements: [],
    });
    fixture.detectChanges();
    return fixture;
  }

  it('loads and displays the plan', () => {
    const fixture = setup();
    expect(plansService.getById).toHaveBeenCalledWith('plan-1');
    expect(fixture.nativeElement.textContent).toContain('Starter');
  });

  it('hides Edit/Archive without manage permission', () => {
    const fixture = setup(['platform.subscriptions.read']);
    expect(fixture.nativeElement.textContent).not.toContain('Archive');
  });

  it('archives the plan and reloads on confirm', () => {
    const fixture = setup();
    plansService.archive.mockReturnValue(of(undefined));
    const component = fixture.componentInstance;

    component['startArchive']();
    component['confirmArchive']();

    expect(plansService.archive).toHaveBeenCalledWith('plan-1');
    expect(notificationService.success).toHaveBeenCalledWith('Subscription plan archived.');
    expect(plansService.getById).toHaveBeenCalledTimes(2);
  });

  it('shows the backend error detail message when update fails', () => {
    const fixture = setup();
    plansService.update.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ status: 400, error: { detail: 'Unknown module keys: bad-key.' } }),
      ),
    );
    const component = fixture.componentInstance;

    component['saveEdit']({
      name: 'Starter',
      code: 'starter_1_10',
      tier: 'Starter',
      companySizeRange: '1-10',
      moduleKeys: ['core-hr'],
      currency: 'USD',
      overrideMonthlyPrice: null,
      overrideAnnualPrice: null,
      aiTokenLimitPerMonth: null,
      trialPeriodDays: 30,
      unpaidGracePeriodDays: 7,
    });

    expect(notificationService.error).toHaveBeenCalledWith('Unknown module keys: bad-key.');
  });
});
