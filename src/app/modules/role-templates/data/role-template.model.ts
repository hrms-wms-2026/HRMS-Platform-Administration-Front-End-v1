export interface RoleTemplate {
  id: string;
  name: string;
  description: string | null;
  moduleKeys: string[];
  permissionCodes: string[];
  isSystem: boolean;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateRoleTemplatePayload {
  name: string;
  description?: string;
  moduleKeys: string[];
  permissionCodes: string[];
}

export interface UpdateRoleTemplatePayload extends CreateRoleTemplatePayload {
  isActive: boolean;
}
