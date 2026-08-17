import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuditLogsList } from './audit-logs-list';
import { AuditLogsService } from '../../data/audit-logs.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';

describe('AuditLogsList', () => {
  let auditLogsService: { list: jest.Mock };

  function setup(permissions: string[] = ['platform.audit.read']) {
    auditLogsService = { list: jest.fn() };

    TestBed.configureTestingModule({
      imports: [AuditLogsList],
      providers: [{ provide: AuditLogsService, useValue: auditLogsService }],
    }).compileComponents();

    const fixture = TestBed.createComponent(AuditLogsList);
    const store = TestBed.inject(PermissionStore);
    store.setAuthorizationContext({
      userId: 'u1',
      email: 'admin@example.com',
      platformRole: 'Platform Super Admin',
      expiresAt: '',
      mfaRequired: false,
      permissions,
      scopes: {},
      entitlements: [],
    });
    return fixture;
  }

  it('does not call the API and shows the no-permission message when unauthorized', () => {
    const fixture = setup([]);
    fixture.detectChanges();

    expect(auditLogsService.list).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('No permission to view page');
  });

  it('loads and displays events on init when authorized', () => {
    const fixture = setup();
    auditLogsService.list.mockReturnValue(
      of([
        {
          id: 'event-1',
          userId: 'user-1',
          eventType: 'login_succeeded',
          sourceIp: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          createdAt: '2026-01-01T00:00:00Z',
        },
      ]),
    );
    fixture.detectChanges();

    expect(auditLogsService.list).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('login_succeeded');
  });

  it('renders an em dash for null fields', () => {
    const fixture = setup();
    auditLogsService.list.mockReturnValue(
      of([
        {
          id: 'event-1',
          userId: null,
          eventType: 'login_failed',
          sourceIp: null,
          userAgent: null,
          createdAt: '2026-01-01T00:00:00Z',
        },
      ]),
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('—');
  });

  it('shows the empty state when there are no events', () => {
    const fixture = setup();
    auditLogsService.list.mockReturnValue(of([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No audit log events yet');
  });
});
