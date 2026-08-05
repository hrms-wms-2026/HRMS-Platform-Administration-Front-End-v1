export interface PermissionState {
  permissions: string[];
  scopes: Record<string, string>;
  entitlements: string[];
  loaded: boolean;
}