import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import {
  CreateRoleTemplatePayload,
  RoleTemplate,
  UpdateRoleTemplatePayload,
} from './role-template.model';

@Injectable({ providedIn: 'root' })
export class RoleTemplatesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  list(): Observable<RoleTemplate[]> {
    return this.http.get<RoleTemplate[]>(`${this.baseUrl}${API_ENDPOINTS.roleTemplates.list}`, {
      withCredentials: true,
    });
  }

  create(payload: CreateRoleTemplatePayload): Observable<RoleTemplate> {
    return this.http.post<RoleTemplate>(`${this.baseUrl}${API_ENDPOINTS.roleTemplates.create}`, payload, {
      withCredentials: true,
    });
  }

  update(templateId: string, payload: UpdateRoleTemplatePayload): Observable<RoleTemplate> {
    return this.http.patch<RoleTemplate>(
      `${this.baseUrl}${API_ENDPOINTS.roleTemplates.update(templateId)}`,
      payload,
      { withCredentials: true },
    );
  }
}
