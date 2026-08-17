export interface PaymentGatewayCountryRoute {
  id: string;
  countryCode: string;
  countryNameSnapshot: string | null;
  environment: string;
  isActive: boolean;
  createdAt: string;
}

export interface PaymentGatewayConfig {
  id: string;
  gatewayKey: string;
  provider: string;
  environment: string;
  displayName: string;
  logoUrl: string | null;
  publicKey: string | null;
  merchantId: string | null;
  webhookUrl: string | null;
  isActive: boolean;
  hasActiveCredential: boolean;
  activeCredentialVersion: number;
  createdAt: string;
  updatedAt: string;
  countryRoutes: PaymentGatewayCountryRoute[];
}

export interface PaymentGatewayProviderOption {
  providerKey: string;
  displayName: string;
  configured: boolean;
  isActive: boolean;
}

export interface CreatePaymentGatewayPayload {
  gatewayKey: string;
  provider: string;
  environment: 'sandbox' | 'production';
  displayName: string;
  logoUrl?: string;
  publicKey?: string;
  merchantId?: string;
  webhookUrl?: string;
  isActive: boolean;
  secretKey: string;
  webhookSecret?: string;
  countryCodes: string[];
  countryNameSnapshots: (string | null)[];
}

export interface UpdatePaymentGatewayMetadataPayload {
  displayName?: string;
  logoUrl?: string;
  publicKey?: string;
  merchantId?: string;
  webhookUrl?: string;
  isActive?: boolean;
  countryCodes?: string[];
  countryNameSnapshots?: (string | null)[];
}

export interface RotatePaymentGatewayCredentialsPayload {
  secretKey: string;
  webhookSecret?: string;
}

export interface GatewayVerificationResult {
  isVerified: boolean;
  accountName: string | null;
  country: string | null;
  defaultCurrency: string | null;
  enabledPaymentMethods: string[];
  chargesEnabled: boolean | null;
  payoutsEnabled: boolean | null;
  errorMessage: string | null;
}

export const PAYMENT_GATEWAY_ENVIRONMENTS = [
  { value: 'sandbox', label: 'Sandbox' },
  { value: 'production', label: 'Production' },
] as const;

export function parseCountryCodesInput(value: string): string[] {
  return value
    .split(/[,\s]+/)
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean);
}
