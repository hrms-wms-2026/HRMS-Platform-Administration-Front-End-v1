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
  sendEmail: boolean;
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
  sendEmail?: boolean;
}

export const ANNOUNCEMENT_TITLE_MAX_LENGTH = 150;
export const ANNOUNCEMENT_BODY_MAX_LENGTH = 5000;

/** Strips HTML tags and decodes the handful of entities the rich text editor can produce,
 * matching the backend's AnnouncementHtmlValidator.ExtractPlainText - used for the live
 * character counter so it reflects what the 5000-char limit is actually measured against. */
export function extractPlainText(html: string): string {
  const withoutTags = html.replace(/<[^>]*>/g, ' ');
  const decoded = withoutTags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return decoded.replace(/\s+/g, ' ').trim();
}

export const ANNOUNCEMENT_SEVERITY_OPTIONS: { value: AnnouncementSeverity; label: string }[] = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'critical', label: 'Critical' },
];

// TODO: The original mockup also had a "By User Group" targeting mode - explicitly skipped per
// user decision, since no "user group" concept exists anywhere in the codebase yet (would need a
// new domain entity + backend targeting support before a frontend option here means anything).
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
