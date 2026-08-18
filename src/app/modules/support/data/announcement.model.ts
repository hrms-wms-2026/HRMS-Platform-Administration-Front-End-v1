import { StatusTone } from '../../../shared/ui/status-badge/status-badge';

export type AnnouncementSeverity = 'info' | 'warning' | 'critical';

export type AnnouncementAudienceScope = 'platform_wide' | 'platform_admins' | 'tenant_users';
export type PlatformAdminScope = 'all' | 'selected_roles';
export type TenantScope = 'all_tenants' | 'selected_tenants';
export type RecipientScope = 'all_users' | 'selected_roles';

export interface TenantRoleTarget {
  tenantId: string;
  roleId: string;
}

export interface AnnouncementSummary {
  id: string;
  title: string;
  body: string;
  severity: AnnouncementSeverity;
  audienceScope: AnnouncementAudienceScope;
  platformAdminScope: PlatformAdminScope | null;
  platformRoleIds: string[];
  tenantScope: TenantScope | null;
  tenantIds: string[];
  recipientScope: RecipientScope | null;
  tenantRoleTargets: TenantRoleTarget[];
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface AnnouncementListResponse {
  items: AnnouncementSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateAnnouncementRequest {
  title: string;
  body: string;
  severity: AnnouncementSeverity;
  audienceScope: AnnouncementAudienceScope;
  platformAdminScope?: PlatformAdminScope;
  platformRoleIds?: string[];
  tenantScope?: TenantScope;
  tenantIds?: string[];
  recipientScope?: RecipientScope;
  tenantRoleTargets?: TenantRoleTarget[];
}

export const ANNOUNCEMENT_SEVERITY_OPTIONS: { value: AnnouncementSeverity; label: string }[] = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'critical', label: 'Critical' },
];

export const AUDIENCE_SCOPE_OPTIONS: { value: AnnouncementAudienceScope; label: string; hint: string }[] = [
  { value: 'platform_wide', label: 'Platform-wide', hint: 'Every platform admin and every tenant user.' },
  { value: 'platform_admins', label: 'Platform Admins', hint: 'Only staff who manage the platform.' },
  { value: 'tenant_users', label: 'Tenant Users', hint: 'Only users belonging to customer tenants.' },
];

export function announcementAudienceLabel(a: AnnouncementSummary): string {
  switch (a.audienceScope) {
    case 'platform_wide':
      return 'Platform-wide';
    case 'platform_admins':
      return a.platformAdminScope === 'selected_roles'
        ? `Platform Admins (${a.platformRoleIds.length} role${a.platformRoleIds.length === 1 ? '' : 's'})`
        : 'All Platform Admins';
    case 'tenant_users': {
      const tenantPart = a.tenantScope === 'selected_tenants' ? `${a.tenantIds.length} tenant(s)` : 'All Tenants';
      const recipientPart =
        a.recipientScope === 'selected_roles'
          ? `${a.tenantRoleTargets.length} role target(s)`
          : 'All Users';
      return `Tenant Users — ${tenantPart}, ${recipientPart}`;
    }
    default:
      return a.audienceScope;
  }
}

export function announcementSeverityTone(severity: AnnouncementSeverity | string): StatusTone {
  switch (severity) {
    case 'critical':
      return 'danger';
    case 'warning':
      return 'warning';
    case 'info':
    default:
      return 'indigo';
  }
}

export function announcementPublishedTone(isPublished: boolean): StatusTone {
  return isPublished ? 'success' : 'neutral';
}
