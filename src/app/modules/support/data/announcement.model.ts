import { StatusTone } from '../../../shared/ui/status-badge/status-badge';

export type AnnouncementSeverity = 'info' | 'warning' | 'critical';
export type AnnouncementAudience = 'all' | 'tenants' | 'platform_admins';

export interface AnnouncementSummary {
  id: string;
  title: string;
  body: string;
  severity: AnnouncementSeverity;
  audience: AnnouncementAudience;
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
  audience: AnnouncementAudience;
}

export const ANNOUNCEMENT_SEVERITY_OPTIONS: { value: AnnouncementSeverity; label: string }[] = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'critical', label: 'Critical' },
];

export const ANNOUNCEMENT_AUDIENCE_OPTIONS: { value: AnnouncementAudience; label: string }[] = [
  { value: 'all', label: 'Everyone' },
  { value: 'tenants', label: 'Tenants only' },
  { value: 'platform_admins', label: 'Platform admins only' },
];

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
