import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { InvoiceDetail } from './invoice-detail';
import { InvoicesService } from '../../data/invoices.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';

describe('InvoiceDetail', () => {
  let invoicesService: {
    getById: jest.Mock;
    markPaid: jest.Mock;
    void: jest.Mock;
    resendEmail: jest.Mock;
  };
  let notificationService: { success: jest.Mock; error: jest.Mock };

  const openInvoice = {
    id: 'inv-1',
    tenantId: 'tenant-1',
    invoiceNumber: 'INV-2026-0001',
    status: 'open',
    currency: 'USD',
    subtotalAmount: 100,
    taxAmount: 20,
    discountAmount: 0,
    totalAmount: 120,
    periodStart: '2026-01-01',
    periodEnd: '2026-01-31',
    dueAt: '2026-01-15T00:00:00Z',
    paidAt: null,
    voidedAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    auditLogs: [],
  };

  function setup(
    invoice = openInvoice,
    permissions: string[] = ['platform.subscriptions.read', 'platform.subscriptions.manage'],
  ) {
    invoicesService = {
      getById: jest.fn().mockReturnValue(of(invoice)),
      markPaid: jest.fn(),
      void: jest.fn(),
      resendEmail: jest.fn(),
    };
    notificationService = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [InvoiceDetail],
      providers: [
        { provide: InvoicesService, useValue: invoicesService },
        { provide: NotificationService, useValue: notificationService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'inv-1' }) } },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(InvoiceDetail);
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

  it('loads and displays invoice info', () => {
    const fixture = setup();
    expect(invoicesService.getById).toHaveBeenCalledWith('inv-1');
    expect(fixture.nativeElement.textContent).toContain('INV-2026-0001');
    expect(fixture.nativeElement.textContent).toContain('USD 120.00');
    expect(fixture.nativeElement.textContent).toContain('2026-01-01');
  });

  it('shows mark paid, void, and resend actions for open invoices with manage permission', () => {
    const fixture = setup();
    expect(fixture.nativeElement.textContent).toContain('Mark Paid');
    expect(fixture.nativeElement.textContent).toContain('Void');
    expect(fixture.nativeElement.textContent).toContain('Resend Email');
  });

  it('hides management actions without manage permission', () => {
    const fixture = setup(openInvoice, ['platform.subscriptions.read']);
    expect(fixture.nativeElement.querySelector('.border-t.border-slate-100')).toBeNull();
  });

  it('shows only resend email for paid invoices', () => {
    const fixture = setup({ ...openInvoice, status: 'paid', paidAt: '2026-01-10T00:00:00Z' });
    const actionBar = fixture.nativeElement.querySelector('.border-t.border-slate-100');
    expect(actionBar.textContent).toContain('Resend Email');
    expect(actionBar.textContent).not.toContain('Mark Paid');
    expect(actionBar.textContent).not.toContain('Void Invoice');
  });

  it('shows mark paid and void only for draft invoices', () => {
    const fixture = setup({ ...openInvoice, status: 'draft' });
    const actionBar = fixture.nativeElement.querySelector('.border-t.border-slate-100');
    expect(actionBar.textContent).toContain('Mark Paid');
    expect(actionBar.textContent).toContain('Void');
    expect(actionBar.textContent).not.toContain('Resend Email');
  });

  it('marks invoice paid and reloads detail on success', () => {
    const fixture = setup();
    const component = fixture.componentInstance as InvoiceDetail;
    invoicesService.markPaid.mockReturnValue(of({ ...openInvoice, status: 'paid' }));
    invoicesService.getById.mockReturnValueOnce(of(openInvoice)).mockReturnValueOnce(of({ ...openInvoice, status: 'paid' }));

    component['confirmMarkPaid']();

    expect(invoicesService.markPaid).toHaveBeenCalledWith('inv-1');
    expect(notificationService.success).toHaveBeenCalledWith('Invoice marked as paid.');
    expect(invoicesService.getById).toHaveBeenCalledTimes(2);
  });

  it('voids invoice and reloads detail on success', () => {
    const fixture = setup();
    const component = fixture.componentInstance as InvoiceDetail;
    invoicesService.void.mockReturnValue(of({ ...openInvoice, status: 'void' }));

    component['confirmVoid']();

    expect(invoicesService.void).toHaveBeenCalledWith('inv-1');
    expect(notificationService.success).toHaveBeenCalledWith('Invoice voided.');
    expect(invoicesService.getById).toHaveBeenCalledTimes(2);
  });

  it('resends invoice email and reloads detail on success', () => {
    const fixture = setup();
    const component = fixture.componentInstance as InvoiceDetail;
    invoicesService.resendEmail.mockReturnValue(
      of({ invoiceId: 'inv-1', recipientEmail: 'billing@example.com', deliveryStatus: 'queued' }),
    );

    component['confirmResendEmail']();

    expect(invoicesService.resendEmail).toHaveBeenCalledWith('inv-1');
    expect(notificationService.success).toHaveBeenCalledWith('Invoice email queued to billing@example.com.');
    expect(invoicesService.getById).toHaveBeenCalledTimes(2);
  });

  it('shows backend error detail when resend fails', () => {
    const fixture = setup();
    const component = fixture.componentInstance as InvoiceDetail;
    invoicesService.resendEmail.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 422, error: { detail: 'No billing email found.' } })),
    );

    component['confirmResendEmail']();

    expect(notificationService.error).toHaveBeenCalledWith('No billing email found.');
  });
});
