import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import { PlatformUser } from './platform-user.model';

@Injectable({ providedIn: 'root' })
export class PlatformUsersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  list(): Observable<PlatformUser[]> {
    return this.http.get<PlatformUser[]>(`${this.baseUrl}${API_ENDPOINTS.platformUsers.list}`, {
      withCredentials: true,
    });
  }
}
