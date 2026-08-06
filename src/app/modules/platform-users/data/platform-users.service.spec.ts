import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PlatformUsersService } from './platform-users.service';
import { environment } from '../../../../environments/environment';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { PlatformUser } from './platform-user.model';

describe('PlatformUsersService', () => {
  let service: PlatformUsersService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PlatformUsersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('requests the platform users list with credentials', () => {
    const mockUsers: PlatformUser[] = [
      {
        id: '1',
        email: 'a@onevo.io',
        fullName: 'A',
        role: 'Platform Manager',
        status: 'active',
        createdAt: '2026-08-01T00:00:00Z',
        lastLoginAt: null,
      },
    ];

    service.list().subscribe((users) => {
      expect(users).toEqual(mockUsers);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}${API_ENDPOINTS.platformUsers.list}`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush(mockUsers);
  });

  it('invite posts email, fullName, and roleIds', () => {
    service.invite('new@example.com', 'New Manager', ['role-1', 'role-2']).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/platform-access/users/invite`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      email: 'new@example.com',
      fullName: 'New Manager',
      roleIds: ['role-1', 'role-2'],
    });
    req.flush(null);
  });

  it('revokeInvite posts to the user-scoped revoke-invite path', () => {
    service.revokeInvite('user-123').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/platform-access/users/user-123/revoke-invite`);
    expect(req.request.method).toBe('POST');
    req.flush(null);
  });

  it('listRoles fetches the roles list', () => {
    service.listRoles().subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/platform-access/roles`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 'role-1', name: 'Manager' }]);
  });
});
