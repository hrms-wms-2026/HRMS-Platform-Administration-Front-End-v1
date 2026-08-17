import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import {
  CreateSupportTicketRequest,
  SupportTicketComment,
  SupportTicketDetail,
  SupportTicketListResponse,
  SupportTicketSummary,
} from './support-ticket.model';

interface SupportTicketApi {
  id: string;
  tenant_id: string | null;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string | null;
  created_by_platform_user_id: string | null;
  assigned_to_platform_user_id: string | null;
  created_at: string;
  updated_at: string | null;
  resolved_at: string | null;
}

interface SupportTicketCommentApi {
  id: string;
  ticket_id: string;
  author_platform_user_id: string | null;
  body: string;
  is_internal: boolean;
  created_at: string;
}

interface SupportTicketDetailApi {
  ticket: SupportTicketApi;
  comments: SupportTicketCommentApi[];
}

interface SupportTicketListResponseApi {
  items: SupportTicketApi[];
  total: number;
  page: number;
  page_size: number;
}

export interface ListSupportTicketsParams {
  status?: string;
  priority?: string;
  tenantId?: string;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class SupportTicketsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  list(params: ListSupportTicketsParams = {}): Observable<SupportTicketListResponse> {
    let httpParams = new HttpParams();
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params.priority) {
      httpParams = httpParams.set('priority', params.priority);
    }
    if (params.tenantId) {
      httpParams = httpParams.set('tenant_id', params.tenantId);
    }
    if (params.page) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.pageSize) {
      httpParams = httpParams.set('page_size', params.pageSize.toString());
    }

    return this.http
      .get<SupportTicketListResponseApi>(`${this.baseUrl}${API_ENDPOINTS.support.tickets.list}`, {
        params: httpParams,
        withCredentials: true,
      })
      .pipe(map((response) => this.mapListResponse(response)));
  }

  getById(id: string): Observable<SupportTicketDetail> {
    return this.http
      .get<SupportTicketDetailApi>(`${this.baseUrl}${API_ENDPOINTS.support.tickets.byId(id)}`, {
        withCredentials: true,
      })
      .pipe(map((detail) => this.mapDetail(detail)));
  }

  create(request: CreateSupportTicketRequest): Observable<SupportTicketSummary> {
    return this.http
      .post<SupportTicketApi>(
        `${this.baseUrl}${API_ENDPOINTS.support.tickets.create}`,
        {
          tenant_id: request.tenantId,
          subject: request.subject,
          description: request.description,
          priority: request.priority,
          category: request.category,
        },
        { withCredentials: true },
      )
      .pipe(map((ticket) => this.mapTicket(ticket)));
  }

  updateStatus(id: string, status: string): Observable<SupportTicketSummary> {
    return this.http
      .patch<SupportTicketApi>(
        `${this.baseUrl}${API_ENDPOINTS.support.tickets.updateStatus(id)}`,
        { status },
        { withCredentials: true },
      )
      .pipe(map((ticket) => this.mapTicket(ticket)));
  }

  addComment(id: string, body: string, isInternal: boolean): Observable<SupportTicketComment> {
    return this.http
      .post<SupportTicketCommentApi>(
        `${this.baseUrl}${API_ENDPOINTS.support.tickets.addComment(id)}`,
        { body, is_internal: isInternal },
        { withCredentials: true },
      )
      .pipe(map((comment) => this.mapComment(comment)));
  }

  private mapListResponse(response: SupportTicketListResponseApi): SupportTicketListResponse {
    return {
      items: response.items.map((item) => this.mapTicket(item)),
      total: response.total,
      page: response.page,
      pageSize: response.page_size,
    };
  }

  private mapTicket(item: SupportTicketApi): SupportTicketSummary {
    return {
      id: item.id,
      tenantId: item.tenant_id,
      subject: item.subject,
      description: item.description,
      status: item.status as SupportTicketSummary['status'],
      priority: item.priority as SupportTicketSummary['priority'],
      category: item.category,
      createdByPlatformUserId: item.created_by_platform_user_id,
      assignedToPlatformUserId: item.assigned_to_platform_user_id,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      resolvedAt: item.resolved_at,
    };
  }

  private mapComment(item: SupportTicketCommentApi): SupportTicketComment {
    return {
      id: item.id,
      ticketId: item.ticket_id,
      authorPlatformUserId: item.author_platform_user_id,
      body: item.body,
      isInternal: item.is_internal,
      createdAt: item.created_at,
    };
  }

  private mapDetail(item: SupportTicketDetailApi): SupportTicketDetail {
    return {
      ticket: this.mapTicket(item.ticket),
      comments: item.comments.map((comment) => this.mapComment(comment)),
    };
  }
}
