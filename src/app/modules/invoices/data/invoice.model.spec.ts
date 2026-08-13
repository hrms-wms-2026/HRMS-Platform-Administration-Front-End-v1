import {
  canMarkPaidInvoice,
  canResendInvoiceEmail,
  canVoidInvoice,
  formatInvoiceAmount,
  formatInvoicePeriod,
  invoiceStatusTone,
  shortTenantLabel,
} from './invoice.model';

describe('invoice.model helpers', () => {
  it('maps invoice status tones', () => {
    expect(invoiceStatusTone('draft')).toBe('neutral');
    expect(invoiceStatusTone('open')).toBe('indigo');
    expect(invoiceStatusTone('paid')).toBe('success');
    expect(invoiceStatusTone('void')).toBe('neutral');
  });

  it('evaluates action eligibility by status', () => {
    expect(canMarkPaidInvoice('draft')).toBe(true);
    expect(canMarkPaidInvoice('paid')).toBe(false);
    expect(canVoidInvoice('open')).toBe(true);
    expect(canVoidInvoice('void')).toBe(false);
    expect(canResendInvoiceEmail('open')).toBe(true);
    expect(canResendInvoiceEmail('paid')).toBe(true);
    expect(canResendInvoiceEmail('draft')).toBe(false);
  });

  it('formats invoice amounts and periods', () => {
    expect(formatInvoiceAmount('USD', 120)).toBe('USD 120.00');
    expect(formatInvoicePeriod('2026-01-01', '2026-01-31')).toBe('2026-01-01 – 2026-01-31');
    expect(formatInvoicePeriod(null, null)).toBe('—');
  });

  it('prefers tenant name and slug labels', () => {
    expect(shortTenantLabel({ tenantId: 'tenant-1', tenantName: 'Acme', tenantSlug: 'acme' })).toBe('Acme');
    expect(shortTenantLabel({ tenantId: 'tenant-1', tenantName: null, tenantSlug: 'acme' })).toBe('acme');
    expect(shortTenantLabel({ tenantId: 'tenant-12345678', tenantName: null, tenantSlug: null })).toBe('tenant-1');
  });
});
