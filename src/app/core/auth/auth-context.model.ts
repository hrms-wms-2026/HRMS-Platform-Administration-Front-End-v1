export interface AuthContext {
  userId: string;
  email: string;
  platformRole: string;
  expiresAt: string;
  mfaRequired: boolean;
  /**
   * Security audit F-02: true while this admin has not enrolled MFA. The backend then allows only
   * MFA setup, /me and logout, so the console keeps the admin on /settings/mfa until they enroll.
   * Distinct from mfaRequired, which means a TOTP challenge is pending at login.
   */
  mfaEnrollmentRequired: boolean;

  // The admin login/context endpoints do not return these yet — they stay
  // empty until a dedicated permissions endpoint is wired up.
  permissions: string[];
  scopes: Record<string, string>;
  entitlements: string[];
}