import { PlatformRoleSummary } from './platform-role-summary.model';

export interface PlatformUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  lastLoginAt: string | null;
  /** A revoked invite and a deactivated account are both `inactive`; this tells them apart. */
  inviteStatus: 'pending' | 'accepted' | 'revoked' | 'expired';
}

/** Values the invite modal starts with when re-inviting a revoked user. */
export interface InvitePrefill {
  email: string;
  fullName: string;
  /** Role name from the list row; matched to a role id once roles load. */
  roleName: string;
}

export interface PlatformUserDetail {
  id: string;
  email: string;
  fullName: string;
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  lastLoginAt: string | null;
  roles: PlatformRoleSummary[];
  /** "enrolled" | "not_enrolled" | "locked". The TOTP secret is never sent. */
  mfaStatus: string;
}
