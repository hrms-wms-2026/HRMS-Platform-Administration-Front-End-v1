import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import { PlatformPermission, PlatformRole, PlatformRoleDetail } from './platform-role.model';

@Injectable({ providedIn: 'root' })
export class PlatformRolesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  listRoles(): Observable<PlatformRole[]> {
    return this.http.get<PlatformRole[]>(`${this.baseUrl}${API_ENDPOINTS.roles.list}`, {
      withCredentials: true,
    });
  }

  getRoleById(id: string): Observable<PlatformRoleDetail> {
    return this.http.get<PlatformRoleDetail>(`${this.baseUrl}${API_ENDPOINTS.roles.byId(id)}`, {
      withCredentials: true,
    });
  }

  listPermissions(): Observable<PlatformPermission[]> {
    return this.http.get<PlatformPermission[]>(`${this.baseUrl}${API_ENDPOINTS.roles.permissions}`, {
      withCredentials: true,
    });
  }

  updateRolePermissions(id: string, permissions: string[]): Observable<void> {
    return this.http.put<void>(
      `${this.baseUrl}${API_ENDPOINTS.roles.updatePermissions(id)}`,
      { permissions },
      { withCredentials: true },
    );
  }
}
