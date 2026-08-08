import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import { SubscriptionPlanSummary } from './subscription-plan.model';

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
}
