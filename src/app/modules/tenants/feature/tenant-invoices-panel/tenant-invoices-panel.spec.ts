import { TestBed } from '@angular/core/testing';
import { provideRouter, RouterLink } from '@angular/router';
import { By } from '@angular/platform-browser';
import { NEVER, of } from 'rxjs';
import { TenantInvoicesPanel } from './tenant-invoices-panel';
import { InvoicesService } from '../../../invoices/data/invoices.service';

describe('TenantInvoicesPanel', () => {
  let invoicesService: { listByTenant: jest.Mock };

  function setup() {
    invoicesService = { listByTenant: jest.fn() };

    TestBed.configureTestingModule({
      imports: [TenantInvoicesPanel],
      providers: [
        provideRouter([{ path: 'invoices/:id', component: class DummyInvoiceDetail {} }]),
        { provide: InvoicesService, useValue: invoicesService },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TenantInvoicesPanel);
    fixture.componentRef.setInput('tenantId', 'tenant-1');
    return fixture;
  }

  it('shows skeleton while loading', () => {
    const fixture = setup();
    invoicesService.listByTenant.mockReturnValue(NEVER);
    fixture.detectChanges();

    expect(invoicesService.listByTenant).toHaveBeenCalledWith('tenant-1');
    expect(fixture.nativeElement.querySelector('app-table-skeleton')).not.toBeNull();
  });

  it('renders latest invoices with view links', () => {
    const fixture = setup();
    invoicesService.listByTenant.mockReturnValue(
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
          {
            id: 'inv-2',
            tenantId: 'tenant-1',
            invoiceNumber: 'INV-2026-0002',
            status: 'paid',
            currency: 'USD',
            totalAmount: 99,
            createdAt: '2026-01-02T00:00:00Z',
          },
        ],
        total: 2,
        page: 1,
        pageSize: 25,
      }),
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('INV-2026-0001');
    expect(fixture.nativeElement.textContent).toContain('USD 120.00');
    expect(fixture.nativeElement.textContent).toContain('View all invoices');

    const viewLink = fixture.debugElement.query(By.css('a.text-indigo-600'));
    const routerLink = viewLink.injector.get(RouterLink);
    expect(routerLink.urlTree?.toString()).toBe('/invoices/inv-1');
  });

  it('shows only the latest five invoices', () => {
    const fixture = setup();
    invoicesService.listByTenant.mockReturnValue(
      of({
        items: Array.from({ length: 7 }, (_, index) => ({
          id: `inv-${index + 1}`,
          tenantId: 'tenant-1',
          invoiceNumber: `INV-${index + 1}`,
          status: 'open',
          currency: 'USD',
          totalAmount: 10,
          createdAt: '2026-01-01T00:00:00Z',
        })),
        total: 7,
        page: 1,
        pageSize: 25,
      }),
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(5);
  });

  it('shows empty state when tenant has no invoices', () => {
    const fixture = setup();
    invoicesService.listByTenant.mockReturnValue(
      of({ items: [], total: 0, page: 1, pageSize: 25 }),
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No invoices yet');
  });
});
