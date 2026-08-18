import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PlatformNotificationsService } from './platform-notifications.service';
import { environment } from '../../../../environments/environment';

describe('PlatformNotificationsService', () => {
  let service: PlatformNotificationsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PlatformNotificationsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists notifications with unreadOnly and page params', () => {
    service.list(true, 2).subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/notifications`,
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('unreadOnly')).toBe('true');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.withCredentials).toBe(true);
    req.flush([]);
  });

  it('fetches the unread count', () => {
    let result: { count: number } | undefined;
    service.unreadCount().subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${environment.apiUrl}/notifications/unread-count`);
    expect(req.request.method).toBe('GET');
    req.flush({ count: 5 });

    expect(result).toEqual({ count: 5 });
  });

  it('marks a notification read', () => {
    service.markRead('notif-1').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/notifications/notif-1/read`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    req.flush(null);
  });

  it('marks all notifications read', () => {
    service.markAllRead().subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/notifications/read-all`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    req.flush(null);
  });
});
