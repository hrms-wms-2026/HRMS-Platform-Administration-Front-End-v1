export interface AuditLogEntry {
  id: string;
  userId: string | null;
  eventType: string;
  sourceIp: string | null;
  userAgent: string | null;
  createdAt: string;
}
