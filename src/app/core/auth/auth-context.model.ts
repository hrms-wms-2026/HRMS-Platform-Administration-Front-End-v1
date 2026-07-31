export interface AuthContext {
  user: {
    id: string;
    name: string;
    tenantId: string;
    roles: string[];
  };

  permissions: string[];
  scopes: Record<string, string>;
  entitlements: string[];
  policyVersion: number;
}