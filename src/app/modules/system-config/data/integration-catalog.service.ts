import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import {
  CreateIntegrationPayload,
  IntegrationCatalogEntry,
  UpdateIntegrationPayload,
} from './integration-catalog.model';

@Injectable({ providedIn: 'root' })
export class IntegrationCatalogService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  list(): Observable<IntegrationCatalogEntry[]> {
    return this.http.get<IntegrationCatalogEntry[]>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.integrations.list}`,
      { withCredentials: true },
    );
  }

  getByKey(integrationKey: string): Observable<IntegrationCatalogEntry> {
    return this.http.get<IntegrationCatalogEntry>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.integrations.byKey(integrationKey)}`,
      { withCredentials: true },
    );
  }

  create(payload: CreateIntegrationPayload): Observable<IntegrationCatalogEntry> {
    return this.http.post<IntegrationCatalogEntry>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.integrations.create}`,
      payload,
      { withCredentials: true },
    );
  }

  update(integrationKey: string, payload: UpdateIntegrationPayload): Observable<IntegrationCatalogEntry> {
    return this.http.put<IntegrationCatalogEntry>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.integrations.update(integrationKey)}`,
      payload,
      { withCredentials: true },
    );
  }

  setActive(integrationKey: string, active: boolean): Observable<IntegrationCatalogEntry> {
    const url = active
      ? API_ENDPOINTS.systemConfig.integrations.activate(integrationKey)
      : API_ENDPOINTS.systemConfig.integrations.deactivate(integrationKey);
    return this.http.post<IntegrationCatalogEntry>(`${this.baseUrl}${url}`, {}, { withCredentials: true });
  }

  linkModule(integrationKey: string, moduleKey: string): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.integrations.linkModule(integrationKey, moduleKey)}`,
      {},
      { withCredentials: true },
    );
  }

  unlinkModule(integrationKey: string, moduleKey: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.integrations.unlinkModule(integrationKey, moduleKey)}`,
      { withCredentials: true },
    );
  }
}
