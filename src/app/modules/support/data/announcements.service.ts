import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import {
  AnnouncementListResponse,
  AnnouncementSummary,
  CreateAnnouncementRequest,
  TenantRoleTarget,
} from './announcement.model';

interface TenantRoleTargetApi {
  tenantId: string;
  roleId: string;
}

interface AnnouncementApi {
  id: string;
  title: string;
  body: string;
  severity: string;
  audienceScope: string;
  platformAdminScope: string | null;
  platformRoleIds: string[];
  tenantScope: string | null;
  tenantIds: string[];
  recipientScope: string | null;
  tenantRoleTargets: TenantRoleTargetApi[];
  sendEmail: boolean;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string | null;
}

interface AnnouncementListResponseApi {
  items: AnnouncementApi[];
  total: number;
  page: number;
  page_size: number;
}

export interface ListAnnouncementsParams {
  isPublished?: boolean;
  severity?: string;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class AnnouncementsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  list(params: ListAnnouncementsParams = {}): Observable<AnnouncementListResponse> {
    let httpParams = new HttpParams();
    if (params.isPublished !== undefined) {
      httpParams = httpParams.set('is_published', String(params.isPublished));
    }
    if (params.severity) {
      httpParams = httpParams.set('severity', params.severity);
    }
    if (params.page) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.pageSize) {
      httpParams = httpParams.set('page_size', params.pageSize.toString());
    }

    return this.http
      .get<AnnouncementListResponseApi>(`${this.baseUrl}${API_ENDPOINTS.support.announcements.list}`, {
        params: httpParams,
        withCredentials: true,
      })
      .pipe(map((response) => this.mapListResponse(response)));
  }

  create(request: CreateAnnouncementRequest): Observable<AnnouncementSummary> {
    return this.http
      .post<AnnouncementApi>(
        `${this.baseUrl}${API_ENDPOINTS.support.announcements.create}`,
        {
          title: request.title,
          body: request.body,
          severity: request.severity,
          audienceScope: request.audienceScope,
          platformAdminScope: request.platformAdminScope,
          platformRoleIds: request.platformRoleIds,
          tenantScope: request.tenantScope,
          tenantIds: request.tenantIds,
          recipientScope: request.recipientScope,
          tenantRoleTargets: request.tenantRoleTargets,
          sendEmail: request.sendEmail ?? false,
        },
        { withCredentials: true },
      )
      .pipe(map((item) => this.mapAnnouncement(item)));
  }

  publish(id: string): Observable<AnnouncementSummary> {
    return this.http
      .patch<AnnouncementApi>(
        `${this.baseUrl}${API_ENDPOINTS.support.announcements.publish(id)}`,
        {},
        { withCredentials: true },
      )
      .pipe(map((item) => this.mapAnnouncement(item)));
  }

  unpublish(id: string): Observable<AnnouncementSummary> {
    return this.http
      .patch<AnnouncementApi>(
        `${this.baseUrl}${API_ENDPOINTS.support.announcements.unpublish(id)}`,
        {},
        { withCredentials: true },
      )
      .pipe(map((item) => this.mapAnnouncement(item)));
  }

  private mapListResponse(response: AnnouncementListResponseApi): AnnouncementListResponse {
    return {
      items: response.items.map((item) => this.mapAnnouncement(item)),
      total: response.total,
      page: response.page,
      pageSize: response.page_size,
    };
  }

  private mapAnnouncement(item: AnnouncementApi): AnnouncementSummary {
    return {
      id: item.id,
      title: item.title,
      body: item.body,
      severity: item.severity as AnnouncementSummary['severity'],
      audienceScope: item.audienceScope as AnnouncementSummary['audienceScope'],
      platformAdminScope: item.platformAdminScope as AnnouncementSummary['platformAdminScope'],
      platformRoleIds: item.platformRoleIds ?? [],
      tenantScope: item.tenantScope as AnnouncementSummary['tenantScope'],
      tenantIds: item.tenantIds ?? [],
      recipientScope: item.recipientScope as AnnouncementSummary['recipientScope'],
      tenantRoleTargets: (item.tenantRoleTargets ?? []).map(
        (t): TenantRoleTarget => ({ tenantId: t.tenantId, roleId: t.roleId }),
      ),
      sendEmail: item.sendEmail,
      isPublished: item.is_published,
      publishedAt: item.published_at,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    };
  }
}
