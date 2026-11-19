/** One privileged admin action from GET /admin/v1/audit-logs (platform_audit_logs). */
export interface AdminActionLogEntry {
  id: string;
  createdAt: string;
  actorPlatformUserId: string | null;
  actorEmail: string | null;
  actorName: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  targetTenantId: string | null;
  outcome: 'succeeded' | 'failed';
  failureReason: string | null;
  /** Explicit, secret-free projection written by the backend; null when not recorded. */
  before: unknown;
  after: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string | null;
}

export interface AdminActionLogPage {
  items: AdminActionLogEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export type AdminActionOutcomeFilter = '' | 'succeeded' | 'failed';

export interface AdminActionLogQuery {
  page: number;
  pageSize: number;
  targetType?: string;
  outcome?: AdminActionOutcomeFilter;
  tenantId?: string;
  from?: Date | null;
  to?: Date | null;
}
