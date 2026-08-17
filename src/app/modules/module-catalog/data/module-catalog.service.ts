import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import { ModuleCatalogItem, ModulePermissionItem } from './module-catalog.model';

@Injectable({ providedIn: 'root' })
export class ModuleCatalogService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  list(): Observable<ModuleCatalogItem[]> {
    return this.http.get<ModuleCatalogItem[]>(
      `${this.baseUrl}${API_ENDPOINTS.moduleCatalog.list}`,
      { withCredentials: true },
    );
  }

  listPermissions(moduleKey: string): Observable<ModulePermissionItem[]> {
    return this.http.get<ModulePermissionItem[]>(
      `${this.baseUrl}${API_ENDPOINTS.moduleCatalog.permissions(moduleKey)}`,
      { withCredentials: true },
    );
  }
}
