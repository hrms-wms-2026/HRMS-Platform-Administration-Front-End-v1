import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TenantAdminService } from './tenant-admin.service';
import { environment } from '../../../../environments/environment';

describe('TenantAdminService', () => {
  let service: TenantAdminService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TenantAdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('updates tenant metadata', () => {
    service
      .updateTenant('tenant-1', { name: 'Acme', slug: 'acme', industryProfile: 'technology' })
      .subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/tenants/tenant-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      name: 'Acme',
      slug: 'acme',
      industryProfile: 'technology',
    });
    req.flush(null);
  });

  it('invites a tenant admin with snake_case payload', () => {
    let result: unknown;
    service
      .inviteAdmin('tenant-1', {
        email: 'owner@acme.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
        roleId: 'role-1',
      })
      .subscribe((response) => (result = response));

    const req = httpMock.expectOne(`${environment.apiUrl}/tenants/tenant-1/invite-admin`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      email: 'owner@acme.com',
      first_name: 'Ada',
      last_name: 'Lovelace',
      role_id: 'role-1',
    });
    req.flush({ userId: 'user-1', inviteExpiresAt: '2026-01-02T00:00:00Z' });
    expect(result).toEqual({ userId: 'user-1', inviteExpiresAt: '2026-01-02T00:00:00Z' });
  });

  it('lists tenant roles with mapped summaries', () => {
    let result: unknown;
    service.listRoles('tenant-1').subscribe((roles) => (result = roles));

    const req = httpMock.expectOne(`${environment.apiUrl}/tenants/tenant-1/roles`);
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        id: 'role-1',
        name: 'Admin',
        description: 'Tenant admin',
        isSystem: true,
        permissionCount: 12,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: null,
        sourceTemplateId: null,
      },
    ]);
    expect(result).toEqual([
      expect.objectContaining({ id: 'role-1', name: 'Admin', permissionCount: 12 }),
    ]);
  });

  it('creates a tenant role and maps the detail response', () => {
    let result: unknown;
    service
      .createRole('tenant-1', { name: 'Manager', description: 'Managers', permissionIds: ['perm-1'] })
      .subscribe((role) => (result = role));

    const req = httpMock.expectOne(`${environment.apiUrl}/tenants/tenant-1/roles`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      name: 'Manager',
      description: 'Managers',
      permissionIds: ['perm-1'],
    });
    req.flush({
      id: 'role-2',
      name: 'Manager',
      description: 'Managers',
      isSystem: false,
      permissions: [{ id: 'perm-1', code: 'employees.read', description: 'Read employees', module: 'employees' }],
      universalPermissions: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: null,
    });
    expect(result).toEqual(expect.objectContaining({ id: 'role-2', name: 'Manager' }));
  });

  it('assigns role permissions', () => {
    service.assignRolePermissions('tenant-1', 'role-1', ['perm-1', 'perm-2']).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/tenants/tenant-1/roles/role-1/permissions`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ permissionIds: ['perm-1', 'perm-2'] });
    req.flush({
      id: 'role-1',
      name: 'Admin',
      description: 'Tenant admin',
      isSystem: true,
      permissions: [],
      universalPermissions: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    });
  });

  it('loads the tenant permission catalog', () => {
    let result: unknown;
    service.getPermissionCatalog('tenant-1').subscribe((catalog) => (result = catalog));

    const req = httpMock.expectOne(`${environment.apiUrl}/tenants/tenant-1/permissions/catalog`);
    expect(req.request.method).toBe('GET');
    req.flush({
      assignablePermissions: [
        {
          id: 'perm-1',
          code: 'employees.read',
          description: 'Read employees',
          module: 'employees',
          isAssignable: true,
          isUniversal: false,
        },
      ],
      universalPermissions: [],
    });
    expect(result).toEqual({
      assignablePermissions: [expect.objectContaining({ code: 'employees.read' })],
      universalPermissions: [],
    });
  });

  it('applies a role template with optional overrides', () => {
    let result: unknown;
    service
      .applyRoleTemplate('tenant-1', 'template-1', { roleNameOverride: 'Custom Admin', forceUpdate: true })
      .subscribe((response) => (result = response));

    const req = httpMock.expectOne(
      `${environment.apiUrl}/tenants/tenant-1/role-templates/template-1/apply`,
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ roleNameOverride: 'Custom Admin', forceUpdate: true });
    req.flush({
      roleId: 'role-3',
      roleName: 'Custom Admin',
      appliedPermissions: ['employees.read'],
      rejectedPermissions: [],
      universalPermissions: ['auth.login'],
    });
    expect(result).toEqual({
      roleId: 'role-3',
      roleName: 'Custom Admin',
      appliedPermissions: ['employees.read'],
      rejectedPermissions: [],
      universalPermissions: ['auth.login'],
    });
  });
});
