import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { SupportTicketCreate } from './support-ticket-create';
import { SupportTicketsService } from '../../data/support-tickets.service';
import { TenantsService } from '../../../tenants/data/tenants.service';
import { NotificationService } from '../../../../core/services/notification.service';

describe('SupportTicketCreate', () => {
  let ticketsService: { create: jest.Mock };
  let tenantsService: { list: jest.Mock };
  let notificationService: { success: jest.Mock; error: jest.Mock };
  let router: { navigate: jest.Mock };

  function setup() {
    ticketsService = { create: jest.fn() };
    tenantsService = { list: jest.fn().mockReturnValue(of({ items: [], total: 0, page: 1, pageSize: 100 })) };
    notificationService = { success: jest.fn(), error: jest.fn() };
    router = { navigate: jest.fn() };

    TestBed.configureTestingModule({
      imports: [SupportTicketCreate],
      providers: [
        { provide: SupportTicketsService, useValue: ticketsService },
        { provide: TenantsService, useValue: tenantsService },
        { provide: NotificationService, useValue: notificationService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SupportTicketCreate);
    return fixture;
  }

  it('loads tenants for the picker on init', () => {
    const fixture = setup();
    fixture.detectChanges();

    expect(tenantsService.list).toHaveBeenCalledWith({ search: '', status: '', page: 1, pageSize: 100 });
  });

  it('does not submit when the form is invalid', () => {
    const fixture = setup();
    fixture.detectChanges();

    fixture.componentInstance['submit']();

    expect(ticketsService.create).not.toHaveBeenCalled();
  });

  it('creates a ticket and navigates to its detail page', () => {
    const fixture = setup();
    fixture.detectChanges();

    ticketsService.create.mockReturnValue(of({ id: 'ticket-1' }));

    const component = fixture.componentInstance;
    component['form'].setValue({
      tenantId: 'tenant-1',
      subject: 'Cannot access dashboard',
      description: 'Getting a 500 error.',
      priority: 'high',
      category: 'bug',
    });
    component['submit']();

    expect(ticketsService.create).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      subject: 'Cannot access dashboard',
      description: 'Getting a 500 error.',
      priority: 'high',
      category: 'bug',
    });
    expect(notificationService.success).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/support/tickets', 'ticket-1']);
  });

  it('shows a notification error when creation fails', () => {
    const fixture = setup();
    fixture.detectChanges();

    ticketsService.create.mockReturnValue(
      throwError(() => new HttpErrorResponse({ error: { detail: 'Subject is required.' } })),
    );

    const component = fixture.componentInstance;
    component['form'].setValue({
      tenantId: '',
      subject: 'Cannot access dashboard',
      description: 'Getting a 500 error.',
      priority: 'medium',
      category: '',
    });
    component['submit']();

    expect(notificationService.error).toHaveBeenCalledWith('Subject is required.');
    expect(component['saving']()).toBe(false);
  });
});
