import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import {
  CreateTenantRequest,
  CreateTenantResult,
  ProvisioningSummary,
  TenantDetail,
  TenantListResponse,
  TenantValidationResult,
} from './tenant.model';

interface TenantDetailResponse {
  id: string;
  company_name: string;
  slug: string;
  industry_profile: string;
  company_size_range: string;
  status: string;
  subscription_plan_id: string | null;
  settings_json: string | null;
  legal_entity_name: string | null;
  registration_number: string | null;
  country: string | null;
  currency: string | null;
  created_at: string;
  updated_at: string | null;
}

function toTenantDetail(response: TenantDetailResponse): TenantDetail {
  return {
    id: response.id,
    companyName: response.company_name,
    slug: response.slug,
    industryProfile: response.industry_profile,
    companySizeRange: response.company_size_range,
    status: response.status,
    subscriptionPlanId: response.subscription_plan_id,
    settingsJson: response.settings_json,
    legalEntityName: response.legal_entity_name,
    registrationNumber: response.registration_number,
    country: response.country,
    currency: response.currency,
    createdAt: response.created_at,
    updatedAt: response.updated_at,
  };
}

export interface ListTenantsParams {
  search: string;
  status: string;
  page: number;
  pageSize: number;
}

@Injectable({ providedIn: 'root' })
export class TenantsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  list(params: ListTenantsParams): Observable<TenantListResponse> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('page_size', params.pageSize);
    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }

    return this.http.get<TenantListResponse>(`${this.baseUrl}${API_ENDPOINTS.tenants.list}`, {
      params: httpParams,
      withCredentials: true,
    });
  }

  getById(id: string): Observable<TenantDetail> {
    return this.http
      .get<TenantDetailResponse>(`${this.baseUrl}${API_ENDPOINTS.tenants.byId(id)}`, {
        withCredentials: true,
      })
      .pipe(map(toTenantDetail));
  }

  changeStatus(id: string, action: string, reason?: string): Observable<void> {
    return this.http.patch<void>(
      `${this.baseUrl}${API_ENDPOINTS.tenants.status(id)}`,
      { action, reason },
      { withCredentials: true },
    );
  }

  validate(params: {
    slug?: string;
    companyName?: string;
    emailDomain?: string;
    registrationNumber?: string;
    country?: string;
  }): Observable<TenantValidationResult> {
    let httpParams = new HttpParams();
    if (params.slug) httpParams = httpParams.set('slug', params.slug);
    if (params.companyName) httpParams = httpParams.set('company_name', params.companyName);
    if (params.emailDomain) httpParams = httpParams.set('email_domain', params.emailDomain);
    if (params.registrationNumber) {
      httpParams = httpParams.set('registration_number', params.registrationNumber);
    }
    if (params.country) httpParams = httpParams.set('country', params.country);

    return this.http.get<TenantValidationResult>(`${this.baseUrl}${API_ENDPOINTS.tenants.validate}`, {
      params: httpParams,
      withCredentials: true,
    });
  }

  create(request: CreateTenantRequest): Observable<CreateTenantResult> {
    const body = {
      company_name: request.companyName,
      slug: request.slug,
      industry_profile: request.industryProfile,
      company_size_range: request.companySizeRange,
      legal_entity_name: request.legalEntityName,
      registration_number: request.registrationNumber,
      country: request.country,
      timezone: request.timezone,
      currency: request.currency,
      subscription: {
        plan_id: request.planId,
        billing_cycle: request.billingCycle,
        commercial_model: 'standard',
      },
      owner_invite: {
        email: request.ownerInvite.email,
        first_name: request.ownerInvite.firstName,
        last_name: request.ownerInvite.lastName,
      },
    };

    return this.http.post<CreateTenantResult>(`${this.baseUrl}${API_ENDPOINTS.tenants.list}`, body, {
      withCredentials: true,
      headers: { 'Idempotency-Key': crypto.randomUUID() },
    });
  }

  getProvisioningSummary(id: string): Observable<ProvisioningSummary> {
    return this.http.get<ProvisioningSummary>(
      `${this.baseUrl}${API_ENDPOINTS.tenants.provisioningSummary(id)}`,
      { withCredentials: true },
    );
  }

  confirmProvisioning(id: string): Observable<void> {
    return this.http.patch<void>(
      `${this.baseUrl}${API_ENDPOINTS.tenants.confirmProvisioning(id)}`,
      { confirm: true },
      { withCredentials: true },
    );
  }
}
