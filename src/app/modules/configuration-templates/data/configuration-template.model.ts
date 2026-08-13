export interface ConfigurationTemplate {
  id: string;
  templateKey: string;
  templateType: string;
  name: string;
  description: string | null;
  version: number;
  moduleKeys: string[];
  industryProfileTag: string | null;
  payloadJson: Record<string, unknown>;
  isSystem: boolean;
  isActive: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface ConfigurationTemplateListResponse {
  items: ConfigurationTemplate[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface TenantConfigurationTemplateApplication {
  id: string;
  tenantId: string;
  configurationTemplateId: string;
  templateType: string;
  appliedVersion: number;
  appliedPayloadJson: Record<string, unknown>;
  customPayloadJson: Record<string, unknown> | null;
  warnings: string[];
  status: string;
  appliedById: string;
  appliedAt: string;
}

export interface ConfigurationTemplateDetail {
  template: ConfigurationTemplate;
  applyHistory: TenantConfigurationTemplateApplication[];
}

export interface CreateConfigurationTemplateRequest {
  templateKey: string;
  templateType: string;
  name: string;
  description: string | null;
  moduleKeys: string[];
  industryProfileTag: string | null;
  payloadJson: Record<string, unknown>;
  isSystem: boolean;
}

export interface UpdateConfigurationTemplateRequest {
  name?: string;
  description?: string | null;
  moduleKeys?: string[];
  industryProfileTag?: string | null;
  payloadJson?: Record<string, unknown>;
}

export interface ApplyConfigurationTemplateResult {
  applicationId: string;
  appliedVersion: number;
  warnings: string[];
}

export const TEMPLATE_TYPES: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'configuration', label: 'Configuration' },
  { value: 'position_template', label: 'Position Template' },
  { value: 'time_off_policy', label: 'Time-Off Policy' },
  { value: 'monitoring_policy', label: 'Monitoring Policy' },
  { value: 'app_allowlist', label: 'App Allowlist' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'data_import_mapping', label: 'Data Import Mapping' },
];

export function templateTypeLabel(value: string): string {
  return TEMPLATE_TYPES.find((t) => t.value === value)?.label ?? value;
}
