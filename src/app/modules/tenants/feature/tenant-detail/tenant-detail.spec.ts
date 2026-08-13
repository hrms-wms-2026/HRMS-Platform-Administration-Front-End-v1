import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { TenantDetailComponent } from './tenant-detail';
import { TenantsService } from '../../data/tenants.service';
import { TenantAdminService } from '../../data/tenant-admin.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';

describe('TenantDetail', () => {
  let tenantsService: {
    getById: jest.Mock;
    changeStatus: jest.Mock;
    getProvisioningSummary: jest.Mock;
    confirmProvisioning: jest.Mock;
  };
  let notificationService: { success: jest.Mock; error: jest.Mock };

  const activeTenant = {
    id: 't1',
    companyName: 'Acme Inc',
    slug: 'acme',
    industryProfile: 'technology',
    companySizeRange: '11-50',
    status: 'active',
    subscriptionPlanId: null,
    settingsJson: null,
    legalEntityName: 'Acme Legal LLC',
    registrationNumber: 'REG123',
    country: 'US',
    currency: 'USD',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: null,
  };

  function setup(
    permissions: string[] = ['platform.tenants.read', 'platform.tenants.manage'],
    tenant: unknown = activeTenant,
    provisioningSummary: unknown = null,
  ) {
    tenantsService = {
      getById: jest.fn().mockReturnValue(of(tenant)),
      changeStatus: jest.fn(),
      getProvisioningSummary: jest.fn().mockReturnValue(of(provisioningSummary)),
      confirmProvisioning: jest.fn(),
    };
    const tenantAdminService = {
      updateTenant: jest.fn().mockReturnValue(of(undefined)),
      listRoles: jest.fn().mockReturnValue(of([])),
    };
    notificationService = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [TenantDetailComponent],
      providers: [
        { provide: TenantsService, useValue: tenantsService },
        { provide: TenantAdminService, useValue: tenantAdminService },
        { provide: NotificationService, useValue: notificationService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 't1' }) } },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TenantDetailComponent);
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

  it('loads and renders the tenant detail fields', () => {
    const fixture = setup();
    expect(tenantsService.getById).toHaveBeenCalledWith('t1');
    expect(fixture.nativeElement.textContent).toContain('Acme Inc');
    expect(fixture.nativeElement.textContent).toContain('REG123');
  });

  it('shows Suspend and Cancel actions for an active tenant when the user can manage', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    expect(component['availableActions']()).toEqual([
      { action: 'suspend', label: 'Suspend', confirmVariant: 'danger' },
      { action: 'cancel', label: 'Cancel', confirmVariant: 'danger' },
    ]);
  });

  it('hides all actions when the user lacks manage permission', () => {
    const fixture = setup(['platform.tenants.read']);
    const component = fixture.componentInstance;
    expect(component['availableActions']()).toEqual([]);
  });

  it('calls changeStatus with the reason and reloads on confirm', () => {
    const fixture = setup();
    tenantsService.changeStatus.mockReturnValue(of(undefined));
    const component = fixture.componentInstance;

    component['startAction']({ action: 'suspend', label: 'Suspend', confirmVariant: 'danger' });
    component['reason'].set('Non-payment');
    component['confirmAction']();

    expect(tenantsService.changeStatus).toHaveBeenCalledWith('t1', 'suspend', 'Non-payment');
    expect(notificationService.success).toHaveBeenCalledWith('Tenant status updated.');
    expect(tenantsService.getById).toHaveBeenCalledTimes(2);
  });

  const provisioningTenant = {
    id: 't1',
    companyName: 'Acme Inc',
    slug: 'acme',
    industryProfile: 'office_it',
    companySizeRange: '51-200',
    status: 'provisioning',
    subscriptionPlanId: 'plan-1',
    settingsJson: null,
    legalEntityName: 'Acme Legal LLC',
    registrationNumber: null,
    country: 'USA',
    currency: 'USD',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: null,
  };

  const incompleteSummary = {
    tenantId: 't1',
    status: 'provisioning',
    sections: {
      tenantDetails: { complete: true, summary: {}, missingFields: [] },
      subscription: { complete: true, summary: {}, missingFields: [] },
      modules: { complete: true, summary: {}, missingFields: [] },
      roles: { complete: true, summary: {}, missingFields: [] },
      settings: { complete: true, summary: {}, missingFields: [] },
      ownerInvite: { complete: false, summary: {}, missingFields: ['accepted'] },
    },
    canActivate: false,
    blockingErrors: [
      { code: 'owner_invite_pending', message: 'Owner has not accepted the invite yet.', section: 'ownerInvite' },
    ],
    warnings: [],
  };

  it('shows the provisioning checklist when the tenant is provisioning', () => {
    const fixture = setup(
      ['platform.tenants.read', 'platform.tenants.manage'],
      provisioningTenant,
      incompleteSummary,
    );

    expect(tenantsService.getProvisioningSummary).toHaveBeenCalledWith('t1');
    expect(fixture.nativeElement.textContent).toContain('Owner has not accepted the invite yet.');
  });

  it('disables Confirm & Activate when canActivate is false', () => {
    const fixture = setup(
      ['platform.tenants.read', 'platform.tenants.manage'],
      provisioningTenant,
      incompleteSummary,
    );
    const component = fixture.componentInstance;

    expect(component['provisioningSummary']()?.canActivate).toBe(false);
  });

  it('activates the tenant and reloads on confirm', () => {
    const readySummary = { ...incompleteSummary, canActivate: true, blockingErrors: [] };
    const fixture = setup(['platform.tenants.read', 'platform.tenants.manage'], provisioningTenant, readySummary);
    tenantsService.confirmProvisioning.mockReturnValue(of(undefined));
    const component = fixture.componentInstance;
    const loadTenantSpy = jest.spyOn(component, 'loadTenant');

    component['startActivation']();
    component['confirmActivation']();

    expect(tenantsService.confirmProvisioning).toHaveBeenCalledWith('t1');
    expect(loadTenantSpy).toHaveBeenCalled();
  });

  it('replaces the summary with the 422 response body when confirmation is blocked', () => {
    const readySummary = { ...incompleteSummary, canActivate: true, blockingErrors: [] };
    const fixture = setup(['platform.tenants.read', 'platform.tenants.manage'], provisioningTenant, readySummary);
    const rejectedSummary = { ...incompleteSummary, canActivate: false };
    tenantsService.confirmProvisioning.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 422, error: rejectedSummary })),
    );
    const component = fixture.componentInstance;

    component['startActivation']();
    component['confirmActivation']();

    expect(component['provisioningSummary']()).toEqual(rejectedSummary);
  });
});
