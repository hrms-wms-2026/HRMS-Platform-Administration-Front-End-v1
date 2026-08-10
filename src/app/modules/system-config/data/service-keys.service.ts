import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import { ServiceKey, ServiceKeyProviderOption, ServiceKeyVerificationResult } from './service-key.model';

@Injectable({ providedIn: 'root' })
export class ServiceKeysService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  list(): Observable<ServiceKey[]> {
    return this.http.get<ServiceKey[]>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.serviceKeys.list}`,
      { withCredentials: true },
    );
  }

  listProviders(): Observable<ServiceKeyProviderOption[]> {
    return this.http.get<ServiceKeyProviderOption[]>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.serviceKeys.providers}`,
      { withCredentials: true },
    );
  }

  create(serviceKey: string, displayName: string, apiKey: string): Observable<ServiceKey> {
    return this.http.post<ServiceKey>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.serviceKeys.create}`,
      { serviceKey, displayName, apiKey },
      { withCredentials: true },
    );
  }

  updateDisplayName(serviceKey: string, displayName: string): Observable<ServiceKey> {
    return this.http.put<ServiceKey>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.serviceKeys.update(serviceKey)}`,
      { displayName },
      { withCredentials: true },
    );
  }

  rotateKey(serviceKey: string, apiKey: string): Observable<ServiceKey> {
    return this.http.post<ServiceKey>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.serviceKeys.rotateKey(serviceKey)}`,
      { apiKey },
      { withCredentials: true },
    );
  }

  verify(serviceKey: string): Observable<ServiceKeyVerificationResult> {
    return this.http.post<ServiceKeyVerificationResult>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.serviceKeys.verify(serviceKey)}`,
      {},
      { withCredentials: true },
    );
  }

  setActive(serviceKey: string, active: boolean): Observable<ServiceKey> {
    const url = active
      ? API_ENDPOINTS.systemConfig.serviceKeys.activate(serviceKey)
      : API_ENDPOINTS.systemConfig.serviceKeys.deactivate(serviceKey);
    return this.http.post<ServiceKey>(`${this.baseUrl}${url}`, {}, { withCredentials: true });
  }
}
