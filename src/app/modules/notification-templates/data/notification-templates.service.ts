import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import {
  CreateNotificationTemplateRequest,
  NotificationEvent,
  NotificationTemplateContent,
  NotificationTemplateDetail,
  NotificationTemplatePreview,
  NotificationTemplateSummary,
  NotificationTestSendResult,
} from './notification-template.model';

/**
 * Backend: AdminNotificationTemplatesController (admin/v1/notification-templates) and
 * AdminNotificationEventsController (admin/v1/notification-events).
 */
@Injectable({ providedIn: 'root' })
export class NotificationTemplatesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  private readonly endpoints = API_ENDPOINTS.notificationTemplates;

  listEvents(): Observable<NotificationEvent[]> {
    return this.http.get<NotificationEvent[]>(`${this.baseUrl}${API_ENDPOINTS.notificationEvents.list}`, { withCredentials: true });
  }

  list(params: { eventKey?: string; search?: string } = {}): Observable<NotificationTemplateSummary[]> {
    let httpParams = new HttpParams();
    if (params.eventKey) httpParams = httpParams.set('event_key', params.eventKey);
    if (params.search) httpParams = httpParams.set('search', params.search);
    return this.http.get<NotificationTemplateSummary[]>(`${this.baseUrl}${this.endpoints.list}`, {
      params: httpParams,
      withCredentials: true,
    });
  }

  get(id: string): Observable<NotificationTemplateDetail> {
    return this.http.get<NotificationTemplateDetail>(`${this.baseUrl}${this.endpoints.byId(id)}`, { withCredentials: true });
  }

  create(request: CreateNotificationTemplateRequest): Observable<NotificationTemplateDetail> {
    return this.http.post<NotificationTemplateDetail>(`${this.baseUrl}${this.endpoints.list}`, request, { withCredentials: true });
  }

  /** `revision` is the draft revision being edited, or null when no draft exists yet (409 if stale). */
  saveDraft(id: string, content: NotificationTemplateContent, revision: number | null): Observable<NotificationTemplateDetail> {
    return this.http.put<NotificationTemplateDetail>(`${this.baseUrl}${this.endpoints.draft(id)}`, { content, revision }, {
      withCredentials: true,
    });
  }

  preview(id: string, content: NotificationTemplateContent | null, variables: Record<string, string> | null = null): Observable<NotificationTemplatePreview> {
    return this.http.post<NotificationTemplatePreview>(`${this.baseUrl}${this.endpoints.preview(id)}`, { content, variables }, {
      withCredentials: true,
    });
  }

  publish(id: string, revision: number): Observable<NotificationTemplateDetail> {
    return this.http.post<NotificationTemplateDetail>(`${this.baseUrl}${this.endpoints.publish(id)}`, { revision }, {
      withCredentials: true,
    });
  }

  restore(id: string, versionId: string): Observable<NotificationTemplateDetail> {
    return this.http.post<NotificationTemplateDetail>(`${this.baseUrl}${this.endpoints.restore(id, versionId)}`, {}, {
      withCredentials: true,
    });
  }

  sendTest(id: string, variables: Record<string, string> | null = null): Observable<NotificationTestSendResult> {
    return this.http.post<NotificationTestSendResult>(`${this.baseUrl}${this.endpoints.test(id)}`, { channel: 'email', variables }, {
      withCredentials: true,
    });
  }
}
