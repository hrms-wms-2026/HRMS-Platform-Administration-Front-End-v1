export interface ServiceKey {
  id: string;
  serviceKey: string;
  displayName: string;
  isActive: boolean;
  lastVerifiedAt: string | null;
  updatedById: string;
  updatedAt: string;
}

export type ServiceKeyVerificationMode = 'live' | 'format-only';

export type ServiceKeyFieldKind = 'text' | 'secret' | 'select' | 'url';

export interface ServiceKeyFieldOption {
  value: string;
  label: string;
}

/** One input the backend says this service key needs. The form is rendered from these. */
export interface ServiceKeyField {
  name: string;
  label: string;
  kind: ServiceKeyFieldKind;
  required: boolean;
  placeholder: string | null;
  defaultValue: string | null;
  options: ServiceKeyFieldOption[];
}

export interface ServiceKeyProviderOption {
  providerKey: string;
  displayName: string;
  configured: boolean;
  isActive: boolean;
  verificationMode: ServiceKeyVerificationMode;
  fields: ServiceKeyField[];
}

export interface ServiceKeyVerificationResult {
  success: boolean;
  checkedAt: string;
  message: string;
  /** Who the provider says the credential belongs to; only some providers report this. */
  identity?: string | null;
  region?: string | null;
  service?: string | null;
}

export function getServiceKeyVerificationModeLabel(mode: ServiceKeyVerificationMode): string {
  return mode === 'live' ? 'Live provider check' : 'Local format check';
}

export function getServiceKeyVerificationBadgeLabel(mode: ServiceKeyVerificationMode): string {
  return mode === 'live' ? 'Live provider' : 'Format only';
}

/** Prefixes backend verification messages so admins can tell live vs local checks apart. */
export function formatServiceKeyVerificationToast(
  mode: ServiceKeyVerificationMode,
  result: ServiceKeyVerificationResult,
): string {
  return `${getServiceKeyVerificationModeLabel(mode)}: ${result.message}`;
}
