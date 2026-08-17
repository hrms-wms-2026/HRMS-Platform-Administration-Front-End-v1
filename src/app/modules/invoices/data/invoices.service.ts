import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import {
  InvoiceDetail,
  InvoiceEmailResendResponse,
  InvoiceListResponse,
  InvoiceSummary,
} from './invoice.model';

interface InvoiceSummaryApi {
  id: string;
  tenant_id: string;
  tenant_subscription_id?: string | null;
  invoice_number: string;
  status: string;
  currency: string;
  total_amount: number;
  issued_at?: string | null;
  due_at?: string | null;
  paid_at?: string | null;
  voided_at?: string | null;
  created_at: string;
}

interface BillingAuditLogApi {
  id: string;
  tenant_id?: string | null;
  invoice_id?: string | null;
  actor_admin_user_id?: string | null;
  action: string;
  message: string;
  metadata_json?: string | null;
  created_at: string;
}

interface InvoiceDetailApi extends InvoiceSummaryApi {
  external_invoice_id?: string | null;
  gateway_provider?: string | null;
  subtotal_amount: number;
  tax_amount: number;
  discount_amount: number;
  period_start?: string | null;
  period_end?: string | null;
  updated_at?: string | null;
  audit_logs: BillingAuditLogApi[];
}

interface InvoiceListResponseApi {
  items: InvoiceSummaryApi[];
  total: number;
  page: number;
  page_size: number;
}

interface InvoiceEmailResendResponseApi {
  invoice_id: string;
  recipient_email: string;
  delivery_status: string;
}

export interface ListInvoicesParams {
  tenantId?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class InvoicesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  list(params: ListInvoicesParams = {}): Observable<InvoiceListResponse> {
    let httpParams = new HttpParams();
    if (params.tenantId) {
      httpParams = httpParams.set('tenant_id', params.tenantId);
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params.from) {
      httpParams = httpParams.set('from', params.from);
    }
    if (params.to) {
      httpParams = httpParams.set('to', params.to);
    }
    if (params.page) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.pageSize) {
      httpParams = httpParams.set('page_size', params.pageSize.toString());
    }

    return this.http
      .get<InvoiceListResponseApi>(`${this.baseUrl}${API_ENDPOINTS.invoices.list}`, {
        params: httpParams,
        withCredentials: true,
      })
      .pipe(map((response) => this.mapListResponse(response)));
  }

  getById(id: string): Observable<InvoiceDetail> {
    return this.http
      .get<InvoiceDetailApi>(`${this.baseUrl}${API_ENDPOINTS.invoices.byId(id)}`, {
        withCredentials: true,
      })
      .pipe(map((item) => this.mapDetail(item)));
  }

  listByTenant(tenantId: string): Observable<InvoiceListResponse> {
    return this.http
      .get<InvoiceListResponseApi>(`${this.baseUrl}${API_ENDPOINTS.invoices.listByTenant(tenantId)}`, {
        withCredentials: true,
      })
      .pipe(map((response) => this.mapListResponse(response)));
  }

  markPaid(id: string): Observable<InvoiceDetail> {
    return this.http
      .patch<InvoiceDetailApi>(`${this.baseUrl}${API_ENDPOINTS.invoices.markPaid(id)}`, {}, {
        withCredentials: true,
      })
      .pipe(map((item) => this.mapDetail(item)));
  }

  void(id: string): Observable<InvoiceDetail> {
    return this.http
      .patch<InvoiceDetailApi>(`${this.baseUrl}${API_ENDPOINTS.invoices.void(id)}`, {}, {
        withCredentials: true,
      })
      .pipe(map((item) => this.mapDetail(item)));
  }

  resendEmail(id: string): Observable<InvoiceEmailResendResponse> {
    return this.http
      .post<InvoiceEmailResendResponseApi>(
        `${this.baseUrl}${API_ENDPOINTS.invoices.resendEmail(id)}`,
        {},
        { withCredentials: true },
      )
      .pipe(
        map((response) => ({
          invoiceId: response.invoice_id,
          recipientEmail: response.recipient_email,
          deliveryStatus: response.delivery_status,
        })),
      );
  }

  private mapListResponse(response: InvoiceListResponseApi): InvoiceListResponse {
    return {
      items: response.items.map((item) => this.mapSummary(item)),
      total: response.total,
      page: response.page,
      pageSize: response.page_size,
    };
  }

  private mapSummary(item: InvoiceSummaryApi): InvoiceSummary {
    return {
      id: item.id,
      tenantId: item.tenant_id,
      tenantSubscriptionId: item.tenant_subscription_id ?? null,
      invoiceNumber: item.invoice_number,
      status: item.status as InvoiceSummary['status'],
      currency: item.currency,
      totalAmount: item.total_amount,
      issuedAt: item.issued_at ?? null,
      dueAt: item.due_at ?? null,
      paidAt: item.paid_at ?? null,
      voidedAt: item.voided_at ?? null,
      createdAt: item.created_at,
    };
  }

  private mapDetail(item: InvoiceDetailApi): InvoiceDetail {
    return {
      ...this.mapSummary(item),
      externalInvoiceId: item.external_invoice_id ?? null,
      gatewayProvider: item.gateway_provider ?? null,
      subtotalAmount: item.subtotal_amount,
      taxAmount: item.tax_amount,
      discountAmount: item.discount_amount,
      periodStart: item.period_start ?? null,
      periodEnd: item.period_end ?? null,
      updatedAt: item.updated_at ?? null,
      auditLogs: (item.audit_logs ?? []).map((log) => ({
        id: log.id,
        tenantId: log.tenant_id ?? null,
        invoiceId: log.invoice_id ?? null,
        actorAdminUserId: log.actor_admin_user_id ?? null,
        action: log.action,
        message: log.message,
        metadataJson: log.metadata_json ?? null,
        createdAt: log.created_at,
      })),
    };
  }
}
