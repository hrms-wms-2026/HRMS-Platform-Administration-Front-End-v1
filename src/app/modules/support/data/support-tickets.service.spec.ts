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
    tenant_name: 'Acme',
    subject: 'Cannot access dashboard',
    description: 'Getting a 500 error.',
    status: 'open',
    priority: 'high',
    category: 'bug',
    created_by_platform_user_id: null,
    created_by_user_id: 'tenant-user-1',
    created_by_name: 'Anu Owner',
    assigned_to_platform_user_id: 'staff-1',
    assigned_to_name: 'Priya Support',
    awaiting_support: true,
    created_at: '2026-08-14T10:00:00Z',
    updated_at: null,
    resolved_at: null,
  };

  const ticket = {
    id: 'ticket-1',
    tenantId: 'tenant-1',
    tenantName: 'Acme',
    subject: 'Cannot access dashboard',
    description: 'Getting a 500 error.',
    status: 'open',
    priority: 'high',
    category: 'bug',
    createdByPlatformUserId: null,
    createdByUserId: 'tenant-user-1',
    createdByName: 'Anu Owner',
    assignedToPlatformUserId: 'staff-1',
    assignedToName: 'Priya Support',
    awaitingSupport: true,
    createdAt: '2026-08-14T10:00:00Z',
    updatedAt: null,
    resolvedAt: null,
  };

  const attachmentApi = {
    id: 'file-1',
    ticket_id: 'ticket-1',
    file_name: 'error.png',
    content_type: 'image/png',
    size_bytes: 2048,
    is_internal: false,
    uploaded_by_platform_user_id: null,
    uploaded_by_user_id: 'tenant-user-1',
    uploaded_by_name: 'Anu Owner',
    created_at: '2026-08-14T10:05:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SupportTicketsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists support tickets with every filter and maps snake_case fields', () => {
    let result: unknown;
    service
      .list({
        status: 'open',
        priority: 'high',
        tenantId: 'tenant-1',
        assignee: 'unassigned',
        search: '  dashboard ',
        awaitingSupport: true,
        page: 2,
        pageSize: 10,
      })
      .subscribe((response) => (result = response));

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/support/tickets`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('status')).toBe('open');
    expect(req.request.params.get('priority')).toBe('high');
    expect(req.request.params.get('tenant_id')).toBe('tenant-1');
    expect(req.request.params.get('assignee')).toBe('unassigned');
    expect(req.request.params.get('search')).toBe('dashboard');
    expect(req.request.params.get('awaiting_support')).toBe('true');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('page_size')).toBe('10');
    expect(req.request.withCredentials).toBe(true);

    req.flush({ items: [ticketApi], total: 1, page: 2, page_size: 10 });

    expect(result).toEqual({ items: [ticket], total: 1, page: 2, pageSize: 10 });
  });

  it('omits empty filters', () => {
    service.list({ status: '', assignee: '', search: '   ' }).subscribe();

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/support/tickets`);
    expect(req.request.params.keys()).toEqual([]);
    req.flush({ items: [], total: 0, page: 1, page_size: 25 });
  });

  it('gets a ticket detail with comments and attachments', () => {
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
          author_platform_user_id: 'staff-1',
          author_user_id: null,
          author_name: 'Priya Support',
          body: 'Looking into this.',
          is_internal: true,
          created_at: '2026-08-14T11:00:00Z',
        },
      ],
      attachments: [attachmentApi],
    });

    expect(result).toEqual({
      ticket,
      comments: [
        {
          id: 'comment-1',
          ticketId: 'ticket-1',
          authorPlatformUserId: 'staff-1',
          authorUserId: null,
          authorName: 'Priya Support',
          body: 'Looking into this.',
          isInternal: true,
          createdAt: '2026-08-14T11:00:00Z',
        },
      ],
      attachments: [
        {
          id: 'file-1',
          ticketId: 'ticket-1',
          fileName: 'error.png',
          contentType: 'image/png',
          sizeBytes: 2048,
          isInternal: false,
          uploadedByPlatformUserId: null,
          uploadedByUserId: 'tenant-user-1',
          uploadedByName: 'Anu Owner',
          createdAt: '2026-08-14T10:05:00Z',
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

  it('edits a ticket with PUT and a snake_case body', () => {
    let result: { subject: string } | undefined;
    service
      .update('ticket-1', { subject: 'New subject', description: 'More detail', priority: 'urgent', category: null })
      .subscribe((ticket) => (result = ticket));

    const req = httpMock.expectOne(`${environment.apiUrl}/support/tickets/ticket-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      subject: 'New subject',
      description: 'More detail',
      priority: 'urgent',
      category: null,
    });
    expect(req.request.withCredentials).toBe(true);
    req.flush({ ...ticketApi, subject: 'New subject' });
    expect(result?.subject).toBe('New subject');
  });

  it('gets the support summary for the bell', () => {
    let result: unknown;
    service.getSummary().subscribe((summary) => (result = summary));

    const req = httpMock.expectOne(`${environment.apiUrl}/support/summary`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ awaiting_support: 4, awaiting_support_assigned_to_me: 1, open_unassigned: 2 });

    expect(result).toEqual({ awaitingSupport: 4, awaitingSupportAssignedToMe: 1, openUnassigned: 2 });
  });

  it('updates ticket status', () => {
    service.updateStatus('ticket-1', 'resolved').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/support/tickets/ticket-1/status`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'resolved' });
    expect(req.request.withCredentials).toBe(true);
    req.flush({ ...ticketApi, status: 'resolved' });
  });

  it('assigns and clears the assignee', () => {
    service.assign('ticket-1', 'staff-2').subscribe();
    const assign = httpMock.expectOne(`${environment.apiUrl}/support/tickets/ticket-1/assignee`);
    expect(assign.request.method).toBe('PATCH');
    expect(assign.request.body).toEqual({ assigned_to_platform_user_id: 'staff-2' });
    assign.flush(ticketApi);

    service.assign('ticket-1', null).subscribe();
    const clear = httpMock.expectOne(`${environment.apiUrl}/support/tickets/ticket-1/assignee`);
    expect(clear.request.body).toEqual({ assigned_to_platform_user_id: null });
    clear.flush({ ...ticketApi, assigned_to_platform_user_id: null, assigned_to_name: null });
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
      author_platform_user_id: 'staff-1',
      author_user_id: null,
      author_name: 'Priya Support',
      body: 'Fixed by redeploying.',
      is_internal: false,
      created_at: '2026-08-14T12:00:00Z',
    });
  });

  it('uploads an attachment as multipart form data', () => {
    let fileName = '';
    const file = new File(['hello'], 'notes.pdf', { type: 'application/pdf' });
    service.uploadAttachment('ticket-1', file, true).subscribe((attachment) => (fileName = attachment.fileName));

    const req = httpMock.expectOne(`${environment.apiUrl}/support/tickets/ticket-1/attachments`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    const body = req.request.body as FormData;
    expect((body.get('file') as File).name).toBe('notes.pdf');
    expect(body.get('is_internal')).toBe('true');
    req.flush({ ...attachmentApi, file_name: 'notes.pdf' });

    expect(fileName).toBe('notes.pdf');
  });

  it('gets a short-lived attachment download url', () => {
    let url = '';
    service.getAttachmentDownloadUrl('ticket-1', 'file-1').subscribe((download) => (url = download.url));

    const req = httpMock.expectOne(`${environment.apiUrl}/support/tickets/ticket-1/attachments/file-1/download-url`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ url: 'https://files.example/signed', expires_at: '2026-08-14T12:05:00Z' });

    expect(url).toBe('https://files.example/signed');
  });

  it('lists assignees', () => {
    let result: unknown;
    service.listAssignees().subscribe((items) => (result = items));

    const req = httpMock.expectOne(`${environment.apiUrl}/support/assignees`);
    expect(req.request.withCredentials).toBe(true);
    req.flush([{ id: 'staff-1', full_name: 'Priya Support', email: 'priya@crownus.test' }]);

    expect(result).toEqual([{ id: 'staff-1', fullName: 'Priya Support', email: 'priya@crownus.test' }]);
  });
});
