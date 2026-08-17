import { StatusTone } from '../../../shared/ui/status-badge/status-badge';

export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type SupportTicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface SupportTicketSummary {
  id: string;
  tenantId: string | null;
  subject: string;
  description: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  category: string | null;
  createdByPlatformUserId: string | null;
  assignedToPlatformUserId: string | null;
  createdAt: string;
  updatedAt: string | null;
  resolvedAt: string | null;
}

export interface SupportTicketComment {
  id: string;
  ticketId: string;
  authorPlatformUserId: string | null;
  body: string;
  isInternal: boolean;
  createdAt: string;
}

export interface SupportTicketDetail {
  ticket: SupportTicketSummary;
  comments: SupportTicketComment[];
}

export interface SupportTicketListResponse {
  items: SupportTicketSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateSupportTicketRequest {
  tenantId: string | null;
  subject: string;
  description: string;
  priority: SupportTicketPriority;
  category: string | null;
}

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
