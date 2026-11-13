import { StatusTone } from '../../../shared/ui/status-badge/status-badge';

export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type SupportTicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface SupportTicketSummary {
  id: string;
  /** Every ticket belongs to exactly one tenant. */
  tenantId: string;
  tenantName: string;
  subject: string;
  description: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  category: string | null;
  createdByPlatformUserId: string | null;
  /** Set when a tenant user raised the ticket from the tenant app. */
  createdByUserId: string | null;
  createdByName: string;
  assignedToPlatformUserId: string | null;
  assignedToName: string | null;
  /** True while the ticket waits on the support team (a tenant raised it or replied last). */
  awaitingSupport: boolean;
  createdAt: string;
  updatedAt: string | null;
  resolvedAt: string | null;
}

export interface SupportTicketComment {
  id: string;
  ticketId: string;
  authorPlatformUserId: string | null;
  authorUserId: string | null;
  authorName: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
}

export interface SupportTicketAttachment {
  id: string;
  ticketId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  isInternal: boolean;
  uploadedByPlatformUserId: string | null;
  uploadedByUserId: string | null;
  uploadedByName: string;
  createdAt: string;
}

export interface SupportTicketDetail {
  ticket: SupportTicketSummary;
  comments: SupportTicketComment[];
  attachments: SupportTicketAttachment[];
}

export interface SupportTicketListResponse {
  items: SupportTicketSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateSupportTicketRequest {
  tenantId: string;
  subject: string;
  description: string;
  priority: SupportTicketPriority;
  category: string | null;
}

/** Edits the ticket's own fields. Status and assignee have their own actions. */
export interface UpdateSupportTicketRequest {
  subject: string;
  description: string;
  priority: SupportTicketPriority;
  category: string | null;
}

/** Counts behind the support bell in the top bar. */
export interface SupportSummary {
  awaitingSupport: number;
  awaitingSupportAssignedToMe: number;
  openUnassigned: number;
}

export interface SupportAssignee {
  id: string;
  fullName: string;
  email: string;
}

export interface AttachmentDownload {
  url: string;
  expiresAt: string;
}

/** Matches the backend upload purpose support_ticket_attachment. */
export const SUPPORT_ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;
export const SUPPORT_ATTACHMENT_ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.xls,.xlsx,.zip';
export const SUPPORT_ASSIGNEE_UNASSIGNED = 'unassigned';

export const SUPPORT_TICKET_STATUS_OPTIONS: { value: SupportTicketStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export const SUPPORT_TICKET_PRIORITY_OPTIONS: { value: SupportTicketPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export function supportTicketStatusTone(status: SupportTicketStatus | string): StatusTone {
  switch (status) {
    case 'open':
      return 'indigo';
    case 'in_progress':
      return 'warning';
    case 'resolved':
      return 'success';
    case 'closed':
    default:
      return 'neutral';
  }
}

export function supportTicketPriorityTone(priority: SupportTicketPriority | string): StatusTone {
  switch (priority) {
    case 'urgent':
      return 'danger';
    case 'high':
      return 'warning';
    case 'medium':
      return 'indigo';
    case 'low':
    default:
      return 'neutral';
  }
}

export function shortTicketId(id: string): string {
  return id.slice(0, 8);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
