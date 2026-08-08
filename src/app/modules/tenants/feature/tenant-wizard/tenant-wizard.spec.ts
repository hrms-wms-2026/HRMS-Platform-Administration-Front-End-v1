import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { TenantWizard } from './tenant-wizard';
import { TenantsService } from '../../data/tenants.service';
import { SubscriptionPlansService } from '../../../subscription-plans/data/subscription-plans.service';
import { NotificationService } from '../../../../core/services/notification.service';

describe('TenantWizard', () => {
  let tenantsService: {
    validate: jest.Mock;
    create: jest.Mock;
  };
  let plansService: { list: jest.Mock };
  let notificationService: { success: jest.Mock; error: jest.Mock };
  let router: { navigate: jest.Mock };

  const plan = {
    id: 'plan-1',
    name: 'Starter - 51-200',
    code: 'starter_51_200',
    tier: 'starter',
    companySizeRange: '51-200',
    effectiveMonthlyPrice: 7.5,
    effectiveAnnualPrice: 75,
    currency: 'USD',
    isActive: true,
  };

  function createComponent() {
    const fixture = TestBed.createComponent(TenantWizard);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(async () => {
    tenantsService = { validate: jest.fn().mockReturnValue(of({ valid: true, conflicts: [], warnings: [] })), create: jest.fn() };
    plansService = { list: jest.fn().mockReturnValue(of([plan])) };
    notificationService = { success: jest.fn(), error: jest.fn() };
    router = { navigate: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [TenantWizard],
      providers: [
        { provide: TenantsService, useValue: tenantsService },
        { provide: SubscriptionPlansService, useValue: plansService },
        { provide: NotificationService, useValue: notificationService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();
  });

  it('auto-generates the slug from the company name until the slug is edited manually', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['onCompanyNameChanged']('Acme Inc.');
    expect(component['companyForm'].controls.slug.value).toBe('acme-inc');

    component['onSlugChanged']('custom-slug');
    component['onCompanyNameChanged']('Something Else');
    expect(component['companyForm'].controls.slug.value).toBe('custom-slug');
  });

  it('blocks moving to step 2 when the company details form is invalid', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['nextStep']();

    expect(component['currentStep']()).toBe(1);
    expect(component['companyForm'].touched).toBe(true);
  });

  it('advances through all four steps once each step is valid', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['companyForm'].setValue({
      companyName: 'Acme Inc',
      slug: 'acme-inc',
      industryProfile: 'office_it',
      companySizeRange: '51-200',
      legalEntityName: 'Acme Legal LLC',
      registrationNumber: '',
      country: 'USA',
      timezone: 'America/New_York',
      currency: 'USD',
    });
    component['nextStep']();
    expect(component['currentStep']()).toBe(2);

    component['selectPlan']('plan-1');
    component['nextStep']();
    expect(component['currentStep']()).toBe(3);

    component['ownerForm'].setValue({ email: 'owner@acme.com', firstName: 'Ada', lastName: 'Owner' });
    component['nextStep']();
    expect(component['currentStep']()).toBe(4);
  });

  it('submits the combined request and navigates to the new tenant on success', () => {
    tenantsService.create.mockReturnValue(
      of({ tenantId: 'tenant-1', status: 'provisioning', nextStep: 'owner_invite' }),
    );
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['companyForm'].setValue({
      companyName: 'Acme Inc',
      slug: 'acme-inc',
      industryProfile: 'office_it',
      companySizeRange: '51-200',
      legalEntityName: 'Acme Legal LLC',
      registrationNumber: '',
      country: 'USA',
      timezone: 'America/New_York',
      currency: 'USD',
    });
    component['subscriptionForm'].setValue({ planId: 'plan-1', billingCycle: 'monthly' });
    component['ownerForm'].setValue({ email: 'owner@acme.com', firstName: 'Ada', lastName: 'Owner' });

    component['submit']();

    expect(tenantsService.create).toHaveBeenCalledWith({
      companyName: 'Acme Inc',
      slug: 'acme-inc',
      industryProfile: 'office_it',
      companySizeRange: '51-200',
      legalEntityName: 'Acme Legal LLC',
      registrationNumber: null,
      country: 'USA',
      timezone: 'America/New_York',
      currency: 'USD',
      planId: 'plan-1',
      billingCycle: 'monthly',
      ownerInvite: { email: 'owner@acme.com', firstName: 'Ada', lastName: 'Owner' },
    });
    expect(notificationService.success).toHaveBeenCalledWith('Tenant created.');
    expect(router.navigate).toHaveBeenCalledWith(['/tenants', 'tenant-1']);
  });

  it('shows the backend error detail and stays on the review step when create fails', () => {
    tenantsService.create.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { detail: "slug 'acme-inc' is already taken." } })),
    );
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['companyForm'].setValue({
      companyName: 'Acme Inc',
      slug: 'acme-inc',
      industryProfile: 'office_it',
      companySizeRange: '51-200',
      legalEntityName: 'Acme Legal LLC',
      registrationNumber: '',
      country: 'USA',
      timezone: 'America/New_York',
      currency: 'USD',
    });
    component['subscriptionForm'].setValue({ planId: 'plan-1', billingCycle: 'monthly' });
    component['ownerForm'].setValue({ email: 'owner@acme.com', firstName: 'Ada', lastName: 'Owner' });

    component['submit']();

    expect(component['submitError']()).toBe("slug 'acme-inc' is already taken.");
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('loads active subscription plans on init', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    expect(plansService.list).toHaveBeenCalled();
    expect(component['plans']()).toEqual([plan]);
  });
});
