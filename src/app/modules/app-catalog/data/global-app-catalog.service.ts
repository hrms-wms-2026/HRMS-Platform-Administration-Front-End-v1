import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { GlobalApplication, UpdateGlobalApplicationPayload } from './global-application.model';

@Injectable({ providedIn: 'root' })
export class GlobalAppCatalogService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  list(): Observable<GlobalApplication[]> {
    return this.http.get<GlobalApplication[]>(`${this.baseUrl}${API_ENDPOINTS.appCatalog.list}`, {
      withCredentials: true,
    });
  }

  update(id: string, payload: UpdateGlobalApplicationPayload): Observable<GlobalApplication> {
    return this.http.put<GlobalApplication>(
      `${this.baseUrl}${API_ENDPOINTS.appCatalog.byId(id)}`,
      payload,
      { withCredentials: true },
    );
  }

  setLogo(id: string, file: File): Observable<GlobalApplication> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.put<GlobalApplication>(
      `${this.baseUrl}${API_ENDPOINTS.appCatalog.logo(id)}`,
      form,
      { withCredentials: true },
    );
  }

  logoUrl(app: GlobalApplication): string {
    const version = encodeURIComponent(app.updatedAt ?? app.lastSeenAt);
    return `${this.baseUrl}${API_ENDPOINTS.appCatalog.logo(app.id)}?v=${version}`;
  }
}
