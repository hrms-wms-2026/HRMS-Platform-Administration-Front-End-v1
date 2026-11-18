import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import {
  AnnouncementListResponse,
  AnnouncementRequest,
  AnnouncementSummary,
} from './announcement.model';

interface AnnouncementApi {
  id: string;
  title: string;
  body: string;
  severity: string;
  audience: string;
  starts_at: string | null;
  ends_at: string | null;
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

  getById(id: string): Observable<AnnouncementSummary> {
    return this.http
      .get<AnnouncementApi>(`${this.baseUrl}${API_ENDPOINTS.support.announcements.byId(id)}`, {
        withCredentials: true,
      })
      .pipe(map((item) => this.mapAnnouncement(item)));
  }

  create(request: AnnouncementRequest): Observable<AnnouncementSummary> {
    return this.http
      .post<AnnouncementApi>(
        `${this.baseUrl}${API_ENDPOINTS.support.announcements.create}`,
        this.toBody(request),
        { withCredentials: true },
      )
      .pipe(map((item) => this.mapAnnouncement(item)));
  }

  update(id: string, request: AnnouncementRequest): Observable<AnnouncementSummary> {
    return this.http
      .put<AnnouncementApi>(
        `${this.baseUrl}${API_ENDPOINTS.support.announcements.byId(id)}`,
        this.toBody(request),
        { withCredentials: true },
      )
      .pipe(map((item) => this.mapAnnouncement(item)));
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}${API_ENDPOINTS.support.announcements.byId(id)}`, {
      withCredentials: true,
    });
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

  private toBody(request: AnnouncementRequest) {
    return {
      title: request.title,
      body: request.body,
      severity: request.severity,
      audience: request.audience,
      starts_at: request.startsAt,
      ends_at: request.endsAt,
    };
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
      audience: item.audience as AnnouncementSummary['audience'],
      startsAt: item.starts_at ?? null,
      endsAt: item.ends_at ?? null,
      isPublished: item.is_published,
      publishedAt: item.published_at,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    };
  }
}
