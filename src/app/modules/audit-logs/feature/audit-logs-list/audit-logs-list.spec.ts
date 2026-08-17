import { TestBed } from '@angular/core/testing';
import { NEVER, of } from 'rxjs';
import { AuditLogsList } from './audit-logs-list';
import { AuditLogsService } from '../../data/audit-logs.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';

describe('AuditLogsList', () => {
  let auditLogsService: { list: jest.Mock };

  const sampleEvents = [
    {
      id: 'event-1',
      userId: 'user-1',
      userEmail: 'admin@example.com',
      userFullName: 'Platform Admin',
      eventType: 'login_succeeded',
      sourceIp: '127.0.0.1',
      userAgent: 'Mozilla/5.0 Chrome',
      createdAt: '2026-08-12T10:00:00Z',
    },
    {
      id: 'event-2',
      userId: 'user-2',
      userEmail: 'other@example.com',
      userFullName: 'Other User',
      eventType: 'login_failed',
      sourceIp: '10.0.0.5',
      userAgent: 'curl/8.21.0',
      createdAt: '2026-08-11T10:00:00Z',
    },
  ];

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

  it('shows a table skeleton while loading', () => {
    const fixture = setup();
    auditLogsService.list.mockReturnValue(NEVER);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[aria-label="Loading content"]')).toBeTruthy();
  });

  it('loads and displays events on init when authorized', () => {
    const fixture = setup();
    auditLogsService.list.mockReturnValue(of([sampleEvents[0]]));
    fixture.detectChanges();

    expect(auditLogsService.list).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Login Succeeded');
  });

  it('renders an em dash for null fields', () => {
    const fixture = setup();
    auditLogsService.list.mockReturnValue(
      of([
        {
          id: 'event-1',
          userId: null,
          userEmail: null,
          userFullName: null,
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

  it('filters events by event type after apply', () => {
    const fixture = setup();
    auditLogsService.list.mockReturnValue(of(sampleEvents));
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      onEventTypeDraftChange: (value: string) => void;
      applyFilters: () => void;
    };
    component.onEventTypeDraftChange('login_failed');
    component.applyFilters();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Login Failed');
    expect(fixture.nativeElement.textContent).toContain('Other User');
    expect(fixture.nativeElement.textContent).not.toContain('Platform Admin');
    expect(fixture.nativeElement.textContent).toContain('Showing 1 result');
  });

  it('filters events by search text after apply', () => {
    const fixture = setup();
    auditLogsService.list.mockReturnValue(of(sampleEvents));
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      onSearchDraftChange: (value: string) => void;
      applyFilters: () => void;
    };
    component.onSearchDraftChange('curl');
    component.applyFilters();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('curl/8.21.0');
    expect(fixture.nativeElement.textContent).not.toContain('Mozilla/5.0 Chrome');
  });

  it('applies quick chips immediately', () => {
    const fixture = setup();
    auditLogsService.list.mockReturnValue(of(sampleEvents));
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      applyQuickChip: (chip: { id: string; label: string; eventType: string; dateRange: string }) => void;
    };
    component.applyQuickChip({
      id: 'failed-login',
      label: 'Failed Login',
      eventType: 'login_failed',
      dateRange: '',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Login Failed');
    expect(fixture.nativeElement.textContent).toContain('Showing 1 result');
  });

  it('shows a no-match empty state when filters exclude all events', () => {
    const fixture = setup();
    auditLogsService.list.mockReturnValue(of(sampleEvents));
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      onSearchDraftChange: (value: string) => void;
      applyFilters: () => void;
    };
    component.onSearchDraftChange('does-not-exist');
    component.applyFilters();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No events match your filters');
    expect(fixture.nativeElement.textContent).toContain('Showing 0 results');
  });
});
