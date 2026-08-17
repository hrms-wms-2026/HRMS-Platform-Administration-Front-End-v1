import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { SupportTicketsService } from './support-tickets.service';
import { environment } from '../../../../environments/environment';

describe('SupportTicketsService', () => {
  let service: SupportTicketsService;
  let httpMock: HttpTestingController;

  const ticketApi = {
    id: 'ticket-1',
    tenant_id: 'tenant-1',
    subject: 'Cannot access dashboard',
    description: 'Getting a 500 error.',
    status: 'open',
    priority: 'high',
    category: 'bug',
    created_by_platform_user_id: 'user-1',
    assigned_to_platform_user_id: null,
    created_at: '2026-08-14T10:00:00Z',
    updated_at: null,
    resolved_at: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SupportTicketsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists support tickets and maps snake_case fields', () => {
    let result: unknown;
    service.list({ status: 'open', priority: 'high', tenantId: 'tenant-1', page: 2, pageSize: 10 })
      .subscribe((response) => (result = response));

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/support/tickets`,
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('status')).toBe('open');
    expect(req.request.params.get('priority')).toBe('high');
    expect(req.request.params.get('tenant_id')).toBe('tenant-1');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('page_size')).toBe('10');
    expect(req.request.withCredentials).toBe(true);

    req.flush({ items: [ticketApi], total: 1, page: 2, page_size: 10 });

    expect(result).toEqual({
      items: [
        {
          id: 'ticket-1',
          tenantId: 'tenant-1',
          subject: 'Cannot access dashboard',
          description: 'Getting a 500 error.',
          status: 'open',
          priority: 'high',
          category: 'bug',
          createdByPlatformUserId: 'user-1',
          assignedToPlatformUserId: null,
          createdAt: '2026-08-14T10:00:00Z',
          updatedAt: null,
          resolvedAt: null,
        },
      ],
      total: 1,
      page: 2,
      pageSize: 10,
    });
  });

  it('gets a ticket detail with comments', () => {
    let result: unknown;
    service.getById('ticket-1').subscribe((detail) => (result = detail));

    const req = httpMock.expectOne(`${environment.apiUrl}/support/tickets/ticket-1`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);

    req.flush({
      ticket: ticketApi,
      comments: [
        {
          id: 'comment-1',
          ticket_id: 'ticket-1',
          author_platform_user_id: 'user-1',
          body: 'Looking into this.',
          is_internal: true,
          created_at: '2026-08-14T11:00:00Z',
        },
      ],
    });

    expect(result).toEqual({
      ticket: {
        id: 'ticket-1',
        tenantId: 'tenant-1',
        subject: 'Cannot access dashboard',
        description: 'Getting a 500 error.',
        status: 'open',
        priority: 'high',
        category: 'bug',
        createdByPlatformUserId: 'user-1',
        assignedToPlatformUserId: null,
        createdAt: '2026-08-14T10:00:00Z',
        updatedAt: null,
        resolvedAt: null,
      },
      comments: [
        {
          id: 'comment-1',
          ticketId: 'ticket-1',
          authorPlatformUserId: 'user-1',
          body: 'Looking into this.',
          isInternal: true,
          createdAt: '2026-08-14T11:00:00Z',
        },
      ],
    });
  });

  it('creates a support ticket with snake_case body', () => {
    service
      .create({
        tenantId: 'tenant-1',
        subject: 'Cannot access dashboard',
        description: 'Getting a 500 error.',
        priority: 'high',
        category: 'bug',
      })
      .subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/support/tickets`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      tenant_id: 'tenant-1',
      subject: 'Cannot access dashboard',
      description: 'Getting a 500 error.',
      priority: 'high',
      category: 'bug',
    });
    expect(req.request.withCredentials).toBe(true);
    req.flush(ticketApi);
  });

  it('updates ticket status', () => {
    service.updateStatus('ticket-1', 'resolved').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/support/tickets/ticket-1/status`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'resolved' });
    expect(req.request.withCredentials).toBe(true);
    req.flush({ ...ticketApi, status: 'resolved' });
  });

  it('adds a comment with is_internal mapped from the boolean flag', () => {
    service.addComment('ticket-1', 'Fixed by redeploying.', false).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/support/tickets/ticket-1/comments`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ body: 'Fixed by redeploying.', is_internal: false });
    expect(req.request.withCredentials).toBe(true);
    req.flush({
      id: 'comment-1',
      ticket_id: 'ticket-1',
      author_platform_user_id: 'user-1',
      body: 'Fixed by redeploying.',
      is_internal: false,
      created_at: '2026-08-14T12:00:00Z',
    });
  });
});
