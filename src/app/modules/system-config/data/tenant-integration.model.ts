export interface TenantIntegrationCredential {
  id: string;
  tenantId: string;
  integrationKey: string;
  status: string;
  scopesGranted: string[];
  externalAccountId: string | null;
  externalAccountName: string | null;
  tokenExpiresAt: string | null;
  lastSyncAt: string | null;
  connectedAt: string;
  connectedByUserId: string;
  disconnectedAt: string | null;
  errorMessage: string | null;
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
}

export function tenantIntegrationStatusTone(
  status: string,
): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'connected':
      return 'success';
    case 'error':
      return 'danger';
    case 'expired':
      return 'warning';
    default:
      return 'neutral';
  }
}

export function tenantIntegrationStatusLabel(status: string): string {
  if (!status) {
    return 'Unknown';
  }
  return status.charAt(0).toUpperCase() + status.slice(1);
}
