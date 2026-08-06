export interface PlatformUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  lastLoginAt: string | null;
}
