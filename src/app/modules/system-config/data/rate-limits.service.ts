import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import {
  GlobalRateLimit,
  PlanRateLimits,
  RateLimitChangesPage,
  RateLimitRejections,
  RateLimitName,
  RateLimitScope,
  SetRateLimitRequest,
  TenantRateLimits,
} from './rate-limit.model';

/** Where an override lives: the platform, one subscription plan, or one tenant. */
export type RateLimitTarget =
  | { scope: 'global' }
  | { scope: 'plan'; planId: string }
  | { scope: 'tenant'; tenantId: string };

export interface RateLimitChangesFilter {
  scope?: RateLimitScope;
  planId?: string;
  tenantId?: string;
  page: number;
  pageSize: number;
}

/** One method per admin rate limit route (Improvements task 47). */
@Injectable({ providedIn: 'root' })
export class RateLimitsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  listGlobal(): Observable<GlobalRateLimit[]> {
    return this.http.get<GlobalRateLimit[]>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.rateLimits.list}`,
      { withCredentials: true },
    );
  }

  getPlan(planId: string): Observable<PlanRateLimits> {
    return this.http.get<PlanRateLimits>(
      `${this.baseUrl}${API_ENDPOINTS.subscriptionPlans.rateLimits(planId)}`,
      { withCredentials: true },
    );
  }

  getTenant(tenantId: string): Observable<TenantRateLimits> {
    return this.http.get<TenantRateLimits>(
      `${this.baseUrl}${API_ENDPOINTS.tenants.rateLimits(tenantId)}`,
      { withCredentials: true },
    );
  }

  listChanges(filter: RateLimitChangesFilter): Observable<RateLimitChangesPage> {
    let params = new HttpParams().set('page', filter.page).set('pageSize', filter.pageSize);
    if (filter.scope) params = params.set('scope', filter.scope);
    if (filter.planId) params = params.set('planId', filter.planId);
    if (filter.tenantId) params = params.set('tenantId', filter.tenantId);
    return this.http.get<RateLimitChangesPage>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.rateLimits.changes}`,
      { params, withCredentials: true },
    );
  }

  /** Task 49: the tenants with the most 429s on this API server in the last 1 to 60 minutes. */
  listRejections(minutes = 60): Observable<RateLimitRejections> {
    return this.http.get<RateLimitRejections>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.rateLimits.rejections}`,
      { params: new HttpParams().set('minutes', minutes), withCredentials: true },
    );
  }

  set(target: RateLimitTarget, limitName: RateLimitName, request: SetRateLimitRequest): Observable<unknown> {
    return this.http.put(`${this.baseUrl}${this.limitUrl(target, limitName)}`, request, {
      withCredentials: true,
    });
  }

  remove(
    target: RateLimitTarget,
    limitName: RateLimitName,
    reason: string,
    rowVersion: string | null,
  ): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}${this.limitUrl(target, limitName)}`, {
      body: { reason, rowVersion },
      withCredentials: true,
    });
  }

  private limitUrl(target: RateLimitTarget, limitName: RateLimitName): string {
    switch (target.scope) {
      case 'global':
        return API_ENDPOINTS.systemConfig.rateLimits.byName(limitName);
      case 'plan':
        return `${API_ENDPOINTS.subscriptionPlans.rateLimits(target.planId)}/${limitName}`;
      case 'tenant':
        return `${API_ENDPOINTS.tenants.rateLimits(target.tenantId)}/${limitName}`;
    }
  }
}
