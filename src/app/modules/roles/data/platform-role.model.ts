export interface PlatformRole {
  id: string;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  createdAt: string;
}

export interface PlatformRoleDetail extends PlatformRole {
  permissions: string[];
}

export interface PlatformPermission {
  code: string;
  moduleKey: string;
  description: string;
  isHighRisk: boolean;
}
