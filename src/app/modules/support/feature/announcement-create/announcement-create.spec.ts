import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AnnouncementCreate } from './announcement-create';
import { AnnouncementsService } from '../../data/announcements.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { PlatformRolesService } from '../../../roles/data/platform-roles.service';
import { TenantsService } from '../../../tenants/data/tenants.service';
import { TenantAdminService } from '../../../tenants/data/tenant-admin.service';

describe('AnnouncementCreate', () => {
  let announcementsService: { create: jest.Mock };
  let notificationService: { success: jest.Mock; error: jest.Mock };
  let router: { navigateByUrl: jest.Mock };
  let platformRolesService: { listRoles: jest.Mock };
  let tenantsService: { list: jest.Mock };
  let tenantAdminService: { listRoles: jest.Mock };

  function setup() {
    announcementsService = { create: jest.fn() };
    notificationService = { success: jest.fn(), error: jest.fn() };
    router = { navigateByUrl: jest.fn() };
    platformRolesService = {
      listRoles: jest.fn().mockReturnValue(of([{ id: 'role-1', name: 'Billing Admin' }])),
    };
    tenantsService = {
      list: jest.fn().mockReturnValue(
        of({ items: [{ id: 'tenant-1', name: 'Acme', slug: 'acme', status: 'active', createdAt: '' }], total: 1, page: 1, pageSize: 200 }),
      ),
    };
    tenantAdminService = {
      listRoles: jest.fn().mockReturnValue(of([{ id: 'trole-1', name: 'HR Manager', description: '', isSystem: false, permissionCount: 0 }])),
    };

    TestBed.configureTestingModule({
      imports: [AnnouncementCreate],
      providers: [
        { provide: AnnouncementsService, useValue: announcementsService },
        { provide: NotificationService, useValue: notificationService },
        { provide: Router, useValue: router },
        { provide: PlatformRolesService, useValue: platformRolesService },
        { provide: TenantsService, useValue: tenantsService },
        { provide: TenantAdminService, useValue: tenantAdminService },
      ],
    }).compileComponents();

    return TestBed.createComponent(AnnouncementCreate);
  }

  function fillBaseForm(component: AnnouncementCreate): void {
    component['form'].setValue({
      title: 'Scheduled maintenance',
      body: 'Down for 1 hour on Saturday.',
      severity: 'warning',
    });
  }

  it('does not submit when the form is invalid', () => {
    const fixture = setup();
    fixture.detectChanges();

    fixture.componentInstance['submit']();

    expect(announcementsService.create).not.toHaveBeenCalled();
  });

  it('defaults to platform-wide audience and creates on success', () => {
    const fixture = setup();
    fixture.detectChanges();
    announcementsService.create.mockReturnValue(of({ id: 'announcement-1' }));

    const component = fixture.componentInstance;
    fillBaseForm(component);
    component['submit']();

    expect(announcementsService.create).toHaveBeenCalledWith({
      title: 'Scheduled maintenance',
      body: 'Down for 1 hour on Saturday.',
      severity: 'warning',
      audienceScope: 'platform_wide',
      platformAdminScope: undefined,
      platformRoleIds: undefined,
      tenantScope: undefined,
      tenantIds: undefined,
      recipientScope: undefined,
      tenantRoleTargets: undefined,
    });
    expect(notificationService.success).toHaveBeenCalledWith('Announcement created.');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/support/announcements');
  });

  it('requires at least one platform role when platform admin scope is selected_roles', () => {
    const fixture = setup();
    fixture.detectChanges();

    const component = fixture.componentInstance;
    fillBaseForm(component);
    component['onAudienceScopeChange']('platform_admins');
    component['onPlatformAdminScopeChange']('selected_roles');
    component['submit']();

    expect(announcementsService.create).not.toHaveBeenCalled();
    expect(notificationService.error).toHaveBeenCalledWith('Select at least one platform role.');
  });

  it('sends the selected platform role ids', () => {
    const fixture = setup();
    fixture.detectChanges();
    announcementsService.create.mockReturnValue(of({ id: 'announcement-1' }));

    const component = fixture.componentInstance;
    fillBaseForm(component);
    component['onAudienceScopeChange']('platform_admins');
    component['onPlatformAdminScopeChange']('selected_roles');
    component['togglePlatformRole']('role-1');
    component['submit']();

    expect(announcementsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        audienceScope: 'platform_admins',
        platformAdminScope: 'selected_roles',
        platformRoleIds: ['role-1'],
      }),
    );
  });

  it('requires at least one tenant when tenant scope is selected_tenants', () => {
    const fixture = setup();
    fixture.detectChanges();

    const component = fixture.componentInstance;
    fillBaseForm(component);
    component['onAudienceScopeChange']('tenant_users');
    component['onTenantScopeChange']('selected_tenants');
    component['submit']();

    expect(announcementsService.create).not.toHaveBeenCalled();
    expect(notificationService.error).toHaveBeenCalledWith('Select at least one tenant.');
  });

  it('sends the selected tenant ids and role targets', () => {
    const fixture = setup();
    fixture.detectChanges();
    announcementsService.create.mockReturnValue(of({ id: 'announcement-1' }));

    const component = fixture.componentInstance;
    fillBaseForm(component);
    component['onAudienceScopeChange']('tenant_users');
    component['onTenantScopeChange']('selected_tenants');
    component['toggleSelectedTenant']('tenant-1');
    component['onRecipientScopeChange']('selected_roles');
    component['toggleTenantRole']('tenant-1', 'trole-1');
    component['submit']();

    expect(announcementsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        audienceScope: 'tenant_users',
        tenantScope: 'selected_tenants',
        tenantIds: ['tenant-1'],
        recipientScope: 'selected_roles',
        tenantRoleTargets: [{ tenantId: 'tenant-1', roleId: 'trole-1' }],
      }),
    );
  });

  it('shows a backend error when creation fails', () => {
    const fixture = setup();
    fixture.detectChanges();
    announcementsService.create.mockReturnValue(
      throwError(() => new HttpErrorResponse({ error: { detail: 'Title is required.' } })),
    );

    const component = fixture.componentInstance;
    fillBaseForm(component);
    component['submit']();

    expect(notificationService.error).toHaveBeenCalledWith('Title is required.');
    expect(component['saving']()).toBe(false);
  });
});
