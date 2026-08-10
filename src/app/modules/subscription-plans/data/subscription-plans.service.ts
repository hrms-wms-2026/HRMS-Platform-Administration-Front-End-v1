import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import {
  CreateSubscriptionPlanRequest,
  SubscriptionPlanDetail,
  SubscriptionPlanSummary,
  UpdateSubscriptionPlanRequest,
} from './subscription-plan.model';

@Injectable({ providedIn: 'root' })
export class SubscriptionPlansService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  list(): Observable<SubscriptionPlanSummary[]> {
    return this.http.get<SubscriptionPlanSummary[]>(
      `${this.baseUrl}${API_ENDPOINTS.subscriptionPlans.list}`,
      { withCredentials: true },
    );
  }

  getById(id: string): Observable<SubscriptionPlanDetail> {
    return this.http.get<SubscriptionPlanDetail>(
      `${this.baseUrl}${API_ENDPOINTS.subscriptionPlans.byId(id)}`,
      { withCredentials: true },
    );
  }

  create(request: CreateSubscriptionPlanRequest): Observable<SubscriptionPlanDetail> {
    return this.http.post<SubscriptionPlanDetail>(
      `${this.baseUrl}${API_ENDPOINTS.subscriptionPlans.create}`,
      request,
      { withCredentials: true },
    );
  }

  update(id: string, request: UpdateSubscriptionPlanRequest): Observable<void> {
    return this.http.patch<void>(
      `${this.baseUrl}${API_ENDPOINTS.subscriptionPlans.update(id)}`,
      request,
      { withCredentials: true },
    );
  }

  archive(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}${API_ENDPOINTS.subscriptionPlans.archive(id)}`,
      { withCredentials: true },
    );
  }
}
