import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import { TenantIntegrationCredential } from './tenant-integration.model';

@Injectable({ providedIn: 'root' })
export class TenantIntegrationsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  listByTenant(tenantId: string): Observable<TenantIntegrationCredential[]> {
    const params = new HttpParams().set('tenantId', tenantId);
    return this.http.get<TenantIntegrationCredential[]>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.tenantIntegrations.list}`,
      { params, withCredentials: true },
    );
  }

  getById(id: string): Observable<TenantIntegrationCredential> {
    return this.http.get<TenantIntegrationCredential>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.tenantIntegrations.byId(id)}`,
      { withCredentials: true },
    );
  }

  disconnect(id: string): Observable<TenantIntegrationCredential> {
    return this.http.post<TenantIntegrationCredential>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.tenantIntegrations.disconnect(id)}`,
      {},
      { withCredentials: true },
    );
  }
}
