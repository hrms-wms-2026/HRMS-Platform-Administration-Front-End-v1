import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuditLogsService } from './audit-logs.service';
import { environment } from '../../../../environments/environment';

describe('AuditLogsService', () => {
  let service: AuditLogsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuditLogsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists platform auth events', () => {
    let result: unknown;
    service.list().subscribe((events) => (result = events));

    const req = httpMock.expectOne(`${environment.apiUrl}/platform-access/auth-events`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);

    const event = {
      id: 'event-1',
      userId: 'user-1',
      userEmail: 'admin@example.com',
      userFullName: 'Platform Admin',
      eventType: 'login_succeeded',
      sourceIp: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      createdAt: '2026-01-01T00:00:00Z',
    };
    req.flush([event]);

    expect(result).toEqual([event]);
  });
});
