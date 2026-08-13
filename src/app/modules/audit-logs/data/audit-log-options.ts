import { StatusTone } from '../../../shared/ui/status-badge/status-badge';
import { AuditLogEntry } from './audit-log.model';

export interface AuditLogEventTypeOption {
  value: string;
  label: string;
}

export const AUDIT_LOG_EVENT_TYPE_OPTIONS: AuditLogEventTypeOption[] = [
  { value: '', label: 'All Events' },
  { value: 'login_succeeded', label: 'Login Succeeded' },
  { value: 'login_failed', label: 'Login Failed' },
  { value: 'logout_succeeded', label: 'Logout Succeeded' },
  { value: 'session_revoked', label: 'Session Revoked' },
  { value: 'admin_password_reset_requested', label: 'Password Reset Requested' },
  { value: 'admin_password_reset_completed', label: 'Password Reset Completed' },
  { value: 'platform_manager_invited', label: 'Manager Invited' },
  { value: 'platform_manager_invite_accepted', label: 'Invite Accepted' },
];

export type AuditDateRange = '' | '24h' | '7d' | '30d';

export interface AuditDateRangeOption {
  value: AuditDateRange;
  label: string;
}

export const AUDIT_LOG_DATE_RANGE_OPTIONS: AuditDateRangeOption[] = [
  { value: '', label: 'All Time' },
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
];

export interface AuditQuickChip {
  id: string;
  label: string;
  eventType: string;
  dateRange: AuditDateRange;
}

export const AUDIT_LOG_QUICK_CHIPS: AuditQuickChip[] = [
  { id: 'all', label: 'All Events', eventType: '', dateRange: '' },
  { id: 'login', label: 'Login', eventType: 'login_succeeded', dateRange: '' },
  { id: 'failed-login', label: 'Failed Login', eventType: 'login_failed', dateRange: '' },
  { id: 'last-24h', label: 'Last 24h', eventType: '', dateRange: '24h' },
  { id: 'last-7d', label: 'Last 7 Days', eventType: '', dateRange: '7d' },
];

export interface ActiveAuditFilterChip {
  id: string;
  label: string;
}

export function auditLogDateRangeLabel(range: AuditDateRange): string {
  return AUDIT_LOG_DATE_RANGE_OPTIONS.find((option) => option.value === range)?.label ?? 'All Time';
}

export function resolveAuditDateRange(range: AuditDateRange): { from: Date | null; to: Date | null } {
  if (!range) {
    return { from: null, to: null };
  }

  const to = new Date();
  const from = new Date(to);

  if (range === '24h') {
    from.setHours(from.getHours() - 24);
  } else if (range === '7d') {
    from.setDate(from.getDate() - 7);
  } else if (range === '30d') {
    from.setDate(from.getDate() - 30);
  }

  return { from, to };
}

export function isQuickChipActive(
  chip: AuditQuickChip,
  eventType: string,
  dateRange: AuditDateRange,
): boolean {
  return chip.eventType === eventType && chip.dateRange === dateRange;
}

export function auditLogEventLabel(eventType: string): string {
  return AUDIT_LOG_EVENT_TYPE_OPTIONS.find((option) => option.value === eventType)?.label ?? eventType;
}

export function auditLogEventTone(eventType: string): StatusTone {
  if (eventType.endsWith('_failed')) {
    return 'danger';
  }
  if (eventType.includes('revoked')) {
    return 'warning';
  }
  if (
    eventType.endsWith('_succeeded') ||
    eventType.endsWith('_accepted') ||
    eventType.endsWith('_completed')
  ) {
    return 'success';
  }
  if (eventType.includes('invited') || eventType.includes('requested')) {
    return 'indigo';
  }
  return 'neutral';
}

export function auditLogUserPrimary(event: AuditLogEntry): string {
  const name = event.userFullName?.trim();
  const email = event.userEmail?.trim();

  if (name) {
    return name;
  }
  if (email) {
    return email;
  }
  if (event.userId) {
    return event.userId;
  }

  return '—';
}

export function auditLogUserSecondary(event: AuditLogEntry): string | null {
  const name = event.userFullName?.trim();
  const email = event.userEmail?.trim();

  if (name && email) {
    return email;
  }

  return null;
}
