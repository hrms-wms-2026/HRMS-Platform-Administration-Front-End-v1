import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import { PlatformProviderCard } from './provider-card.model';

@Injectable({ providedIn: 'root' })
export class ProvidersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  list(): Observable<PlatformProviderCard[]> {
    return this.http.get<PlatformProviderCard[]>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.providers.list}`,
      { withCredentials: true },
    );
  }
}
