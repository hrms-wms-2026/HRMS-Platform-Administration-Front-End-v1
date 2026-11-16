import { RichTextEditorComponent } from '../../../../shared/ui/rich-text-editor/rich-text-editor.component';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { SupportTicketDetail } from './support-ticket-detail';
import { SupportTicketsService } from '../../data/support-tickets.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';

describe('SupportTicketDetail', () => {
  let ticketsService: {
    getById: jest.Mock;
    update: jest.Mock;
    updateStatus: jest.Mock;
    assign: jest.Mock;
    addComment: jest.Mock;
    uploadAttachment: jest.Mock;
    getAttachmentDownloadUrl: jest.Mock;
    listAssignees: jest.Mock;
  };
  let notificationService: { success: jest.Mock; error: jest.Mock };

  const ticket = {
    id: 'ticket-1',
    tenantId: 'tenant-1',
    tenantName: 'Acme Corp',
    subject: 'Cannot access dashboard',
    description: 'Getting a 500 error.',
    status: 'open',
    priority: 'high',
    category: 'bug',
    createdByPlatformUserId: null,
    createdByUserId: 'tenant-user-1',
    createdByName: 'Anu Owner',
    assignedToPlatformUserId: null,
    assignedToName: null,
    awaitingSupport: true,
    createdAt: '2026-08-14T10:00:00Z',
    updatedAt: null,
    resolvedAt: null,
  };

  const tenantComment = {
    id: 'comment-0',
    ticketId: 'ticket-1',
    authorPlatformUserId: null,
    authorUserId: 'tenant-user-1',
    authorName: 'Anu Owner',
    body: 'Any update?',
    isInternal: false,
    createdAt: '2026-08-14T10:30:00Z',
  };

  const attachment = {
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
  };

  let ticketDescriptionOverride: string | null = null;

  function setup(permissions: string[] = ['platform.support.read', 'platform.support.manage']) {
    ticketsService = {
      getById: jest.fn().mockReturnValue(
        of({ ticket: ticketDescriptionOverride ? { ...ticket, description: ticketDescriptionOverride } : ticket, comments: [tenantComment], attachments: [attachment] }),
      ),
      update: jest.fn(),
      updateStatus: jest.fn(),
      assign: jest.fn(),
      addComment: jest.fn(),
      uploadAttachment: jest.fn(),
      getAttachmentDownloadUrl: jest.fn(),
      listAssignees: jest.fn().mockReturnValue(of([{ id: 'staff-1', fullName: 'Priya Support', email: 'p@x.test' }])),
    };
    notificationService = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [SupportTicketDetail],
      providers: [
        { provide: SupportTicketsService, useValue: ticketsService },
        { provide: NotificationService, useValue: notificationService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'ticket-1' }) } },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SupportTicketDetail);
    const store = TestBed.inject(PermissionStore);
    store.setAuthorizationContext({
      userId: 'u1',
      email: 'admin@example.com',
      platformRole: 'Platform Super Admin',
      expiresAt: '',
      mfaRequired: false,
      permissions,
      scopes: {},
      entitlements: [],
    });
    fixture.detectChanges();
    return fixture;
  }

  function fileChangeEvent(file: File): Event {
    const input = document.createElement('input');
    input.type = 'file';
    Object.defineProperty(input, 'files', { value: [file] });
    return { target: input } as unknown as Event;
  }

  it('loads and displays the ticket with tenant name, raiser, comments and files', () => {
    const fixture = setup();
    expect(ticketsService.getById).toHaveBeenCalledWith('ticket-1');
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Cannot access dashboard');
    expect(text).toContain('Acme Corp');
    expect(text).toContain('Anu Owner');
    expect(text).toContain('From tenant');
    expect(text).toContain('error.png');
    expect(text).toContain('2.0 KB');
  });

  it('hides management controls without manage permission and skips the assignee lookup', () => {
    const fixture = setup(['platform.support.read']);
    const text = fixture.nativeElement.textContent;
    expect(text).not.toContain('Post Comment');
    expect(text).not.toContain('Attach file');
    expect(fixture.nativeElement.querySelector('#assignee')).toBeNull();
    expect(ticketsService.listAssignees).not.toHaveBeenCalled();
  });

  it('updates the status and merges the returned ticket into the view', () => {
    const fixture = setup();
    ticketsService.updateStatus.mockReturnValue(of({ ...ticket, status: 'resolved' }));

    fixture.componentInstance['changeStatus']('resolved');

    expect(ticketsService.updateStatus).toHaveBeenCalledWith('ticket-1', 'resolved');
    expect(notificationService.success).toHaveBeenCalledWith('Ticket status updated.');
    expect(fixture.componentInstance['detail']()!.ticket.status).toBe('resolved');
  });

  it('shows a backend error when the status update fails', () => {
    const fixture = setup();
    ticketsService.updateStatus.mockReturnValue(
      throwError(() => new HttpErrorResponse({ error: { detail: 'Cannot reopen a closed ticket.' } })),
    );

    fixture.componentInstance['changeStatus']('open');

    expect(notificationService.error).toHaveBeenCalledWith('Cannot reopen a closed ticket.');
  });

  it('assigns the ticket and clears it again with the empty option', () => {
    const fixture = setup();
    ticketsService.assign.mockReturnValueOnce(
      of({ ...ticket, assignedToPlatformUserId: 'staff-1', assignedToName: 'Priya Support' }),
    );

    fixture.componentInstance['changeAssignee']('staff-1');
    expect(ticketsService.assign).toHaveBeenCalledWith('ticket-1', 'staff-1');
    expect(notificationService.success).toHaveBeenCalledWith('Assigned to Priya Support.');
    expect(fixture.componentInstance['detail']()!.ticket.assignedToName).toBe('Priya Support');

    ticketsService.assign.mockReturnValueOnce(of(ticket));
    fixture.componentInstance['changeAssignee']('');
    expect(ticketsService.assign).toHaveBeenLastCalledWith('ticket-1', null);
    expect(notificationService.success).toHaveBeenLastCalledWith('Ticket unassigned.');
  });

  it('does not post a comment when the form is invalid', () => {
    const fixture = setup();

    fixture.componentInstance['submitComment']();

    expect(ticketsService.addComment).not.toHaveBeenCalled();
  });

  it('posts a comment and appends it to the thread', () => {
    const fixture = setup();
    const newComment = {
      id: 'comment-1',
      ticketId: 'ticket-1',
      authorPlatformUserId: 'staff-1',
      authorUserId: null,
      authorName: 'Priya Support',
      body: 'Looking into this.',
      isInternal: true,
      createdAt: '2026-08-14T11:00:00Z',
    };
    ticketsService.addComment.mockReturnValue(of(newComment));

    const component = fixture.componentInstance;
    component['commentForm'].setValue({ body: 'Looking into this.', isInternal: true });
    component['submitComment']();

    expect(ticketsService.addComment).toHaveBeenCalledWith('ticket-1', 'Looking into this.', true);
    expect(component['detail']()!.comments).toEqual([tenantComment, newComment]);
  });

  it('uploads a selected file with the internal flag and appends it', () => {
    const fixture = setup();
    const uploaded = { ...attachment, id: 'file-2', fileName: 'notes.pdf', isInternal: true };
    ticketsService.uploadAttachment.mockReturnValue(of(uploaded));
    const file = new File(['x'], 'notes.pdf', { type: 'application/pdf' });

    fixture.componentInstance['uploadInternal'].set(true);
    fixture.componentInstance['onFileSelected'](fileChangeEvent(file));

    expect(ticketsService.uploadAttachment).toHaveBeenCalledWith('ticket-1', file, true);
    expect(fixture.componentInstance['detail']()!.attachments).toEqual([attachment, uploaded]);
    expect(fixture.componentInstance['uploading']()).toBe(false);
  });

  it('rejects files over 25 MB before uploading', () => {
    const fixture = setup();
    const big = new File(['x'], 'huge.zip');
    Object.defineProperty(big, 'size', { value: 25 * 1024 * 1024 + 1 });

    fixture.componentInstance['onFileSelected'](fileChangeEvent(big));

    expect(ticketsService.uploadAttachment).not.toHaveBeenCalled();
    expect(notificationService.error).toHaveBeenCalledWith('Files must be 25 MB or smaller.');
  });

  it('opens the signed download url in a new tab', () => {
    const fixture = setup();
    const open = jest.spyOn(window, 'open').mockImplementation(() => null);
    ticketsService.getAttachmentDownloadUrl.mockReturnValue(
      of({ url: 'https://files.example/signed', expiresAt: '2026-08-14T12:05:00Z' }),
    );

    fixture.componentInstance['download'](attachment);

    expect(ticketsService.getAttachmentDownloadUrl).toHaveBeenCalledWith('ticket-1', 'file-1');
    expect(open).toHaveBeenCalledWith('https://files.example/signed', '_blank', 'noopener');
    open.mockRestore();
  });

  it('shows the awaiting-support badge while the ticket waits on support', () => {
    const fixture = setup();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Awaiting support');
  });

  it('edits the ticket inline and merges the saved ticket into the view', () => {
    const fixture = setup();
    fixture.detectChanges();
    const component = fixture.componentInstance;
    ticketsService.update.mockReturnValue(
      of({ ...ticket, subject: 'Dashboard returns 500', priority: 'urgent', category: null }),
    );

    component['startEdit']();
    expect(component['editing']()).toBe(true);
    expect(component['editForm'].getRawValue()).toEqual({
      subject: 'Cannot access dashboard',
      description: 'Getting a 500 error.',
      priority: 'high',
      category: 'bug',
    });

    component['editForm'].patchValue({ subject: '  Dashboard returns 500 ', priority: 'urgent', category: ' ' });
    component['saveEdit']();

    expect(ticketsService.update).toHaveBeenCalledWith('ticket-1', {
      subject: 'Dashboard returns 500',
      description: 'Getting a 500 error.',
      priority: 'urgent',
      category: null,
    });
    expect(component['editing']()).toBe(false);
    expect(component['detail']()!.ticket.subject).toBe('Dashboard returns 500');
    expect(notificationService.success).toHaveBeenCalledWith('Ticket updated.');
  });

  it('keeps the edit form open and shows the backend error when saving fails', () => {
    const fixture = setup();
    fixture.detectChanges();
    const component = fixture.componentInstance;
    ticketsService.update.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { detail: 'subject is required.' } })),
    );

    component['startEdit']();
    component['saveEdit']();

    expect(component['editing']()).toBe(true);
    expect(notificationService.error).toHaveBeenCalledWith('subject is required.');
  });

  it('does not offer Edit without manage permission', () => {
    const fixture = setup(['platform.support.read']);
    fixture.detectChanges();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    expect(buttons.some((button) => button.textContent?.trim() === 'Edit')).toBe(false);
  });

  // DEC-035: descriptions and comments are rich text; older plain text keeps its line breaks.
  it('renders a rich description and old plain-text comments through the rich text view', () => {
    ticketDescriptionOverride = '<ul><li>First</li><li>Second</li></ul>';
    const fixture = setup();
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelectorAll('[data-testid="rich-text-html"] li').length).toBe(2);
    expect(host.querySelector('[data-testid="rich-text-plain"]')!.textContent).toContain('Any update?');
    ticketDescriptionOverride = null;
  });

  it('posts the comment editor HTML and clears the editor afterwards', () => {
    const fixture = setup();
    fixture.detectChanges();
    ticketsService.addComment.mockReturnValue(of({ ...tenantComment, id: 'c2', body: '<p>Fixed</p>' }));
    const component = fixture.componentInstance;
    const before = component['commentEditorVersion']();

    component['onCommentChange']('<p>Fixed</p>');
    component['submitComment']();

    expect(ticketsService.addComment).toHaveBeenCalledWith('ticket-1', '<p>Fixed</p>', false);
    expect(component['commentEditorVersion']()).toBe(before + 1);
  });

  it('edits the description in the editor seeded with the saved text', () => {
    const fixture = setup();
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['startEdit']();
    fixture.detectChanges();
    const editors = fixture.debugElement.queryAll(By.directive(RichTextEditorComponent))
      .map((d) => d.componentInstance as RichTextEditorComponent);

    expect(editors.some((e) => e.initialHtml() === 'Getting a 500 error.')).toBe(true);
    component['onEditDescriptionChange']('<p>New text</p>');
    expect(component['editForm'].controls.description.value).toBe('<p>New text</p>');
  });
});
