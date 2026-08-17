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

export type ServiceKeyVerificationMode = 'live' | 'format-only';

/** Providers verified with a lightweight live API call (no email sent). */
export const LIVE_VERIFICATION_SERVICE_KEYS = ['resend', 'sendgrid'] as const;

/** Providers checked locally for plausible key shape only. */
export const FORMAT_ONLY_VERIFICATION_SERVICE_KEYS = [
  'cloudflare',
  'cloudflare_r2',
  'aws_rekognition',
] as const;

export function getServiceKeyVerificationMode(serviceKey: string): ServiceKeyVerificationMode {
  return (LIVE_VERIFICATION_SERVICE_KEYS as readonly string[]).includes(serviceKey)
    ? 'live'
    : 'format-only';
}

export function getServiceKeyVerificationModeLabel(mode: ServiceKeyVerificationMode): string {
  return mode === 'live' ? 'Live provider check' : 'Local format check';
}

export function getServiceKeyVerificationBadgeLabel(serviceKey: string): string {
  return getServiceKeyVerificationMode(serviceKey) === 'live' ? 'Live provider' : 'Format only';
}

/** Prefixes backend verification messages so admins can tell live vs local checks apart. */
export function formatServiceKeyVerificationToast(
  serviceKey: string,
  result: ServiceKeyVerificationResult,
): string {
  const prefix = getServiceKeyVerificationModeLabel(getServiceKeyVerificationMode(serviceKey));
  return `${prefix}: ${result.message}`;
}
