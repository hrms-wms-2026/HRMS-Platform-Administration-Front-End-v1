import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import { AnnouncementSeverity } from './announcement.model';

export interface ActiveAnnouncement {
  id: string;
  title: string;
  body: string;
  severity: AnnouncementSeverity;
  publishedAt: string | null;
}

interface ActiveAnnouncementApi {
  id: string;
  title: string;
  body: string;
  severity: string;
  published_at: string | null;
}

/** Banner feed for the admin console: published announcements for everyone or for platform admins. */
@Injectable({ providedIn: 'root' })
export class ActiveAnnouncementsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  list(): Observable<ActiveAnnouncement[]> {
    return this.http
      .get<ActiveAnnouncementApi[]>(`${this.baseUrl}${API_ENDPOINTS.support.announcements.active}`, {
        withCredentials: true,
      })
      .pipe(
        map((items) =>
          items.map((item) => ({
            id: item.id,
            title: item.title,
            body: item.body,
            severity: item.severity as AnnouncementSeverity,
            publishedAt: item.published_at,
          })),
        ),
      );
  }
}
