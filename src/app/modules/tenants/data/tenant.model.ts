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
