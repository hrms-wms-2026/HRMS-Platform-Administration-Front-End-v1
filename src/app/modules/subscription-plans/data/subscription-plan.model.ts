export interface SubscriptionPlanSummary {
  id: string;
  name: string;
  code: string;
  tier: string;
  companySizeRange: string;
  effectiveMonthlyPrice: number;
  effectiveAnnualPrice: number;
  currency: string;
  isActive: boolean;
}
