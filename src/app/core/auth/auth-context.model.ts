export interface AuthContext {
  userId: string;
  email: string;
  platformRole: string;
  expiresAt: string;
  mfaRequired: boolean;

  // The admin login/context endpoints do not return these yet — they stay
  // empty until a dedicated permissions endpoint is wired up.
  permissions: string[];
  scopes: Record<string, string>;
  entitlements: string[];
}