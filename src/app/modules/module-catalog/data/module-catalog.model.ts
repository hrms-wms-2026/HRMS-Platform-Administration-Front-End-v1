export interface ModuleCatalogItem {
  moduleKey: string;
  name: string;
  pillar: string;
  phase: string;
  pricingUnit: string;
  isActive: boolean;
}

export interface ModulePermissionItem {
  permissionCode: string;
  isDefaultPermission: boolean;
}
