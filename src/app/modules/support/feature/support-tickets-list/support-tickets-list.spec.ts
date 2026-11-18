import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { SupportTicketsList } from './support-tickets-list';
import { SupportTicketsService } from '../../data/support-tickets.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { SessionService } from '../../../../core/auth/session.service';

describe('SupportTicketsList', () => {
  let ticketsService: { list: jest.Mock; listAssignees: jest.Mock };

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

  const emptyPage = { items: [], total: 0, page: 1, pageSize: 25 };

  function setup(permissions: string[] = ['platform.support.read'], queryParams: Record<string, string> = {}) {
    ticketsService = {
      list: jest.fn().mockReturnValue(of(emptyPage)),
      listAssignees: jest.fn().mockReturnValue(of([{ id: 'staff-1', fullName: 'Priya Support', email: 'p@x.test' }])),
    };

    TestBed.configureTestingModule({
      imports: [SupportTicketsList],
      providers: [
        provideRouter([]),
        { provide: SupportTicketsService, useValue: ticketsService },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SupportTicketsList);
    const store = TestBed.inject(PermissionStore);
    store.setAuthorizationContext({
      userId: 'u1',
      email: 'admin@example.com',
      platformRole: 'Platform Super Admin',
      expiresAt: '',
      mfaRequired: false,
      mfaEnrollmentRequired: false,
      permissions,
      scopes: {},
      entitlements: [],
    });
    return fixture;
  }

  const baseQuery = {
    status: '',
    priority: '',
    assignee: '',
    search: '',
    awaitingSupport: false,
    page: 1,
    pageSize: 25,
  };

  it('does not call the API and shows the no-permission message when unauthorized', () => {
    const fixture = setup([]);
    fixture.detectChanges();

    expect(ticketsService.list).not.toHaveBeenCalled();
    expect(ticketsService.listAssignees).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('No permission to view page');
  });

  it('loads tickets on init and shows tenant name, raiser and assignee', () => {
    const fixture = setup();
    ticketsService.list.mockReturnValue(of({ items: [ticket], total: 1, page: 1, pageSize: 25 }));
    fixture.detectChanges();

    expect(ticketsService.list).toHaveBeenCalledWith(baseQuery);
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Cannot access dashboard');
    expect(text).toContain('Acme Corp');
    expect(text).toContain('Anu Owner');
    expect(text).toContain('Tenant');
    expect(text).toContain('Unassigned');
  });

  it('fills the assignee filter from the assignee list', () => {
    const fixture = setup();
    fixture.detectChanges();

    const options = Array.from(
      fixture.nativeElement.querySelectorAll('select[aria-label="Filter by assignee"] option'),
    ).map((option) => (option as HTMLOptionElement).textContent?.trim());
    expect(options).toEqual(['All Assignees', 'Unassigned', 'Priya Support']);
  });

  it('still lists tickets when the assignee list fails', () => {
    const fixture = setup();
    ticketsService.listAssignees.mockReturnValue(throwError(() => new Error('boom')));
    fixture.detectChanges();

    expect(ticketsService.list).toHaveBeenCalled();
    expect(fixture.componentInstance['assignees']()).toEqual([]);
  });

  it('resets to page 1 and re-queries when the status filter changes', () => {
    const fixture = setup();
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['goToPage'](3);
    component['onStatusFilterChange']('resolved');

    expect(component['currentPage']()).toBe(1);
    expect(ticketsService.list).toHaveBeenLastCalledWith({ ...baseQuery, status: 'resolved' });
  });

  it('filters by assignee, including unassigned', () => {
    const fixture = setup();
    fixture.detectChanges();

    fixture.componentInstance['onAssigneeFilterChange']('unassigned');

    expect(ticketsService.list).toHaveBeenLastCalledWith({ ...baseQuery, assignee: 'unassigned' });
  });

  it('debounces the subject search', () => {
    jest.useFakeTimers();
    try {
      const fixture = setup();
      fixture.detectChanges();
      ticketsService.list.mockClear();

      fixture.componentInstance['onSearchChange']('dash');
      fixture.componentInstance['onSearchChange']('dashboard');
      expect(ticketsService.list).not.toHaveBeenCalled();

      jest.advanceTimersByTime(300);
      expect(ticketsService.list).toHaveBeenCalledTimes(1);
      expect(ticketsService.list).toHaveBeenCalledWith({ ...baseQuery, search: 'dashboard' });
    } finally {
      jest.useRealTimers();
    }
  });

  it('hides the Create Ticket link without platform.support.manage', () => {
    const fixture = setup(['platform.support.read']);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Create Ticket');
  });

  it('shows the Create Ticket link with platform.support.manage', () => {
    const fixture = setup(['platform.support.read', 'platform.support.manage']);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Create Ticket');
  });

  it('filters to tickets awaiting support from the checkbox', () => {
    const fixture = setup();
    fixture.detectChanges();

    fixture.componentInstance['onAwaitingOnlyChange'](true);

    expect(ticketsService.list).toHaveBeenLastCalledWith({ ...baseQuery, awaitingSupport: true });
  });

  it('shows the awaiting-support badge on a waiting ticket', () => {
    const fixture = setup();
    ticketsService.list.mockReturnValue(of({ items: [ticket], total: 1, page: 1, pageSize: 25 }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Awaiting support');
  });

  it('pre-sets filters from the bell query params, resolving assignee=me to the signed-in user', () => {
    const fixture = setup(['platform.support.read'], { awaiting: '1', assignee: 'me', status: 'open' });
    TestBed.inject(SessionService).setSession({
      userId: 'staff-7',
      email: 'staff@example.com',
      platformRole: 'Support',
      expiresAt: '',
      mfaRequired: false,
      permissions: ['platform.support.read'],
      scopes: {},
      entitlements: [],
    });
    fixture.detectChanges();

    expect(ticketsService.list).toHaveBeenCalledWith({
      ...baseQuery,
      status: 'open',
      assignee: 'staff-7',
      awaitingSupport: true,
    });
  });

  it('ignores an unknown status in the query params', () => {
    const fixture = setup(['platform.support.read'], { status: 'bogus', assignee: 'unassigned' });
    fixture.detectChanges();

    expect(ticketsService.list).toHaveBeenCalledWith({ ...baseQuery, assignee: 'unassigned' });
  });
});
