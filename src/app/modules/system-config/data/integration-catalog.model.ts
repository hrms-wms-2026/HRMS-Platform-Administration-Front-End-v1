export type IntegrationConnectionScope = 'tenant' | 'user' | 'both';

export interface IntegrationCatalogEntry {
  integrationKey: string;
  displayName: string;
  description: string | null;
  connectionScope: IntegrationConnectionScope;
  onevoAppProvider: string;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: string;
  linkedModuleKeys: string[];
}

export interface CreateIntegrationPayload {
  integrationKey: string;
  displayName: string;
  description?: string;
  connectionScope: IntegrationConnectionScope;
  onevoAppProvider: string;
  logoUrl?: string;
  isActive: boolean;
}

export interface UpdateIntegrationPayload {
  displayName: string;
  description?: string;
  connectionScope: IntegrationConnectionScope;
  onevoAppProvider: string;
  logoUrl?: string;
  isActive: boolean;
}
