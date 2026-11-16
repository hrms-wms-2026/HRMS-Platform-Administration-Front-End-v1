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
    audience: 'all',
    starts_at: null,
    ends_at: null,
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
          audience: 'all',
          startsAt: null,
          endsAt: null,
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

  it('creates an announcement', () => {
    service
      .create({
        title: 'Scheduled maintenance',
        body: 'Down for 1 hour on Saturday.',
        severity: 'warning',
        audience: 'all',
        startsAt: '2026-08-15T08:00:00.000Z',
        endsAt: null,
      })
      .subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/support/announcements`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      title: 'Scheduled maintenance',
      body: 'Down for 1 hour on Saturday.',
      severity: 'warning',
      audience: 'all',
      starts_at: '2026-08-15T08:00:00.000Z',
      ends_at: null,
    });
    req.flush(announcementApi);
  });

  it('gets one announcement and maps its display window', () => {
    let result: { startsAt: string | null; endsAt: string | null } | undefined;
    service.getById('announcement-1').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${environment.apiUrl}/support/announcements/announcement-1`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ ...announcementApi, starts_at: '2026-08-15T08:00:00Z', ends_at: '2026-08-15T12:00:00Z' });

    expect(result?.startsAt).toBe('2026-08-15T08:00:00Z');
    expect(result?.endsAt).toBe('2026-08-15T12:00:00Z');
  });

  it('updates an announcement with PUT', () => {
    service
      .update('announcement-1', {
        title: 'Updated',
        body: 'New body',
        severity: 'info',
        audience: 'tenants',
        startsAt: null,
        endsAt: '2026-08-16T00:00:00.000Z',
      })
      .subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/support/announcements/announcement-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      title: 'Updated',
      body: 'New body',
      severity: 'info',
      audience: 'tenants',
      starts_at: null,
      ends_at: '2026-08-16T00:00:00.000Z',
    });
    req.flush(announcementApi);
  });

  it('deletes an announcement', () => {
    let done = false;
    service.remove('announcement-1').subscribe(() => (done = true));

    const req = httpMock.expectOne(`${environment.apiUrl}/support/announcements/announcement-1`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.withCredentials).toBe(true);
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(done).toBe(true);
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
