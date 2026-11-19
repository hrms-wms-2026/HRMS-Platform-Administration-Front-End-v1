import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PlatformRolesService } from './platform-roles.service';
import { environment } from '../../../../environments/environment';

describe('PlatformRolesService', () => {
  let service: PlatformRolesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PlatformRolesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists roles', () => {
    service.listRoles().subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/platform-access/roles`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush([]);
  });

  it('gets a role by id', () => {
    service.getRoleById('role-1').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/platform-access/roles/role-1`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush({
      id: 'role-1',
      name: 'Security Auditor',
      description: 'Read-only audit access',
      isSystemRole: false,
      createdAt: '2026-01-01T00:00:00Z',
      permissions: ['platform.audit.read'],
    });
  });

  it('lists the permission catalog', () => {
    service.listPermissions().subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/platform-access/permissions`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush([]);
  });

  it('sends the new permission set on update', () => {
    service.updateRolePermissions('role-1', ['platform.roles.read', 'platform.roles.manage']).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/platform-access/roles/role-1/permissions`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ permissions: ['platform.roles.read', 'platform.roles.manage'] });
    expect(req.request.withCredentials).toBe(true);
    req.flush(null);
  });
});
