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

export interface SubscriptionPlanDetail {
  id: string;
  name: string;
  code: string;
  tier: string;
  companySizeRange: string;
  pricingUnit: string;
  includedModules: string[];
  calculatedMonthlyPrice: number;
  calculatedAnnualPrice: number;
  overrideMonthlyPrice: number | null;
  overrideAnnualPrice: number | null;
  effectiveMonthlyPrice: number;
  effectiveAnnualPrice: number;
  currency: string;
  aiTokenLimitPerMonth: number | null;
  trialPeriodDays: number;
  unpaidGracePeriodDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateSubscriptionPlanRequest {
  name: string;
  code: string;
  tier: string;
  companySizeRange: string;
  moduleKeys: string[];
  currency: string;
  overrideMonthlyPrice: number | null;
  overrideAnnualPrice: number | null;
  aiTokenLimitPerMonth: number | null;
  trialPeriodDays: number;
  unpaidGracePeriodDays: number;
}

export interface UpdateSubscriptionPlanRequest {
  name?: string;
  tier?: string;
  companySizeRange?: string;
  moduleKeys?: string[];
  currency?: string;
  overrideMonthlyPrice?: number | null;
  overrideAnnualPrice?: number | null;
  aiTokenLimitPerMonth?: number | null;
  trialPeriodDays?: number;
  unpaidGracePeriodDays?: number;
}
