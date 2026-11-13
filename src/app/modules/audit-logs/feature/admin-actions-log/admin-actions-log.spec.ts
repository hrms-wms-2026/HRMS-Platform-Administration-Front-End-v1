import { TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';
import { AdminActionsLog } from './admin-actions-log';
import { AuditLogsService } from '../../data/audit-logs.service';
import { AdminActionLogEntry, AdminActionLogPage } from '../../data/admin-action-log.model';

describe('AdminActionsLog', () => {
  let service: { listAdminActions: jest.Mock };

  const rotated: AdminActionLogEntry = {
    id: 'a1',
    createdAt: '2026-11-05T10:00:00Z',
    actorPlatformUserId: 'u1',
    actorEmail: 'admin@example.com',
    actorName: 'Platform Admin',
    action: 'oauth_app.secret_rotated',
    targetType: 'oauth_app',
    targetId: 'github',
    targetTenantId: null,
    outcome: 'succeeded',
    failureReason: null,
    before: null,
    after: { clientSecretRotated: true },
    ipAddress: '203.0.113.7',
    userAgent: 'Mozilla/5.0 Chrome',
    correlationId: 'corr-1',
  };

  const failedRoleChange: AdminActionLogEntry = {
    ...rotated,
    id: 'a2',
    action: 'platform_role.permissions_updated',
    targetType: 'platform_role',
    targetId: 'role-1',
    outcome: 'failed',
    failureReason: 'ArgumentException',
    before: { permissions: ['platform.tenants.read'] },
    after: { permissions: ['platform.tenants.manage'] },
  };

  function page(items: AdminActionLogEntry[], totalCount = items.length): AdminActionLogPage {
    return { items, totalCount, page: 1, pageSize: 25 };
  }

  function setup() {
    service = { listAdminActions: jest.fn() };
    TestBed.configureTestingModule({
      imports: [AdminActionsLog],
      providers: [{ provide: AuditLogsService, useValue: service }],
    }).compileComponents();
    return TestBed.createComponent(AdminActionsLog);
  }

  function select(fixture: ReturnType<typeof setup>, id: string, value: string) {
    const element = fixture.nativeElement.querySelector(`#${id}`) as HTMLSelectElement;
    element.value = value;
    element.dispatchEvent(new Event('change'));
  }

  function clickButton(fixture: ReturnType<typeof setup>, label: string) {
    const button = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(
      (b) => b.textContent?.trim() === label,
    );
    expect(button).toBeTruthy();
    button!.click();
    fixture.detectChanges();
  }

  it('loads the first page on init and shows a skeleton while loading', () => {
    const fixture = setup();
    service.listAdminActions.mockReturnValue(NEVER);
    fixture.detectChanges();

    expect(service.listAdminActions).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 25, outcome: '', from: null, to: null }),
    );
    expect(fixture.nativeElement.querySelector('[aria-label="Loading content"]')).toBeTruthy();
  });

  it('renders who did what to which target, with the outcome', () => {
    const fixture = setup();
    service.listAdminActions.mockReturnValue(of(page([rotated, failedRoleChange])));
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('2 actions');
    expect(text).toContain('Platform Admin');
    expect(text).toContain('admin@example.com');
    expect(text).toContain('Secret rotated');
    expect(text).toContain('OAuth App');
    expect(text).toContain('github');
    expect(text).toContain('Permissions updated');
    expect(text).toContain('Succeeded');
    expect(text).toContain('Failed');
  });

  it('shows the recorded before and after values when a row is expanded', () => {
    const fixture = setup();
    service.listAdminActions.mockReturnValue(of(page([failedRoleChange])));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('platform.tenants.manage');
    clickButton(fixture, 'Details');

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('platform.tenants.read');
    expect(text).toContain('platform.tenants.manage');
    expect(text).toContain('ArgumentException');
    expect(text).toContain('corr-1');

    clickButton(fixture, 'Hide');
    expect(fixture.nativeElement.textContent).not.toContain('platform.tenants.manage');
  });

  it('sends the chosen filters to the server and restarts at page 1', () => {
    const fixture = setup();
    service.listAdminActions.mockReturnValue(of(page([rotated], 60)));
    fixture.detectChanges();

    select(fixture, 'adminActionArea', 'platform_role');
    select(fixture, 'adminActionOutcome', 'failed');
    select(fixture, 'adminActionDateRange', '7d');
    clickButton(fixture, 'Apply');

    const query = service.listAdminActions.mock.calls.at(-1)![0];
    expect(query).toEqual(
      expect.objectContaining({ page: 1, targetType: 'platform_role', outcome: 'failed' }),
    );
    expect(query.from).toBeInstanceOf(Date);
    expect(query.to).toBeInstanceOf(Date);

    clickButton(fixture, 'Reset');
    expect(service.listAdminActions.mock.calls.at(-1)![0]).toEqual(
      expect.objectContaining({ page: 1, targetType: undefined, outcome: '', from: null, to: null }),
    );
  });

  it('shows the empty state when nothing has been recorded', () => {
    const fixture = setup();
    service.listAdminActions.mockReturnValue(of(page([])));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No admin actions recorded yet');
  });

  it('shows an error banner and retries', () => {
    const fixture = setup();
    service.listAdminActions.mockReturnValue(throwError(() => new Error('boom')));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Something went wrong. Please try again.');

    service.listAdminActions.mockReturnValue(of(page([rotated])));
    clickButton(fixture, 'Retry');
    expect(fixture.nativeElement.textContent).toContain('Secret rotated');
  });
});
