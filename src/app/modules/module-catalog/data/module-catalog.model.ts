import { StatusTone } from '../../../shared/ui/status-badge/status-badge';

export interface ModuleCatalogItem {
  moduleKey: string;
  name: string;
  pillar: string;
  phase: string;
  pricingUnit: string;
  isActive: boolean;
}

export interface ModuleCatalogDetail {
  moduleKey: string;
  name: string;
  pillar: string;
  phase: string;
  pricingUnit: string;
  pricingReference: string;
  storageReference: string;
  aiTokenReference: string;
  isAiEnabled: boolean;
  isStorageConsuming: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface ModuleFeature {
  featureKey: string;
  name: string;
  description: string | null;
  isDefaultIncluded: boolean;
  isActive: boolean;
}

export interface ModulePermissionItem {
  permissionCode: string;
  isDefaultPermission: boolean;
}

export function moduleActiveTone(isActive: boolean): StatusTone {
  return isActive ? 'success' : 'neutral';
}
