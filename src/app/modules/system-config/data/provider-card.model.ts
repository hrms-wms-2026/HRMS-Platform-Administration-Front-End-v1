export interface PlatformProviderCard {
  id: string;
  providerKey: string;
  displayName: string;
  providerFamily: string;
  configured: boolean;
  configurationActive: boolean;
  lastVerifiedAt: string | null;
}
