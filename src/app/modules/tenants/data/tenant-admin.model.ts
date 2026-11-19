export interface UpdateTenantPayload {
  name: string;
  slug: string;
  industryProfile: string;
}

export interface InviteTenantAdminPayload {
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
}

export interface TenantInvitationResult {
  userId: string;
  inviteExpiresAt: string;
}

export interface TenantRoleSummary {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissionCount: number;
  createdAt: string;
  updatedAt: string | null;
  sourceTemplateId: string | null;
}

export interface TenantRolePermission {
  id: string;
  code: string;
  description: string;
  module: string;
}

export interface TenantRoleDetail {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: TenantRolePermission[];
  universalPermissions: TenantRolePermission[];
  createdAt: string;
  updatedAt: string | null;
}

export interface TenantPermissionCatalogItem {
  id: string | null;
  code: string;
  description: string;
  module: string;
  isAssignable: boolean;
  isUniversal: boolean;
}

export interface TenantPermissionCatalog {
  assignablePermissions: TenantPermissionCatalogItem[];
  universalPermissions: TenantPermissionCatalogItem[];
}

export interface CreateTenantRolePayload {
  name: string;
  description?: string;
  permissionIds: string[];
}

export interface ApplyTenantRoleTemplatePayload {
  roleNameOverride?: string;
  forceUpdate?: boolean;
}

export interface ApplyTenantRoleTemplateResult {
  roleId: string;
  roleName: string;
  appliedPermissions: string[];
  rejectedPermissions: string[];
  universalPermissions: string[];
}

export interface TenantSession {
  id: string;
  userId: string;
  userEmail: string | null;
  userFullName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  startedAt: string;
  lastActivityAt: string;
  expiresAt: string;
}

export interface TenantAuditLogEntry {
  id: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface TenantAuditLogListResponse {
  items: TenantAuditLogEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
}
