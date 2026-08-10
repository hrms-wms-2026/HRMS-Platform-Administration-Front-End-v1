export interface TenantListItem {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
}

export interface TenantListResponse {
  items: TenantListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TenantDetail {
  id: string;
  companyName: string;
  slug: string;
  industryProfile: string;
  companySizeRange: string;
  status: string;
  subscriptionPlanId: string | null;
  settingsJson: string | null;
  legalEntityName: string | null;
  registrationNumber: string | null;
  country: string | null;
  currency: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface TenantValidationConflict {
  field: string;
  message: string;
}

export interface TenantValidationWarning {
  field: string;
  message: string;
}

export interface TenantValidationResult {
  valid: boolean;
  conflicts: TenantValidationConflict[];
  warnings: TenantValidationWarning[];
}

export interface CreateTenantOwnerInvite {
  email: string;
  firstName: string;
  lastName: string;
}

export interface CreateTenantRequest {
  companyName: string;
  slug: string;
  industryProfile: string;
  companySizeRange: string;
  legalEntityName: string;
  registrationNumber: string | null;
  country: string;
  timezone: string;
  currency: string;
  planId: string;
  billingCycle: 'monthly' | 'annual';
  ownerInvite: CreateTenantOwnerInvite;
}

export interface CreateTenantResult {
  tenantId: string;
  status: string;
  nextStep: string;
}

export interface ProvisioningSectionStatus {
  complete: boolean;
  summary: Record<string, unknown>;
  missingFields: string[];
}

export interface ProvisioningSections {
  tenantDetails: ProvisioningSectionStatus;
  subscription: ProvisioningSectionStatus;
  modules: ProvisioningSectionStatus;
  roles: ProvisioningSectionStatus;
  settings: ProvisioningSectionStatus;
  ownerInvite: ProvisioningSectionStatus;
}

export interface ProvisioningIssue {
  code: string;
  message: string;
  section: string;
}

export interface ProvisioningSummary {
  tenantId: string;
  status: string;
  sections: ProvisioningSections;
  canActivate: boolean;
  blockingErrors: ProvisioningIssue[];
  warnings: ProvisioningIssue[];
}
