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

  it('lists admin actions with server-side paging and filters, mapping the wire shape', () => {
    let result: unknown;
    const from = new Date('2026-11-01T00:00:00Z');
    const to = new Date('2026-11-08T00:00:00Z');
    service
      .listAdminActions({ page: 2, pageSize: 25, targetType: 'platform_role', outcome: 'failed', from, to })
      .subscribe((page) => (result = page));

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/audit-logs`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('page_size')).toBe('25');
    expect(req.request.params.get('target_type')).toBe('platform_role');
    expect(req.request.params.get('outcome')).toBe('failed');
    expect(req.request.params.get('from')).toBe(from.toISOString());
    expect(req.request.params.get('to')).toBe(to.toISOString());
    expect(req.request.params.has('tenant_id')).toBe(false);

    req.flush({
      items: [
        {
          id: 'a1',
          createdAt: '2026-11-05T10:00:00Z',
          actorPlatformUserId: 'u1',
          actorEmail: 'admin@example.com',
          actorName: 'Platform Admin',
          action: 'platform_role.permissions_updated',
          targetType: 'platform_role',
          targetId: 'r1',
          targetTenantId: null,
          outcome: 'failed',
          failureReason: '409',
          beforeJson: '{"permissions":["a"]}',
          afterJson: null,
          ipAddress: '203.0.113.7',
          userAgent: 'Mozilla/5.0',
          correlationId: 'c1',
        },
      ],
      totalCount: 26,
      page: 2,
      pageSize: 25,
    });

    expect(result).toEqual({
      items: [
        {
          id: 'a1',
          createdAt: '2026-11-05T10:00:00Z',
          actorPlatformUserId: 'u1',
          actorEmail: 'admin@example.com',
          actorName: 'Platform Admin',
          action: 'platform_role.permissions_updated',
          targetType: 'platform_role',
          targetId: 'r1',
          targetTenantId: null,
          outcome: 'failed',
          failureReason: '409',
          before: { permissions: ['a'] },
          after: null,
          ipAddress: '203.0.113.7',
          userAgent: 'Mozilla/5.0',
          correlationId: 'c1',
        },
      ],
      totalCount: 26,
      page: 2,
      pageSize: 25,
    });
  });

  it('sends only paging when no admin action filters are set', () => {
    service.listAdminActions({ page: 1, pageSize: 25, outcome: '' }).subscribe();

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/audit-logs`);
    expect(req.request.params.keys().sort()).toEqual(['page', 'page_size']);
    req.flush({ items: [], totalCount: 0, page: 1, pageSize: 25 });
  });
});
