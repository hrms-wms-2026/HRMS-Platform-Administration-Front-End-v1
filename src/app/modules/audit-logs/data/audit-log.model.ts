export interface AuditLogEntry {
  id: string;
  userId: string | null;
  userEmail: string | null;
  userFullName: string | null;
  eventType: string;
  sourceIp: string | null;
  userAgent: string | null;
  createdAt: string;
}
