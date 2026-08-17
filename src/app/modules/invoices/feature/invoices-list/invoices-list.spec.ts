import { TestBed } from '@angular/core/testing';
import { provideRouter, RouterLink } from '@angular/router';
import { By } from '@angular/platform-browser';
import { NEVER, of, throwError } from 'rxjs';
import { InvoicesList } from './invoices-list';
import { InvoicesService } from '../../data/invoices.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';

describe('InvoicesList', () => {
  let invoicesService: { list: jest.Mock };

  function setup(permissions: string[] = ['platform.subscriptions.read']) {
    invoicesService = { list: jest.fn() };

    TestBed.configureTestingModule({
      imports: [InvoicesList],
      providers: [
        provideRouter([{ path: 'invoices/:id', component: class DummyInvoiceDetail {} }]),
        { provide: InvoicesService, useValue: invoicesService },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(InvoicesList);
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

    expect(invoicesService.list).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('No permission to view page');
  });

  it('shows the loading skeleton while invoices are loading', () => {
    const fixture = setup();
    invoicesService.list.mockReturnValue(NEVER);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-table-skeleton')).not.toBeNull();
  });

  it('shows empty state when no invoices are returned', () => {
    const fixture = setup();
    invoicesService.list.mockReturnValue(of({ items: [], total: 0, page: 1, pageSize: 25 }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No invoices yet');
  });

  it('loads and displays invoice rows', () => {
    const fixture = setup();
    invoicesService.list.mockReturnValue(
      of({
        items: [
          {
            id: 'inv-1',
            tenantId: 'tenant-1',
            invoiceNumber: 'INV-2026-0001',
            status: 'open',
            currency: 'USD',
            totalAmount: 120,
            createdAt: '2026-01-01T00:00:00Z',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 25,
      }),
    );
    fixture.detectChanges();

    expect(invoicesService.list).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('INV-2026-0001');
    expect(fixture.nativeElement.textContent).toContain('USD 120.00');
  });

  it('reloads with status filter when status changes', () => {
    const fixture = setup();
    invoicesService.list.mockReturnValue(of({ items: [], total: 0, page: 1, pageSize: 25 }));
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('#statusFilter') as HTMLSelectElement;
    select.value = 'paid';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(invoicesService.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'paid', page: 1, pageSize: 25 }),
    );
  });

  it('shows error banner when loading fails', () => {
    const fixture = setup();
    invoicesService.list.mockReturnValue(
      throwError(() => new Error('network')),
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Something went wrong');
  });

  it('shows the filtered empty state with a clear-filters action when filters match nothing', () => {
    const fixture = setup();
    invoicesService.list.mockReturnValue(of({ items: [], total: 0, page: 1, pageSize: 25 }));
    fixture.detectChanges();

    const component = fixture.componentInstance as InvoicesList;
    component['statusFilter'].set('paid');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No invoices found');
    expect(fixture.nativeElement.textContent).toContain('No invoices match the selected filters');
    expect(fixture.nativeElement.textContent).not.toContain('No invoices yet');
  });

  it('updates the date range and reloads when the date-range-picker emits a change', () => {
    const fixture = setup();
    invoicesService.list.mockReturnValue(of({ items: [], total: 0, page: 1, pageSize: 25 }));
    fixture.detectChanges();

    const component = fixture.componentInstance as InvoicesList;
    component['onDateRangeChange']({ from: '2026-01-01', to: '2026-01-31' });

    expect(component['fromFilter']()).toBe('2026-01-01');
    expect(component['toFilter']()).toBe('2026-01-31');
    expect(invoicesService.list).toHaveBeenLastCalledWith(
      expect.objectContaining({
        from: new Date('2026-01-01').toISOString(),
        to: new Date('2026-01-31').toISOString(),
      }),
    );
  });

  it('clears filters and reloads invoices', () => {
    const fixture = setup();
    invoicesService.list.mockReturnValue(of({ items: [], total: 0, page: 1, pageSize: 25 }));
    fixture.detectChanges();

    const component = fixture.componentInstance as InvoicesList;
    component['statusFilter'].set('paid');
    component['fromFilter'].set('2026-01-01');
    component['toFilter'].set('2026-01-31');
    fixture.detectChanges();
    component['clearFilters']();
    fixture.detectChanges();

    expect(invoicesService.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: undefined, page: 1, pageSize: 25 }),
    );
  });

  it('links each row to invoice detail', () => {
    const fixture = setup();
    invoicesService.list.mockReturnValue(
      of({
        items: [
          {
            id: 'inv-1',
            tenantId: 'tenant-1',
            invoiceNumber: 'INV-2026-0001',
            status: 'open',
            currency: 'USD',
            totalAmount: 120,
            createdAt: '2026-01-01T00:00:00Z',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 25,
      }),
    );
    fixture.detectChanges();

    const row = fixture.debugElement.query(By.css('tbody tr'));
    const routerLink = row.injector.get(RouterLink);
    expect(routerLink.urlTree?.toString()).toBe('/invoices/inv-1');
  });
});
