import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import {
  ApplyConfigurationTemplateResult,
  ConfigurationTemplate,
  ConfigurationTemplateDetail,
  ConfigurationTemplateListResponse,
  CreateConfigurationTemplateRequest,
  UpdateConfigurationTemplateRequest,
} from './configuration-template.model';

export interface ListConfigurationTemplatesParams {
  templateType?: string;
  activeOnly?: boolean;
  industryTag?: string;
  page: number;
  pageSize: number;
}

@Injectable({ providedIn: 'root' })
export class ConfigurationTemplatesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  list(params: ListConfigurationTemplatesParams): Observable<ConfigurationTemplateListResponse> {
    let httpParams = new HttpParams().set('page', params.page).set('page_size', params.pageSize);
    if (params.templateType) {
      httpParams = httpParams.set('type', params.templateType);
    }
    if (params.activeOnly) {
      httpParams = httpParams.set('active_only', params.activeOnly);
    }
    if (params.industryTag) {
      httpParams = httpParams.set('industry_tag', params.industryTag);
    }
    return this.http.get<ConfigurationTemplateListResponse>(
      `${this.baseUrl}${API_ENDPOINTS.configurationTemplates.list}`,
      { params: httpParams, withCredentials: true },
    );
  }

  getById(id: string): Observable<ConfigurationTemplateDetail> {
    return this.http.get<ConfigurationTemplateDetail>(
      `${this.baseUrl}${API_ENDPOINTS.configurationTemplates.byId(id)}`,
      { withCredentials: true },
    );
  }

  create(request: CreateConfigurationTemplateRequest): Observable<ConfigurationTemplate> {
    return this.http.post<ConfigurationTemplate>(
      `${this.baseUrl}${API_ENDPOINTS.configurationTemplates.create}`,
      request,
      { withCredentials: true },
    );
  }

  update(id: string, request: UpdateConfigurationTemplateRequest): Observable<ConfigurationTemplate> {
    return this.http.patch<ConfigurationTemplate>(
      `${this.baseUrl}${API_ENDPOINTS.configurationTemplates.update(id)}`,
      request,
      { withCredentials: true },
    );
  }

  deactivate(id: string): Observable<ConfigurationTemplate> {
    return this.http.delete<ConfigurationTemplate>(
      `${this.baseUrl}${API_ENDPOINTS.configurationTemplates.deactivate(id)}`,
      { withCredentials: true },
    );
  }

  clone(id: string): Observable<ConfigurationTemplate> {
    return this.http.post<ConfigurationTemplate>(
      `${this.baseUrl}${API_ENDPOINTS.configurationTemplates.clone(id)}`,
      {},
      { withCredentials: true },
    );
  }

  applyToTenant(
    tenantId: string,
    templateId: string,
    forceUpdate: boolean,
  ): Observable<ApplyConfigurationTemplateResult> {
    return this.http.post<ApplyConfigurationTemplateResult>(
      `${this.baseUrl}${API_ENDPOINTS.tenantConfigurationTemplates.apply(tenantId, templateId)}`,
      { forceUpdate },
      { withCredentials: true },
    );
  }
}
