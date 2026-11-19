import { StatusTone } from '../../../shared/ui/status-badge/status-badge';

export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void';

export interface InvoiceSummary {
  id: string;
  tenantId: string;
  tenantName?: string | null;
  tenantSlug?: string | null;
  tenantSubscriptionId?: string | null;
  invoiceNumber: string;
  status: InvoiceStatus;
  currency: string;
  subtotalAmount?: number | null;
  taxAmount?: number | null;
  discountAmount?: number | null;
  totalAmount: number;
  periodStart?: string | null;
  periodEnd?: string | null;
  issuedAt?: string | null;
  dueAt?: string | null;
  paidAt?: string | null;
  voidedAt?: string | null;
  gatewayProvider?: string | null;
  externalInvoiceId?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface BillingAuditLog {
  id: string;
  tenantId?: string | null;
  invoiceId?: string | null;
  actorAdminUserId?: string | null;
  action: string;
  message: string;
  metadataJson?: string | null;
  createdAt: string;
}

export interface InvoiceDetail extends InvoiceSummary {
  auditLogs: BillingAuditLog[];
}

export interface InvoiceListResponse {
  items: InvoiceSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface InvoiceEmailResendResponse {
  invoiceId: string;
  recipientEmail: string;
  deliveryStatus: string;
}

export const INVOICE_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'open', label: 'Open' },
  { value: 'paid', label: 'Paid' },
  { value: 'void', label: 'Void' },
];

export function invoiceStatusTone(status: InvoiceStatus | string): StatusTone {
  switch (status) {
    case 'paid':
      return 'success';
    case 'open':
      return 'indigo';
    case 'void':
      return 'neutral';
    case 'draft':
    default:
      return 'neutral';
  }
}

export function canMarkPaidInvoice(status: InvoiceStatus | string): boolean {
  return status === 'draft' || status === 'open';
}

export function canVoidInvoice(status: InvoiceStatus | string): boolean {
  return status === 'draft' || status === 'open';
}

export function canResendInvoiceEmail(status: InvoiceStatus | string): boolean {
  return status === 'open' || status === 'paid';
}

export function formatInvoiceAmount(currency: string, amount: number): string {
  return `${currency} ${amount.toFixed(2)}`;
}

export function formatInvoicePeriod(start?: string | null, end?: string | null): string {
  if (!start && !end) {
    return '—';
  }
  if (start && end) {
    return `${start} – ${end}`;
  }
  return start ?? end ?? '—';
}

export function shortTenantLabel(invoice: Pick<InvoiceSummary, 'tenantName' | 'tenantSlug' | 'tenantId'>): string {
  if (invoice.tenantName) {
    return invoice.tenantName;
  }
  if (invoice.tenantSlug) {
    return invoice.tenantSlug;
  }
  return invoice.tenantId.slice(0, 8);
}
