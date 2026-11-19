import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import { ConfigureOAuthAppPayload, OAuthApp, OAuthAppValidateConfigResult } from './oauth-app.model';

@Injectable({ providedIn: 'root' })
export class OAuthAppsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  list(): Observable<OAuthApp[]> {
    return this.http.get<OAuthApp[]>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.oauthApps.list}`,
      { withCredentials: true },
    );
  }

  getById(provider: string): Observable<OAuthApp> {
    return this.http.get<OAuthApp>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.oauthApps.byId(provider)}`,
      { withCredentials: true },
    );
  }

  configure(provider: string, payload: ConfigureOAuthAppPayload): Observable<OAuthApp> {
    return this.http.put<OAuthApp>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.oauthApps.configure(provider)}`,
      payload,
      { withCredentials: true },
    );
  }

  rotateSecret(provider: string, clientSecret: string, privateKey?: string): Observable<OAuthApp> {
    return this.http.post<OAuthApp>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.oauthApps.rotateSecret(provider)}`,
      { clientSecret, privateKey: privateKey || undefined },
      { withCredentials: true },
    );
  }

  setActive(provider: string, active: boolean): Observable<OAuthApp> {
    const url = active
      ? API_ENDPOINTS.systemConfig.oauthApps.activate(provider)
      : API_ENDPOINTS.systemConfig.oauthApps.deactivate(provider);
    return this.http.post<OAuthApp>(`${this.baseUrl}${url}`, {}, { withCredentials: true });
  }

  validateConfig(provider: string): Observable<OAuthAppValidateConfigResult> {
    return this.http.post<OAuthAppValidateConfigResult>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.oauthApps.validateConfig(provider)}`,
      {},
      { withCredentials: true },
    );
  }
}
