import { StatusTone } from '../../../shared/ui/status-badge/status-badge';
import { AdminActionLogEntry, AdminActionOutcomeFilter } from './admin-action-log.model';

export interface AdminActionAreaOption {
  value: string;
  label: string;
}

/** Target types the backend writes (AuditEntry.TargetType). Unknown types still render, humanized. */
export const ADMIN_ACTION_AREA_OPTIONS: AdminActionAreaOption[] = [
  { value: '', label: 'All Areas' },
  { value: 'tenant', label: 'Tenant' },
  { value: 'tenant_user', label: 'Tenant User' },
  { value: 'tenant_role', label: 'Tenant Role' },
  { value: 'tenant_session', label: 'Tenant Session' },
  { value: 'tenant_integration_credential', label: 'Tenant Integration' },
  { value: 'platform_user', label: 'Platform User' },
  { value: 'platform_role', label: 'Platform Role' },
  { value: 'role_template', label: 'Role Template' },
  { value: 'configuration_template', label: 'Configuration Template' },
  { value: 'subscription_plan', label: 'Subscription Plan' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'payment_gateway', label: 'Payment Gateway' },
  { value: 'oauth_app', label: 'OAuth App' },
  { value: 'service_key', label: 'Service Key' },
  { value: 'integration', label: 'Integration Catalog' },
  { value: 'notification_template', label: 'Notification Template' },
  { value: 'legal_document_version', label: 'Legal Document' },
  { value: 'tray_release', label: 'Tray Release' },
  { value: 'global_application', label: 'App Catalog' },
  { value: 'support_ticket', label: 'Support Ticket' },
  { value: 'announcement', label: 'Announcement' },
];

export const ADMIN_ACTION_OUTCOME_OPTIONS: { value: AdminActionOutcomeFilter; label: string }[] = [
  { value: '', label: 'All Outcomes' },
  { value: 'succeeded', label: 'Succeeded' },
  { value: 'failed', label: 'Failed' },
];

function humanize(code: string): string {
  const words = code.replace(/[._]+/g, ' ').trim();
  return words.length === 0 ? code : words.charAt(0).toUpperCase() + words.slice(1);
}

export function adminActionAreaLabel(targetType: string): string {
  return (
    ADMIN_ACTION_AREA_OPTIONS.find((option) => option.value !== '' && option.value === targetType)?.label ??
    humanize(targetType)
  );
}

/** "platform_role.permissions_updated" becomes "Permissions updated". */
export function adminActionVerbLabel(action: string): string {
  const dot = action.indexOf('.');
  return humanize(dot >= 0 ? action.slice(dot + 1) : action);
}

export function adminActionOutcomeTone(entry: AdminActionLogEntry): StatusTone {
  return entry.outcome === 'failed' ? 'danger' : 'success';
}

export function adminActionOutcomeLabel(entry: AdminActionLogEntry): string {
  return entry.outcome === 'failed' ? 'Failed' : 'Succeeded';
}

export function adminActionActorPrimary(entry: AdminActionLogEntry): string {
  return entry.actorName?.trim() || entry.actorEmail?.trim() || entry.actorPlatformUserId || 'System';
}

export function adminActionActorSecondary(entry: AdminActionLogEntry): string | null {
  const name = entry.actorName?.trim();
  const email = entry.actorEmail?.trim();
  return name && email ? email : null;
}

/** Pretty-prints a recorded before/after value for the details panel. */
export function formatAuditState(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}
