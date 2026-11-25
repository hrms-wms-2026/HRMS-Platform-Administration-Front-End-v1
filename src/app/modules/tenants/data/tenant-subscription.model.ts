import { StatusTone } from '../../../shared/ui/status-badge/status-badge';

export interface TenantSubscription {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  subscriptionId: string;
  subscriptionPlanId: string;
  planName: string | null;
  planCode: string | null;
  status: string;
  billingCycle: string;
  currency: string;
  amount: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt: string | null;
  graceEndsAt: string | null;
  accessEndsAt: string | null;
  unpaidGracePeriodDays: number;
  gatewayProvider: string | null;
  gatewayCustomerRef: string | null;
  gatewaySubscriptionRef: string | null;
  maintenanceStatus: string | null;
  maintenanceBillingCycle: string | null;
  maintenanceRenewalAt: string | null;
  maintenanceAmount: number | null;
  createdAt: string;
  updatedAt: string | null;
  isActiveAccess: boolean;
  isInTrial: boolean;
  isPastDue: boolean;
  isInGracePeriod: boolean;
  daysUntilRenewal: number | null;
  daysUntilAccessEnds: number | null;
  /** Seats the tenant may use. null = not configured, so onboarding can't be finalized. */
  includedSeats: number | null;
  overageAllowed: boolean | null;
  /** Employees counted against seats (same count that gates onboarding). */
  usedSeats: number | null;
  /** Internal/testing tenant: never billed, never trials out, ignores Stripe events. */
  isTest: boolean;
}

export interface TenantSubscriptionUpdate {
  includedSeats?: number;
  overageAllowed?: boolean;
  isTest?: boolean;
}

export function seatUsageLabel(sub: Pick<TenantSubscription, 'includedSeats' | 'usedSeats'>): string {
  if (sub.includedSeats === null) {
    return 'Not configured';
  }
  return `${sub.usedSeats ?? 0} of ${sub.includedSeats} used`;
}

export function tenantSubscriptionStatusTone(
  status: string,
  subscription: Pick<TenantSubscription, 'isPastDue' | 'isInGracePeriod'>,
): StatusTone {
  if (subscription.isPastDue || subscription.isInGracePeriod) {
    return 'warning';
  }

  switch (status) {
    case 'active':
    case 'trialing':
      return 'success';
    case 'subscription_included':
    case 'maintenance_included':
      return 'indigo';
    case 'past_due':
    case 'in_grace':
      return 'warning';
    case 'suspended':
    case 'cancelled':
    case 'expired':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function renewalCountdownLabel(
  daysUntilRenewal: number | null | undefined,
  isPastDue: boolean,
): string {
  if (isPastDue || (daysUntilRenewal !== null && daysUntilRenewal !== undefined && daysUntilRenewal < 0)) {
    return 'Renewal date passed';
  }
  if (daysUntilRenewal === 0) {
    return 'Renewal due';
  }
  if (daysUntilRenewal !== null && daysUntilRenewal !== undefined && daysUntilRenewal > 0) {
    return `Renews in ${daysUntilRenewal} day${daysUntilRenewal === 1 ? '' : 's'}`;
  }
  return '—';
}

export function formatSubscriptionAmount(currency: string, amount: number): string {
  return `${currency} ${amount.toFixed(2)}`;
}
