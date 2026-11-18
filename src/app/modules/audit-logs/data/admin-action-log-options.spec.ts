import {
  ADMIN_ACTION_AREA_OPTIONS,
  adminActionActorPrimary,
  adminActionActorSecondary,
  adminActionAreaLabel,
  adminActionOutcomeTone,
  adminActionVerbLabel,
  formatAuditState,
} from './admin-action-log-options';
import { AdminActionLogEntry } from './admin-action-log.model';

function entry(overrides: Partial<AdminActionLogEntry> = {}): AdminActionLogEntry {
  return {
    id: 'a1',
    createdAt: '2026-11-05T10:00:00Z',
    actorPlatformUserId: 'u1',
    actorEmail: 'admin@example.com',
    actorName: 'Platform Admin',
    action: 'tenant.created',
    targetType: 'tenant',
    targetId: 't1',
    targetTenantId: 't1',
    outcome: 'succeeded',
    failureReason: null,
    before: null,
    after: null,
    ipAddress: null,
    userAgent: null,
    correlationId: null,
    ...overrides,
  };
}

describe('admin action log options', () => {
  it('labels known areas and humanizes unknown ones', () => {
    expect(adminActionAreaLabel('oauth_app')).toBe('OAuth App');
    expect(adminActionAreaLabel('billing_export')).toBe('Billing export');
  });

  it('offers the support and announcement areas the backend audits', () => {
    const areas = ADMIN_ACTION_AREA_OPTIONS.map((o) => o.value);
    expect(areas).toContain('support_ticket');
    expect(areas).toContain('announcement');
    expect(adminActionAreaLabel('support_ticket')).toBe('Support Ticket');
    expect(adminActionAreaLabel('announcement')).toBe('Announcement');
  });

  it('labels the verb part of an action code', () => {
    expect(adminActionVerbLabel('platform_role.permissions_updated')).toBe('Permissions updated');
    expect(adminActionVerbLabel('oauth_app.secret_rotated')).toBe('Secret rotated');
    expect(adminActionVerbLabel('custom')).toBe('Custom');
  });

  it('marks failed actions as danger and successful ones as success', () => {
    expect(adminActionOutcomeTone(entry({ outcome: 'failed' }))).toBe('danger');
    expect(adminActionOutcomeTone(entry())).toBe('success');
  });

  it('shows the actor name, then email, then id, then System', () => {
    expect(adminActionActorPrimary(entry())).toBe('Platform Admin');
    expect(adminActionActorSecondary(entry())).toBe('admin@example.com');
    expect(adminActionActorPrimary(entry({ actorName: null }))).toBe('admin@example.com');
    expect(adminActionActorSecondary(entry({ actorName: null }))).toBeNull();
    expect(adminActionActorPrimary(entry({ actorName: null, actorEmail: null }))).toBe('u1');
    expect(
      adminActionActorPrimary(entry({ actorName: null, actorEmail: null, actorPlatformUserId: null })),
    ).toBe('System');
  });

  it('pretty-prints recorded state and returns null when nothing was recorded', () => {
    expect(formatAuditState(null)).toBeNull();
    expect(formatAuditState(undefined)).toBeNull();
    expect(formatAuditState({ permissions: ['a'] })).toBe('{\n  "permissions": [\n    "a"\n  ]\n}');
    expect(formatAuditState('raw')).toBe('raw');
  });
});
