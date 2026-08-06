import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import { PlatformUser } from './platform-user.model';
import { PlatformRoleSummary } from './platform-role-summary.model';

@Injectable({ providedIn: 'root' })
export class PlatformUsersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  list(): Observable<PlatformUser[]> {
    return this.http.get<PlatformUser[]>(`${this.baseUrl}${API_ENDPOINTS.platformUsers.list}`, {
      withCredentials: true,
    });
  }

  invite(email: string, fullName: string, roleIds: string[]): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}${API_ENDPOINTS.platformUsers.invite}`,
      { email, fullName, roleIds },
      { withCredentials: true },
    );
  }

  revokeInvite(platformUserId: string): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}${API_ENDPOINTS.platformUsers.revokeInvite(platformUserId)}`,
      {},
      { withCredentials: true },
    );
  }

  listRoles(): Observable<PlatformRoleSummary[]> {
    return this.http.get<PlatformRoleSummary[]>(`${this.baseUrl}${API_ENDPOINTS.platformRoles.list}`, {
      withCredentials: true,
    });
  }
}
