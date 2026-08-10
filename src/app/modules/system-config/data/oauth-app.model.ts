export interface OAuthApp {
  provider: string;
  displayName: string;
  appName: string | null;
  logoUrl: string | null;
  configured: boolean;
  isActive: boolean;
  clientId: string | null;
  authorizationUrl: string;
  tokenUrl: string;
  defaultScopes: string[];
  capabilities: string[];
  clientSecretRequired: boolean;
  hasActiveCredential: boolean;
  activeCredentialVersion: number | null;
  hasPrivateKey: boolean;
  lastVerifiedAt: string | null;
  updatedAt: string | null;
}

export interface OAuthAppValidateConfigResult {
  provider: string;
  status: string;
  verificationType: string;
  message: string;
  verifiedAt: string | null;
}

export interface ConfigureOAuthAppPayload {
  appName?: string;
  logoUrl?: string;
  clientId?: string;
  clientSecret?: string;
  privateKey?: string;
}
