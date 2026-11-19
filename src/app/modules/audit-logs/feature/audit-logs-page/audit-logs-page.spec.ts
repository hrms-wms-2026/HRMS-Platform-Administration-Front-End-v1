import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuditLogsPage } from './audit-logs-page';
import { AuditLogsService } from '../../data/audit-logs.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';

describe('AuditLogsPage', () => {
  let service: { list: jest.Mock; listAdminActions: jest.Mock };

  function setup(permissions: string[] = ['platform.audit.read']) {
    service = {
      list: jest.fn().mockReturnValue(of([])),
      listAdminActions: jest.fn().mockReturnValue(of({ items: [], totalCount: 0, page: 1, pageSize: 25 })),
    };

    TestBed.configureTestingModule({
      imports: [AuditLogsPage],
      providers: [{ provide: AuditLogsService, useValue: service }],
    }).compileComponents();

    const fixture = TestBed.createComponent(AuditLogsPage);
    TestBed.inject(PermissionStore).setAuthorizationContext({
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

  function tab(fixture: ReturnType<typeof setup>, label: string): HTMLButtonElement {
    const found = Array.from(
      fixture.nativeElement.querySelectorAll('[role="tab"]') as NodeListOf<HTMLButtonElement>,
    ).find((b) => b.textContent?.trim() === label);
    expect(found).toBeTruthy();
    return found!;
  }

  it('shows the no-permission message and calls no API without platform.audit.read', () => {
    const fixture = setup([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No permission to view page');
    expect(service.listAdminActions).not.toHaveBeenCalled();
    expect(service.list).not.toHaveBeenCalled();
  });

  it('opens on admin actions and loads sign-in events only when that tab is chosen', () => {
    const fixture = setup();
    fixture.detectChanges();

    expect(tab(fixture, 'Admin Actions').getAttribute('aria-selected')).toBe('true');
    expect(service.listAdminActions).toHaveBeenCalledTimes(1);
    expect(service.list).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('No admin actions recorded yet');

    tab(fixture, 'Sign-in Events').click();
    fixture.detectChanges();

    expect(tab(fixture, 'Sign-in Events').getAttribute('aria-selected')).toBe('true');
    expect(service.list).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.textContent).toContain('No audit log events yet');
    // The embedded sign-in list does not repeat the page title.
    expect(fixture.nativeElement.querySelectorAll('h1').length).toBe(1);
  });
});
