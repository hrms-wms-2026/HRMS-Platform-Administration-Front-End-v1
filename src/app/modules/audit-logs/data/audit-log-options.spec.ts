import {
  auditLogEventLabel,
  auditLogEventTone,
  auditLogUserPrimary,
  auditLogUserSecondary,
  isQuickChipActive,
  resolveAuditDateRange,
} from './audit-log-options';
import { AuditLogEntry } from './audit-log.model';

describe('audit-log-options', () => {
  it('maps known event types to readable labels', () => {
    expect(auditLogEventLabel('login_succeeded')).toBe('Login Succeeded');
    expect(auditLogEventLabel('login_failed')).toBe('Login Failed');
  });

  it('falls back to the raw event type for unknown values', () => {
    expect(auditLogEventLabel('custom_event')).toBe('custom_event');
  });

  it('assigns tones based on event semantics', () => {
    expect(auditLogEventTone('login_succeeded')).toBe('success');
    expect(auditLogEventTone('login_failed')).toBe('danger');
    expect(auditLogEventTone('session_revoked')).toBe('warning');
    expect(auditLogEventTone('platform_manager_invited')).toBe('indigo');
  });

  it('prefers full name over email for user display', () => {
    const event: AuditLogEntry = {
      id: '1',
      userId: 'user-1',
      userEmail: 'admin@example.com',
      userFullName: 'Platform Admin',
      eventType: 'login_succeeded',
      sourceIp: null,
      userAgent: null,
      createdAt: '2026-01-01T00:00:00Z',
    };

    expect(auditLogUserPrimary(event)).toBe('Platform Admin');
    expect(auditLogUserSecondary(event)).toBe('admin@example.com');
  });

  it('falls back to email or user id when name is missing', () => {
    expect(
      auditLogUserPrimary({
        id: '1',
        userId: 'user-1',
        userEmail: 'admin@example.com',
        userFullName: null,
        eventType: 'login_succeeded',
        sourceIp: null,
        userAgent: null,
        createdAt: '2026-01-01T00:00:00Z',
      }),
    ).toBe('admin@example.com');

    expect(
      auditLogUserPrimary({
        id: '1',
        userId: 'user-1',
        userEmail: null,
        userFullName: null,
        eventType: 'login_succeeded',
        sourceIp: null,
        userAgent: null,
        createdAt: '2026-01-01T00:00:00Z',
      }),
    ).toBe('user-1');
  });

  it('resolves relative date ranges from the current time', () => {
    const now = new Date('2026-08-12T12:00:00Z');
    jest.useFakeTimers().setSystemTime(now);

    const lastDay = resolveAuditDateRange('24h');
    expect(lastDay.from?.toISOString()).toBe('2026-08-11T12:00:00.000Z');
    expect(lastDay.to?.toISOString()).toBe(now.toISOString());

    jest.useRealTimers();
  });

  it('marks quick chips active only when both filters match', () => {
    const chip = {
      id: 'login',
      label: 'Login',
      eventType: 'login_succeeded',
      dateRange: '' as const,
    };

    expect(isQuickChipActive(chip, 'login_succeeded', '')).toBe(true);
    expect(isQuickChipActive(chip, 'login_failed', '')).toBe(false);
  });
});
