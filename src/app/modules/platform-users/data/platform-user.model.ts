export interface PlatformUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}
