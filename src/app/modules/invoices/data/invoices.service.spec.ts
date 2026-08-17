import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { InvoicesService } from './invoices.service';
import { environment } from '../../../../environments/environment';

describe('InvoicesService', () => {
  let service: InvoicesService;
  let httpMock: HttpTestingController;

  const summaryApi = {
    id: 'inv-1',
    tenant_id: 'tenant-1',
    tenant_subscription_id: 'sub-1',
    invoice_number: 'INV-2026-0001',
    status: 'open',
    currency: 'USD',
    total_amount: 120,
    issued_at: '2026-01-01T00:00:00Z',
    due_at: '2026-01-15T00:00:00Z',
    paid_at: null,
    voided_at: null,
    created_at: '2026-01-01T00:00:00Z',
  };

  const detailApi = {
    ...summaryApi,
    external_invoice_id: 'in_123',
    gateway_provider: 'stripe',
    subtotal_amount: 100,
    tax_amount: 20,
    discount_amount: 0,
    period_start: '2026-01-01',
    period_end: '2026-01-31',
    updated_at: '2026-01-02T00:00:00Z',
    audit_logs: [
      {
        id: 'log-1',
        tenant_id: 'tenant-1',
        invoice_id: 'inv-1',
        actor_admin_user_id: 'admin-1',
        action: 'invoice.created',
        message: 'Invoice created',
        metadata_json: null,
        created_at: '2026-01-01T00:00:00Z',
      },
    ],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(InvoicesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists invoices with filters', () => {
    let result: unknown;
    service
      .list({ status: 'open', from: '2026-01-01T00:00:00Z', to: '2026-01-31T00:00:00Z', page: 2, pageSize: 10 })
      .subscribe((response) => (result = response));

    const req = httpMock.expectOne(
      (request) =>
        request.url === `${environment.apiUrl}/invoices` &&
        request.params.get('status') === 'open' &&
        request.params.get('from') === '2026-01-01T00:00:00Z' &&
        request.params.get('to') === '2026-01-31T00:00:00Z' &&
        request.params.get('page') === '2' &&
        request.params.get('page_size') === '10',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ items: [summaryApi], total: 1, page: 2, page_size: 10 });

    expect(result).toEqual({
      items: [
        expect.objectContaining({
          id: 'inv-1',
          invoiceNumber: 'INV-2026-0001',
          status: 'open',
          totalAmount: 120,
        }),
      ],
      total: 1,
      page: 2,
      pageSize: 10,
    });
  });

  it('gets invoice detail by id', () => {
    let result: unknown;
    service.getById('inv-1').subscribe((invoice) => (result = invoice));

    const req = httpMock.expectOne(`${environment.apiUrl}/invoices/inv-1`);
    expect(req.request.method).toBe('GET');
    req.flush(detailApi);

    expect(result).toEqual(
      expect.objectContaining({
        id: 'inv-1',
        invoiceNumber: 'INV-2026-0001',
        subtotalAmount: 100,
        taxAmount: 20,
        auditLogs: [expect.objectContaining({ action: 'invoice.created' })],
      }),
    );
  });

  it('marks an invoice paid', () => {
    let result: unknown;
    service.markPaid('inv-1').subscribe((invoice) => (result = invoice));

    const req = httpMock.expectOne(`${environment.apiUrl}/invoices/inv-1/mark-paid`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({});
    req.flush({ ...detailApi, status: 'paid', paid_at: '2026-01-10T00:00:00Z' });

    expect(result).toEqual(expect.objectContaining({ status: 'paid' }));
  });

  it('voids an invoice', () => {
    let result: unknown;
    service.void('inv-1').subscribe((invoice) => (result = invoice));

    const req = httpMock.expectOne(`${environment.apiUrl}/invoices/inv-1/void`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ ...detailApi, status: 'void', voided_at: '2026-01-11T00:00:00Z' });

    expect(result).toEqual(expect.objectContaining({ status: 'void' }));
  });

  it('resends invoice email', () => {
    let result: unknown;
    service.resendEmail('inv-1').subscribe((response) => (result = response));

    const req = httpMock.expectOne(`${environment.apiUrl}/invoices/inv-1/resend-email`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({
      invoice_id: 'inv-1',
      recipient_email: 'billing@example.com',
      delivery_status: 'queued',
    });

    expect(result).toEqual({
      invoiceId: 'inv-1',
      recipientEmail: 'billing@example.com',
      deliveryStatus: 'queued',
    });
  });
});
