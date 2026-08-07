import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { TenantDetailComponent } from './tenant-detail';
import { TenantsService } from '../../data/tenants.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';

describe('TenantDetail', () => {
  let tenantsService: { getById: jest.Mock; changeStatus: jest.Mock };
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

  function setup(permissions: string[] = ['platform.tenants.read', 'platform.tenants.manage']) {
    tenantsService = { getById: jest.fn().mockReturnValue(of(activeTenant)), changeStatus: jest.fn() };
    notificationService = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [TenantDetailComponent],
      providers: [
        { provide: TenantsService, useValue: tenantsService },
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
});
