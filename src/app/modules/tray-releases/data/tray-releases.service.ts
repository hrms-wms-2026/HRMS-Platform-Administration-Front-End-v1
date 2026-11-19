import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import { CreateTrayReleasePayload, TrayRelease, UpdateTrayReleasePayload } from './tray-release.model';

@Injectable({ providedIn: 'root' })
export class TrayReleasesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  list(): Observable<TrayRelease[]> {
    return this.http.get<TrayRelease[]>(`${this.baseUrl}${API_ENDPOINTS.trayReleases.list}`, {
      withCredentials: true,
    });
  }

  create(payload: CreateTrayReleasePayload): Observable<TrayRelease> {
    return this.http.post<TrayRelease>(`${this.baseUrl}${API_ENDPOINTS.trayReleases.create}`, payload, {
      withCredentials: true,
    });
  }

  update(id: string, patch: UpdateTrayReleasePayload): Observable<TrayRelease> {
    return this.http.put<TrayRelease>(`${this.baseUrl}${API_ENDPOINTS.trayReleases.update(id)}`, patch, {
      withCredentials: true,
    });
  }
}
