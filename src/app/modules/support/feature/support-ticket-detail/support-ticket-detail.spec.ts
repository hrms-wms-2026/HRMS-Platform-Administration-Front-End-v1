import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { SupportTicketDetail } from './support-ticket-detail';
import { SupportTicketsService } from '../../data/support-tickets.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';

describe('SupportTicketDetail', () => {
  let ticketsService: { getById: jest.Mock; updateStatus: jest.Mock; addComment: jest.Mock };
  let notificationService: { success: jest.Mock; error: jest.Mock };

  const ticket = {
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
  };

  function setup(permissions: string[] = ['platform.support.read', 'platform.support.manage']) {
    ticketsService = {
      getById: jest.fn().mockReturnValue(of({ ticket, comments: [] })),
      updateStatus: jest.fn(),
      addComment: jest.fn(),
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

  it('loads and displays the ticket', () => {
    const fixture = setup();
    expect(ticketsService.getById).toHaveBeenCalledWith('ticket-1');
    expect(fixture.nativeElement.textContent).toContain('Cannot access dashboard');
  });

  it('hides the status control and reply form without manage permission', () => {
    const fixture = setup(['platform.support.read']);
    expect(fixture.nativeElement.textContent).not.toContain('Post Comment');
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
      authorPlatformUserId: 'user-1',
      body: 'Looking into this.',
      isInternal: true,
      createdAt: '2026-08-14T11:00:00Z',
    };
    ticketsService.addComment.mockReturnValue(of(newComment));

    const component = fixture.componentInstance;
    component['commentForm'].setValue({ body: 'Looking into this.', isInternal: true });
    component['submitComment']();

    expect(ticketsService.addComment).toHaveBeenCalledWith('ticket-1', 'Looking into this.', true);
    expect(component['detail']()!.comments).toEqual([newComment]);
  });
});
