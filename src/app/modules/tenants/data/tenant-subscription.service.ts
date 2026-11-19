import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import { TenantSubscription } from './tenant-subscription.model';

interface TenantSubscriptionApi {
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  subscription_id: string;
  subscription_plan_id: string;
  plan_name: string | null;
  plan_code: string | null;
  status: string;
  billing_cycle: string;
  currency: string;
  amount: number;
  current_period_start: string;
  current_period_end: string;
  trial_ends_at: string | null;
  grace_ends_at: string | null;
  access_ends_at: string | null;
  unpaid_grace_period_days: number;
  gateway_provider: string | null;
  gateway_customer_ref: string | null;
  gateway_subscription_ref: string | null;
  maintenance_status: string | null;
  maintenance_billing_cycle: string | null;
  maintenance_renewal_at: string | null;
  maintenance_amount: number | null;
  created_at: string;
  updated_at: string | null;
  is_active_access: boolean;
  is_in_trial: boolean;
  is_past_due: boolean;
  is_in_grace_period: boolean;
  days_until_renewal: number | null;
  days_until_access_ends: number | null;
}

@Injectable({ providedIn: 'root' })
export class TenantSubscriptionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  get(tenantId: string): Observable<TenantSubscription> {
    return this.http
      .get<TenantSubscriptionApi>(`${this.baseUrl}${API_ENDPOINTS.tenantSubscriptions.get(tenantId)}`, {
        withCredentials: true,
      })
      .pipe(map((item) => this.mapSubscription(item)));
  }

  private mapSubscription(item: TenantSubscriptionApi): TenantSubscription {
    return {
      tenantId: item.tenant_id,
      tenantName: item.tenant_name,
      tenantSlug: item.tenant_slug,
      subscriptionId: item.subscription_id,
      subscriptionPlanId: item.subscription_plan_id,
      planName: item.plan_name,
      planCode: item.plan_code,
      status: item.status,
      billingCycle: item.billing_cycle,
      currency: item.currency,
      amount: item.amount,
      currentPeriodStart: item.current_period_start,
      currentPeriodEnd: item.current_period_end,
      trialEndsAt: item.trial_ends_at,
      graceEndsAt: item.grace_ends_at,
      accessEndsAt: item.access_ends_at,
      unpaidGracePeriodDays: item.unpaid_grace_period_days,
      gatewayProvider: item.gateway_provider,
      gatewayCustomerRef: item.gateway_customer_ref,
      gatewaySubscriptionRef: item.gateway_subscription_ref,
      maintenanceStatus: item.maintenance_status,
      maintenanceBillingCycle: item.maintenance_billing_cycle,
      maintenanceRenewalAt: item.maintenance_renewal_at,
      maintenanceAmount: item.maintenance_amount,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      isActiveAccess: item.is_active_access,
      isInTrial: item.is_in_trial,
      isPastDue: item.is_past_due,
      isInGracePeriod: item.is_in_grace_period,
      daysUntilRenewal: item.days_until_renewal,
      daysUntilAccessEnds: item.days_until_access_ends,
    };
  }
}
