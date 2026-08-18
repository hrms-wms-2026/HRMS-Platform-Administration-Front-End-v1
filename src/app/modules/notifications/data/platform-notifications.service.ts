import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import { PlatformNotification } from './platform-notification.model';

@Injectable({ providedIn: 'root' })
export class PlatformNotificationsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  list(unreadOnly = false, page = 1): Observable<PlatformNotification[]> {
    const params = new HttpParams()
      .set('unreadOnly', String(unreadOnly))
      .set('page', String(page));
    return this.http.get<PlatformNotification[]>(`${this.baseUrl}${API_ENDPOINTS.notifications.list}`, {
      params,
      withCredentials: true,
    });
  }

  unreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.baseUrl}${API_ENDPOINTS.notifications.unreadCount}`, {
      withCredentials: true,
    });
  }

  markRead(id: string): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}${API_ENDPOINTS.notifications.markRead(id)}`,
      {},
      { withCredentials: true },
    );
  }

  markAllRead(): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}${API_ENDPOINTS.notifications.markAllRead}`,
      {},
      { withCredentials: true },
    );
  }
}
