import { IntegrationConnectionScope } from './integration-catalog.model';

export interface ConnectionScopeOption {
  value: IntegrationConnectionScope;
  label: string;
}

export const INTEGRATION_CONNECTION_SCOPE_OPTIONS: ConnectionScopeOption[] = [
  { value: 'tenant', label: 'Tenant' },
  { value: 'user', label: 'User' },
  { value: 'both', label: 'Tenant & User' },
];

export function connectionScopeLabel(scope: IntegrationConnectionScope): string {
  return INTEGRATION_CONNECTION_SCOPE_OPTIONS.find((option) => option.value === scope)?.label ?? scope;
}
