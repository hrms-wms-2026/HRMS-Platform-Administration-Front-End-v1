import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { TenantRolesPanel } from './tenant-roles-panel';
import { TenantAdminService } from '../../data/tenant-admin.service';

describe('TenantRolesPanel', () => {
  const roles = [
    {
      id: 'role-1',
      name: 'Admin',
      description: 'Tenant admin',
      isSystem: true,
      permissionCount: 2,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: null,
      sourceTemplateId: null,
    },
  ];

  const catalog = {
    assignablePermissions: [
      {
        id: 'perm-1',
        code: 'employees.read',
        description: 'Read employees',
        module: 'employees',
        isAssignable: true,
        isUniversal: false,
      },
      {
        id: 'perm-2',
        code: 'employees.write',
        description: 'Write employees',
        module: 'employees',
        isAssignable: true,
        isUniversal: false,
      },
    ],
    universalPermissions: [],
  };

  let tenantAdminService: {
    listRoles: jest.Mock;
    getPermissionCatalog: jest.Mock;
    createRole: jest.Mock;
    assignRolePermissions: jest.Mock;
  };

  beforeEach(async () => {
    tenantAdminService = {
      listRoles: jest.fn().mockReturnValue(of(roles)),
      getPermissionCatalog: jest.fn().mockReturnValue(of(catalog)),
      createRole: jest.fn().mockReturnValue(
        of({
          id: 'role-2',
          name: 'Manager',
          description: 'Managers',
          isSystem: false,
          permissions: [{ id: 'perm-1', code: 'employees.read', description: 'Read employees', module: 'employees' }],
          universalPermissions: [],
          createdAt: '2026-01-02T00:00:00Z',
          updatedAt: null,
        }),
      ),
      assignRolePermissions: jest.fn().mockReturnValue(
        of({
          id: 'role-1',
          name: 'Admin',
          description: 'Tenant admin',
          isSystem: true,
          permissions: [{ id: 'perm-2', code: 'employees.write', description: 'Write employees', module: 'employees' }],
          universalPermissions: [],
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-02T00:00:00Z',
        }),
      ),
    };

    await TestBed.configureTestingModule({
      imports: [TenantRolesPanel],
      providers: [{ provide: TenantAdminService, useValue: tenantAdminService }],
    }).compileComponents();
  });

  function setup(canManage = true) {
    const fixture = TestBed.createComponent(TenantRolesPanel);
    fixture.componentRef.setInput('tenantId', 'tenant-1');
    fixture.componentRef.setInput('canManage', canManage);
    fixture.detectChanges();
    return fixture;
  }

  it('loads tenant roles on init', () => {
    const fixture = setup();
    expect(tenantAdminService.listRoles).toHaveBeenCalledWith('tenant-1');
    expect(fixture.nativeElement.textContent).toContain('Admin');
  });

  it('creates a role with selected permissions', () => {
    const fixture = setup();
    let refreshed = false;
    fixture.componentInstance.refreshed.subscribe(() => (refreshed = true));

    fixture.componentInstance['openCreate']();
    fixture.componentInstance['createForm'].patchValue({ name: 'Manager', description: 'Managers' });
    fixture.componentInstance['toggleCreatePermission']('perm-1');
    fixture.componentInstance['submitCreate']();

    expect(tenantAdminService.createRole).toHaveBeenCalledWith('tenant-1', {
      name: 'Manager',
      description: 'Managers',
      permissionIds: ['perm-1'],
    });
    expect(refreshed).toBe(true);
  });

  it('updates role permissions from the permissions modal', () => {
    const fixture = setup();
    fixture.componentInstance['openPermissions'](roles[0]);
    fixture.componentInstance['togglePermission']('perm-2');
    fixture.componentInstance['savePermissions']();

    expect(tenantAdminService.assignRolePermissions).toHaveBeenCalledWith('tenant-1', 'role-1', ['perm-2']);
  });

  it('groups assignable permissions by module', () => {
    const fixture = setup();
    fixture.componentInstance['openCreate']();
    expect(fixture.componentInstance['permissionGroups']()).toEqual([
      {
        moduleKey: 'employees',
        permissions: expect.arrayContaining([
          expect.objectContaining({ code: 'employees.read' }),
          expect.objectContaining({ code: 'employees.write' }),
        ]),
      },
    ]);
  });

  it('shows load error when roles cannot be fetched', () => {
    tenantAdminService.listRoles.mockReturnValue(throwError(() => new Error('network')));
    const fixture = setup();
    expect(fixture.componentInstance['errorMessage']()).toBe('Could not load tenant roles.');
  });

  it('shows catalog error when create fails', () => {
    tenantAdminService.createRole.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { detail: 'Role already exists.' } })),
    );
    const fixture = setup();
    fixture.componentInstance['openCreate']();
    fixture.componentInstance['createForm'].patchValue({ name: 'Admin' });
    fixture.componentInstance['submitCreate']();
    expect(fixture.componentInstance['catalogError']()).toBe('Role already exists.');
  });
});
