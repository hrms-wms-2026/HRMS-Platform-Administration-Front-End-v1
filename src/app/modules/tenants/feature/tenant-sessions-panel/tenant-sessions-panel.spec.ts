import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TenantSessionsPanel } from './tenant-sessions-panel';
import { TenantAdminService } from '../../data/tenant-admin.service';
import { NotificationService } from '../../../../core/services/notification.service';

describe('TenantSessionsPanel', () => {
  let tenantAdminService: { listSessions: jest.Mock; revokeSession: jest.Mock };
  let notificationService: { success: jest.Mock; error: jest.Mock };

  const session = {
    id: 'session-1',
    userId: 'user-1',
    userEmail: 'jane@acme.test',
    userFullName: 'Jane Doe',
    ipAddress: '10.0.0.1',
    userAgent: 'Chrome/Windows',
    startedAt: '2026-08-17T09:00:00Z',
    lastActivityAt: '2026-08-17T11:00:00Z',
    expiresAt: '2026-08-17T18:00:00Z',
  };

  function setup(canManage = false) {
    tenantAdminService = { listSessions: jest.fn(), revokeSession: jest.fn() };
    notificationService = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [TenantSessionsPanel],
      providers: [
        { provide: TenantAdminService, useValue: tenantAdminService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TenantSessionsPanel);
    fixture.componentRef.setInput('tenantId', 'tenant-1');
    fixture.componentRef.setInput('canManage', canManage);
    return fixture;
  }

  it('loads sessions on init', () => {
    const fixture = setup();
    tenantAdminService.listSessions.mockReturnValue(of([session]));
    fixture.detectChanges();

    expect(tenantAdminService.listSessions).toHaveBeenCalledWith('tenant-1');
    expect(fixture.nativeElement.textContent).toContain('Jane Doe');
  });

  it('shows an empty state when there are no active sessions', () => {
    const fixture = setup();
    tenantAdminService.listSessions.mockReturnValue(of([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No active sessions');
  });

  it('hides the Revoke button without manage permission', () => {
    const fixture = setup(false);
    tenantAdminService.listSessions.mockReturnValue(of([session]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Revoke');
  });

  it('revokes a session after confirming and removes it from the list', () => {
    const fixture = setup(true);
    tenantAdminService.listSessions.mockReturnValue(of([session]));
    fixture.detectChanges();
    tenantAdminService.revokeSession.mockReturnValue(of(undefined));

    const component = fixture.componentInstance;
    component['startRevoke'](session);
    component['confirmRevoke']();

    expect(tenantAdminService.revokeSession).toHaveBeenCalledWith('tenant-1', 'session-1');
    expect(notificationService.success).toHaveBeenCalledWith('Session revoked.');
    expect(component['sessions']()).toEqual([]);
  });
});
