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

/** Providers verified with a lightweight live API call (no email sent, no Rekognition resources
 * touched, no R2 objects touched). */
export const LIVE_VERIFICATION_SERVICE_KEYS = [
  'resend',
  'sendgrid',
  'aws_rekognition',
  'cloudflare',
  'cloudflare_r2',
] as const;

/** Providers checked locally for plausible key shape only. Empty now that every catalog
 * provider has a live check - kept as a named export so future unwired providers have
 * somewhere to go without touching call sites. */
export const FORMAT_ONLY_VERIFICATION_SERVICE_KEYS: readonly string[] = [];

/** Providers whose API auth needs more than one value (AWS SigV4 needs an access key ID AND a
 * secret access key, not a single bearer token like Resend/SendGrid) - the backend's single
 * api_key_encrypted column stores this as one JSON blob, so the admin pastes JSON here instead
 * of a plain string. See PlatformServiceKeyVerificationService.VerifyAwsRekognitionAsync /
 * VerifyCloudflareR2Async. Plain Cloudflare is NOT here - it's a single bearer token like
 * Resend/SendGrid, no JSON needed. */
export interface JsonCredentialProviderInfo {
  placeholder: string;
  hint: string;
}

const JSON_CREDENTIAL_PROVIDERS: Record<string, JsonCredentialProviderInfo> = {
  aws_rekognition: {
    placeholder: '{"accessKeyId": "AKIA...", "secretAccessKey": "...", "region": "us-east-1"}',
    hint: 'AWS needs both an Access Key ID and a Secret Access Key, not a single token - paste both as JSON in this field. "region" is optional and defaults to us-east-1.',
  },
  cloudflare_r2: {
    placeholder:
      '{"accountId": "...", "bucketName": "...", "accessKeyId": "...", "secretAccessKey": "...", "endpoint": "https://<accountId>.r2.cloudflarestorage.com", "region": "auto"}',
    hint: 'R2 needs the account ID, bucket name, Access Key ID, Secret Access Key, and endpoint URL - paste all of them as JSON in this field. "region" is optional and defaults to auto.',
  },
};

export function getJsonCredentialProviderInfo(serviceKey: string): JsonCredentialProviderInfo | null {
  return JSON_CREDENTIAL_PROVIDERS[serviceKey] ?? null;
}

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
