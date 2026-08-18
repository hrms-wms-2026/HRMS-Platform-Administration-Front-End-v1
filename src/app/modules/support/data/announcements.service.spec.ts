import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AnnouncementsService } from './announcements.service';
import { environment } from '../../../../environments/environment';

describe('AnnouncementsService', () => {
  let service: AnnouncementsService;
  let httpMock: HttpTestingController;

  const announcementApi = {
    id: 'announcement-1',
    title: 'Scheduled maintenance',
    body: 'Down for 1 hour on Saturday.',
    severity: 'warning',
    audienceScope: 'platform_wide',
    platformAdminScope: null,
    platformRoleIds: [],
    tenantScope: null,
    tenantIds: [],
    recipientScope: null,
    tenantRoleTargets: [],
    sendEmail: false,
    is_published: false,
    published_at: null,
    created_at: '2026-08-14T10:00:00Z',
    updated_at: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AnnouncementsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists announcements and maps snake_case fields', () => {
    let result: unknown;
    service.list({ isPublished: false, severity: 'warning', page: 1, pageSize: 25 }).subscribe((r) => (result = r));

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/support/announcements`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('is_published')).toBe('false');
    expect(req.request.params.get('severity')).toBe('warning');
    expect(req.request.withCredentials).toBe(true);

    req.flush({ items: [announcementApi], total: 1, page: 1, page_size: 25 });

    expect(result).toEqual({
      items: [
        {
          id: 'announcement-1',
          title: 'Scheduled maintenance',
          body: 'Down for 1 hour on Saturday.',
          severity: 'warning',
          audienceScope: 'platform_wide',
          platformAdminScope: null,
          platformRoleIds: [],
          tenantScope: null,
          tenantIds: [],
          recipientScope: null,
          tenantRoleTargets: [],
          sendEmail: false,
          isPublished: false,
          publishedAt: null,
          createdAt: '2026-08-14T10:00:00Z',
          updatedAt: null,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 25,
    });
  });

  it('creates an announcement with tenant role targets', () => {
    service
      .create({
        title: 'Scheduled maintenance',
        body: 'Down for 1 hour on Saturday.',
        severity: 'warning',
        audienceScope: 'tenant_users',
        tenantScope: 'selected_tenants',
        tenantIds: ['tenant-1'],
        recipientScope: 'selected_roles',
        tenantRoleTargets: [{ tenantId: 'tenant-1', roleId: 'role-1' }],
        sendEmail: true,
      })
      .subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/support/announcements`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      title: 'Scheduled maintenance',
      body: 'Down for 1 hour on Saturday.',
      severity: 'warning',
      audienceScope: 'tenant_users',
      platformAdminScope: undefined,
      platformRoleIds: undefined,
      tenantScope: 'selected_tenants',
      tenantIds: ['tenant-1'],
      recipientScope: 'selected_roles',
      tenantRoleTargets: [{ tenantId: 'tenant-1', roleId: 'role-1' }],
      sendEmail: true,
    });
    req.flush(announcementApi);
  });

  it('publishes an announcement', () => {
    service.publish('announcement-1').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/support/announcements/announcement-1/publish`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ ...announcementApi, is_published: true, published_at: '2026-08-17T12:00:00Z' });
  });

  it('unpublishes an announcement', () => {
    service.unpublish('announcement-1').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/support/announcements/announcement-1/unpublish`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ ...announcementApi, is_published: false });
  });
});
