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

  it('updates a provisioning tenant draft', () => {
    let completed = false;
    service
      .updateTenant('tenant-1', {
        name: 'Acme Inc',
        slug: 'acme',
        industryProfile: 'technology',
      })
      .subscribe(() => (completed = true));

    const req = httpMock.expectOne(`${environment.apiUrl}/tenants/tenant-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      name: 'Acme Inc',
      slug: 'acme',
      industryProfile: 'technology',
    });
    req.flush(null);
    expect(completed).toBe(true);
  });

  it('invites a tenant admin', () => {
    let result: unknown;
    service
      .inviteAdmin('tenant-1', {
        email: 'owner@acme.example',
        firstName: 'Owner',
        lastName: 'Person',
        roleId: 'role-1',
      })
      .subscribe((response) => (result = response));

    const req = httpMock.expectOne(`${environment.apiUrl}/tenants/tenant-1/invite-admin`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      email: 'owner@acme.example',
      first_name: 'Owner',
      last_name: 'Person',
      role_id: 'role-1',
    });
    req.flush({ userId: 'user-1', inviteExpiresAt: '2026-01-02T00:00:00Z' });
    expect(result).toEqual({ userId: 'user-1', inviteExpiresAt: '2026-01-02T00:00:00Z' });
  });
});
