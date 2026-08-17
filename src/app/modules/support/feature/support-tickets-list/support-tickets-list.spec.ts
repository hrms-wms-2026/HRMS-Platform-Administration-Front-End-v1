import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { SupportTicketsList } from './support-tickets-list';
import { SupportTicketsService } from '../../data/support-tickets.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';

describe('SupportTicketsList', () => {
  let ticketsService: { list: jest.Mock };

  function setup(permissions: string[] = ['platform.support.read']) {
    ticketsService = { list: jest.fn() };

    TestBed.configureTestingModule({
      imports: [SupportTicketsList],
      providers: [provideRouter([]), { provide: SupportTicketsService, useValue: ticketsService }],
    }).compileComponents();

    const fixture = TestBed.createComponent(SupportTicketsList);
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
    return fixture;
  }

  it('does not call the API and shows the no-permission message when unauthorized', () => {
    const fixture = setup([]);
    fixture.detectChanges();

    expect(ticketsService.list).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('No permission to view page');
  });

  it('loads tickets on init when authorized', () => {
    const fixture = setup();
    ticketsService.list.mockReturnValue(
      of({
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
        page: 1,
        pageSize: 25,
      }),
    );
    fixture.detectChanges();

    expect(ticketsService.list).toHaveBeenCalledWith({ status: '', priority: '', page: 1, pageSize: 25 });
    expect(fixture.nativeElement.textContent).toContain('Cannot access dashboard');
  });

  it('resets to page 1 and re-queries when the status filter changes', () => {
    const fixture = setup();
    ticketsService.list.mockReturnValue(of({ items: [], total: 0, page: 1, pageSize: 25 }));
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['goToPage'](3);
    component['onStatusFilterChange']('resolved');

    expect(component['currentPage']()).toBe(1);
    expect(ticketsService.list).toHaveBeenLastCalledWith({
      status: 'resolved',
      priority: '',
      page: 1,
      pageSize: 25,
    });
  });

  it('hides the Create Ticket link without platform.support.manage', () => {
    const fixture = setup(['platform.support.read']);
    ticketsService.list.mockReturnValue(of({ items: [], total: 0, page: 1, pageSize: 25 }));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Create Ticket');
  });

  it('shows the Create Ticket link with platform.support.manage', () => {
    const fixture = setup(['platform.support.read', 'platform.support.manage']);
    ticketsService.list.mockReturnValue(of({ items: [], total: 0, page: 1, pageSize: 25 }));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Create Ticket');
  });
});
