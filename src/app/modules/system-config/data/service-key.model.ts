export interface ServiceKey {
  id: string;
  serviceKey: string;
  displayName: string;
  isActive: boolean;
  lastVerifiedAt: string | null;
  updatedById: string;
  updatedAt: string;
}

export interface ServiceKeyProviderOption {
  providerKey: string;
  displayName: string;
  configured: boolean;
  isActive: boolean;
}

export interface ServiceKeyVerificationResult {
  success: boolean;
  checkedAt: string;
  message: string;
}
