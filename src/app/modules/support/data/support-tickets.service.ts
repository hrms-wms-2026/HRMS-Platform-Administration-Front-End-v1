import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import {
  AttachmentDownload,
  CreateSupportTicketRequest,
  SupportAssignee,
  SupportTicketAttachment,
  SupportTicketComment,
  SupportTicketDetail,
  SupportTicketListResponse,
  SupportTicketSummary,
} from './support-ticket.model';

interface SupportTicketApi {
  id: string;
  tenant_id: string;
  tenant_name: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string | null;
  created_by_platform_user_id: string | null;
  created_by_user_id: string | null;
  created_by_name: string;
  assigned_to_platform_user_id: string | null;
  assigned_to_name: string | null;
  created_at: string;
  updated_at: string | null;
  resolved_at: string | null;
}

interface SupportTicketCommentApi {
  id: string;
  ticket_id: string;
  author_platform_user_id: string | null;
  author_user_id: string | null;
  author_name: string;
  body: string;
  is_internal: boolean;
  created_at: string;
}

interface SupportTicketAttachmentApi {
  id: string;
  ticket_id: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  is_internal: boolean;
  uploaded_by_platform_user_id: string | null;
  uploaded_by_user_id: string | null;
  uploaded_by_name: string;
  created_at: string;
}

interface SupportTicketDetailApi {
  ticket: SupportTicketApi;
  comments: SupportTicketCommentApi[];
  attachments: SupportTicketAttachmentApi[];
}

interface SupportTicketListResponseApi {
  items: SupportTicketApi[];
  total: number;
  page: number;
  page_size: number;
}

interface SupportAssigneeApi {
  id: string;
  full_name: string;
  email: string;
}

interface AttachmentDownloadApi {
  url: string;
  expires_at: string;
}

export interface ListSupportTicketsParams {
  status?: string;
  priority?: string;
  tenantId?: string;
  /** A platform user id, or SUPPORT_ASSIGNEE_UNASSIGNED. */
  assignee?: string;
  search?: string;
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
    if (params.assignee) {
      httpParams = httpParams.set('assignee', params.assignee);
    }
    if (params.search?.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
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

  /** Pass null to clear the assignee. */
  assign(id: string, platformUserId: string | null): Observable<SupportTicketSummary> {
    return this.http
      .patch<SupportTicketApi>(
        `${this.baseUrl}${API_ENDPOINTS.support.tickets.assign(id)}`,
        { assigned_to_platform_user_id: platformUserId },
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

  uploadAttachment(id: string, file: File, isInternal: boolean): Observable<SupportTicketAttachment> {
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('is_internal', String(isInternal));

    return this.http
      .post<SupportTicketAttachmentApi>(
        `${this.baseUrl}${API_ENDPOINTS.support.tickets.uploadAttachment(id)}`,
        form,
        { withCredentials: true },
      )
      .pipe(map((attachment) => this.mapAttachment(attachment)));
  }

  getAttachmentDownloadUrl(ticketId: string, attachmentId: string): Observable<AttachmentDownload> {
    return this.http
      .get<AttachmentDownloadApi>(
        `${this.baseUrl}${API_ENDPOINTS.support.tickets.attachmentDownloadUrl(ticketId, attachmentId)}`,
        { withCredentials: true },
      )
      .pipe(map((response) => ({ url: response.url, expiresAt: response.expires_at })));
  }

  listAssignees(): Observable<SupportAssignee[]> {
    return this.http
      .get<SupportAssigneeApi[]>(`${this.baseUrl}${API_ENDPOINTS.support.assignees}`, { withCredentials: true })
      .pipe(map((items) => items.map((item) => ({ id: item.id, fullName: item.full_name, email: item.email }))));
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
      tenantName: item.tenant_name,
      subject: item.subject,
      description: item.description,
      status: item.status as SupportTicketSummary['status'],
      priority: item.priority as SupportTicketSummary['priority'],
      category: item.category,
      createdByPlatformUserId: item.created_by_platform_user_id,
      createdByUserId: item.created_by_user_id,
      createdByName: item.created_by_name,
      assignedToPlatformUserId: item.assigned_to_platform_user_id,
      assignedToName: item.assigned_to_name,
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
      authorUserId: item.author_user_id,
      authorName: item.author_name,
      body: item.body,
      isInternal: item.is_internal,
      createdAt: item.created_at,
    };
  }

  private mapAttachment(item: SupportTicketAttachmentApi): SupportTicketAttachment {
    return {
      id: item.id,
      ticketId: item.ticket_id,
      fileName: item.file_name,
      contentType: item.content_type,
      sizeBytes: item.size_bytes,
      isInternal: item.is_internal,
      uploadedByPlatformUserId: item.uploaded_by_platform_user_id,
      uploadedByUserId: item.uploaded_by_user_id,
      uploadedByName: item.uploaded_by_name,
      createdAt: item.created_at,
    };
  }

  private mapDetail(item: SupportTicketDetailApi): SupportTicketDetail {
    return {
      ticket: this.mapTicket(item.ticket),
      comments: item.comments.map((comment) => this.mapComment(comment)),
      attachments: (item.attachments ?? []).map((attachment) => this.mapAttachment(attachment)),
    };
  }
}
