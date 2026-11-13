import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import { AuditLogEntry } from './audit-log.model';
import { AdminActionLogEntry, AdminActionLogPage, AdminActionLogQuery } from './admin-action-log.model';

/** Wire shape of GET /admin/v1/audit-logs. Mapped to AdminActionLogEntry here and nowhere else. */
interface AdminActionLogWireEntry {
  id: string;
  createdAt: string;
  actorPlatformUserId: string | null;
  actorEmail: string | null;
  actorName: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  targetTenantId: string | null;
  outcome: string;
  failureReason: string | null;
  beforeJson: string | null;
  afterJson: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string | null;
}

interface AdminActionLogWirePage {
  items: AdminActionLogWireEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
}

function parseState(json: string | null): unknown {
  if (json === null || json === undefined || json === '') {
    return null;
  }
  try {
    return JSON.parse(json);
  } catch {
    return json;
  }
}

function toAdminActionLogEntry(wire: AdminActionLogWireEntry): AdminActionLogEntry {
  return {
    id: wire.id,
    createdAt: wire.createdAt,
    actorPlatformUserId: wire.actorPlatformUserId,
    actorEmail: wire.actorEmail,
    actorName: wire.actorName,
    action: wire.action,
    targetType: wire.targetType,
    targetId: wire.targetId,
    targetTenantId: wire.targetTenantId,
    outcome: wire.outcome === 'failed' ? 'failed' : 'succeeded',
    failureReason: wire.failureReason,
    before: parseState(wire.beforeJson),
    after: parseState(wire.afterJson),
    ipAddress: wire.ipAddress,
    userAgent: wire.userAgent,
    correlationId: wire.correlationId,
  };
}

@Injectable({ providedIn: 'root' })
export class AuditLogsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  list(): Observable<AuditLogEntry[]> {
    return this.http.get<AuditLogEntry[]>(`${this.baseUrl}${API_ENDPOINTS.auditLogs.list}`, {
      withCredentials: true,
    });
  }

  /** Privileged admin actions (platform_audit_logs), paged and filtered on the server. */
  listAdminActions(query: AdminActionLogQuery): Observable<AdminActionLogPage> {
    let params = new HttpParams().set('page', query.page).set('page_size', query.pageSize);
    if (query.targetType) {
      params = params.set('target_type', query.targetType);
    }
    if (query.outcome) {
      params = params.set('outcome', query.outcome);
    }
    if (query.tenantId) {
      params = params.set('tenant_id', query.tenantId);
    }
    if (query.from) {
      params = params.set('from', query.from.toISOString());
    }
    if (query.to) {
      params = params.set('to', query.to.toISOString());
    }

    return this.http
      .get<AdminActionLogWirePage>(`${this.baseUrl}${API_ENDPOINTS.auditLogs.adminActions}`, {
        params,
        withCredentials: true,
      })
      .pipe(
        map((page) => ({
          items: page.items.map(toAdminActionLogEntry),
          totalCount: page.totalCount,
          page: page.page,
          pageSize: page.pageSize,
        })),
      );
  }
}
