import { PlatformRoleSummary } from './platform-role-summary.model';

export interface PlatformUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  lastLoginAt: string | null;
}

export interface PlatformUserDetail {
  id: string;
  email: string;
  fullName: string;
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  lastLoginAt: string | null;
  roles: PlatformRoleSummary[];
}
