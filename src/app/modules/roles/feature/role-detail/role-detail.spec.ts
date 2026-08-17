import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { RoleDetail } from './role-detail';
import { PlatformRolesService } from '../../data/platform-roles.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';

describe('RoleDetail', () => {
  let rolesService: {
    getRoleById: jest.Mock;
    listPermissions: jest.Mock;
    updateRolePermissions: jest.Mock;
  };
  let notificationService: { success: jest.Mock; error: jest.Mock };

  const roleDetail = {
    id: 'role-1',
    name: 'Security Auditor',
    description: 'Read-only audit access',
    isSystemRole: false,
    createdAt: '2026-01-01T00:00:00Z',
    permissions: ['platform.audit.read'],
  };

  const catalog = [
    {
      code: 'platform.audit.read',
      moduleKey: 'audit-console',
      description: 'Query the audit log',
      isHighRisk: false,
    },
    {
      code: 'platform.audit.export',
      moduleKey: 'audit-console',
      description: 'Export audit data',
      isHighRisk: false,
    },
    {
      code: 'platform.accounts.manage',
      moduleKey: 'platform-users',
      description: 'Manage platform users',
      isHighRisk: true,
    },
  ];

  function setup(permissions: string[] = ['platform.roles.read', 'platform.roles.manage']) {
    rolesService = {
      getRoleById: jest.fn().mockReturnValue(of(roleDetail)),
      listPermissions: jest.fn().mockReturnValue(of(catalog)),
      updateRolePermissions: jest.fn(),
    };
    notificationService = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [RoleDetail],
      providers: [
        { provide: PlatformRolesService, useValue: rolesService },
        { provide: NotificationService, useValue: notificationService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'role-1' }) } },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(RoleDetail);
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

  it('loads the role and permission catalog, grouped by module', () => {
    const fixture = setup();
    const component = fixture.componentInstance;

    expect(rolesService.getRoleById).toHaveBeenCalledWith('role-1');
    expect(rolesService.listPermissions).toHaveBeenCalled();
    expect(component['groups']()).toEqual([
      { moduleKey: 'audit-console', permissions: [catalog[0], catalog[1]] },
      { moduleKey: 'platform-users', permissions: [catalog[2]] },
    ]);
  });

  it("starts with the checkboxes matching the role's current permissions", () => {
    const fixture = setup();
    const component = fixture.componentInstance;

    expect(component['checkedCodes']().has('platform.audit.read')).toBe(true);
    expect(component['checkedCodes']().has('platform.audit.export')).toBe(false);
  });

  it('tracks unsaved changes as checkboxes are toggled', () => {
    const fixture = setup();
    const component = fixture.componentInstance;

    expect(component['hasChanges']()).toBe(false);
    component['toggle']('platform.audit.export');
    expect(component['hasChanges']()).toBe(true);
    component['toggle']('platform.audit.export');
    expect(component['hasChanges']()).toBe(false);
  });

  it('reports canManage as false when the user lacks manage permission', () => {
    const fixture = setup(['platform.roles.read']);
    const component = fixture.componentInstance;

    expect(component['canManage']()).toBe(false);
  });

  it('saves the checked codes and reloads on success', () => {
    const fixture = setup();
    rolesService.updateRolePermissions.mockReturnValue(of(undefined));
    const component = fixture.componentInstance;

    component['toggle']('platform.audit.export');
    component['save']();

    expect(rolesService.updateRolePermissions).toHaveBeenCalledWith('role-1', [
      'platform.audit.read',
      'platform.audit.export',
    ]);
    expect(notificationService.success).toHaveBeenCalledWith('Role permissions updated.');
    expect(rolesService.getRoleById).toHaveBeenCalledTimes(2);
  });

  it('shows the backend error detail message when save fails', () => {
    const fixture = setup();
    rolesService.updateRolePermissions.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { detail: 'Cannot remove the last active admin.' },
          }),
      ),
    );
    const component = fixture.componentInstance;

    component['save']();

    expect(notificationService.error).toHaveBeenCalledWith('Cannot remove the last active admin.');
  });
});
