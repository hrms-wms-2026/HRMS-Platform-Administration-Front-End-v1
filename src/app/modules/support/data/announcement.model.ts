import { StatusTone } from '../../../shared/ui/status-badge/status-badge';

export type AnnouncementSeverity = 'info' | 'warning' | 'critical';
export type AnnouncementAudience = 'all' | 'tenants' | 'platform_admins';

export interface AnnouncementSummary {
  id: string;
  title: string;
  body: string;
  severity: AnnouncementSeverity;
  audience: AnnouncementAudience;
  startsAt: string | null;
  endsAt: string | null;
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

/** Used for create and for edit (a full replacement). startsAt / endsAt are ISO timestamps or null. */
export interface AnnouncementRequest {
  title: string;
  body: string;
  severity: AnnouncementSeverity;
  audience: AnnouncementAudience;
  startsAt: string | null;
  endsAt: string | null;
}

export type AnnouncementWindowState = 'scheduled' | 'live' | 'ended' | 'always';

/** Where a published announcement sits in its display window at the given moment. */
export function announcementWindowState(
  announcement: Pick<AnnouncementSummary, 'startsAt' | 'endsAt'>,
  now: Date = new Date(),
): AnnouncementWindowState {
  const startsAt = announcement.startsAt ? new Date(announcement.startsAt) : null;
  const endsAt = announcement.endsAt ? new Date(announcement.endsAt) : null;
  if (!startsAt && !endsAt) {
    return 'always';
  }
  if (startsAt && now < startsAt) {
    return 'scheduled';
  }
  if (endsAt && now >= endsAt) {
    return 'ended';
  }
  return 'live';
}

/** Converts an ISO timestamp to the value a datetime-local input expects, in the browser's time zone. */
export function toDateTimeLocal(iso: string | null): string {
  if (!iso) {
    return '';
  }
  const date = new Date(iso);
  const pad = (value: number) => value.toString().padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** Converts a datetime-local input value (browser time zone) to an ISO timestamp, or null when empty. */
export function fromDateTimeLocal(value: string): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
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
