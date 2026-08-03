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
        isActive: true,
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
});
