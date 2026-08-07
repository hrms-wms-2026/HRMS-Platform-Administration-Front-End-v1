import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { UserProfileDrawer } from './user-profile-drawer';
import { PlatformUsersService } from '../../data/platform-users.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';

describe('UserProfileDrawer', () => {
  let usersService: {
    getUserById: jest.Mock;
    listRoles: jest.Mock;
    updateUserRoles: jest.Mock;
  };
  let notificationService: { success: jest.Mock; error: jest.Mock };

  const userDetail = {
    id: 'user-1',
    email: 'a@onevo.io',
    fullName: 'Arun Selvan',
    status: 'active' as const,
    createdAt: '2026-08-01T00:00:00Z',
    lastLoginAt: null,
    roles: [{ id: 'role-1', name: 'Security Auditor' }],
  };

  const allRoles = [
    { id: 'role-1', name: 'Security Auditor' },
    { id: 'role-2', name: 'Billing Manager' },
  ];

  function setup(userId: string, permissions: string[] = ['platform.accounts.read', 'platform.roles.manage']) {
    usersService = {
      getUserById: jest.fn().mockReturnValue(of(userDetail)),
      listRoles: jest.fn().mockReturnValue(of(allRoles)),
      updateUserRoles: jest.fn(),
    };
    notificationService = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [UserProfileDrawer],
      providers: [
        { provide: PlatformUsersService, useValue: usersService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(UserProfileDrawer);
    fixture.componentRef.setInput('userId', userId);
    const store = TestBed.inject(PermissionStore);
    store.setAuthorizationContext({
      userId: 'admin-1',
      email: 'admin@example.com',
      platformRole: 'Platform Super Admin',
      expiresAt: '',
      mfaRequired: false,
      permissions,
      scopes: {},
      entitlements: [],
    });
    fixture.detectChanges();
    return fixture;
  }

  it('loads the user detail and full role list on open', () => {
    const fixture = setup('user-1');
    const component = fixture.componentInstance;

    expect(usersService.getUserById).toHaveBeenCalledWith('user-1');
    expect(usersService.listRoles).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Arun Selvan');
    expect(component['allRoles']()).toEqual(allRoles);
  });

  it("pre-checks the user's current roles", () => {
    const fixture = setup('user-1');
    const component = fixture.componentInstance;

    expect(component['checkedRoleIds']().has('role-1')).toBe(true);
    expect(component['checkedRoleIds']().has('role-2')).toBe(false);
  });

  it('tracks unsaved changes as role checkboxes are toggled', () => {
    const fixture = setup('user-1');
    const component = fixture.componentInstance;

    expect(component['hasChanges']()).toBe(false);
    component['toggleRole']('role-2');
    expect(component['hasChanges']()).toBe(true);
    component['toggleRole']('role-2');
    expect(component['hasChanges']()).toBe(false);
  });

  it('reports canManageRoles as false without platform.roles.manage', () => {
    const fixture = setup('user-1', ['platform.accounts.read']);
    const component = fixture.componentInstance;

    expect(component['canManageRoles']()).toBe(false);
  });

  it('saves the checked role ids, reloads, and emits updated on success', () => {
    const fixture = setup('user-1');
    usersService.updateUserRoles.mockReturnValue(of(undefined));
    const component = fixture.componentInstance;
    let updated = false;
    component.updated.subscribe(() => (updated = true));

    component['toggleRole']('role-2');
    component['save']();

    expect(usersService.updateUserRoles).toHaveBeenCalledWith('user-1', ['role-1', 'role-2']);
    expect(notificationService.success).toHaveBeenCalledWith('User roles updated.');
    expect(usersService.getUserById).toHaveBeenCalledTimes(2);
    expect(updated).toBe(true);
  });

  it('shows the backend error detail message when save fails', () => {
    const fixture = setup('user-1');
    usersService.updateUserRoles.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { detail: 'Cannot remove the last active admin.' },
          }),
      ),
    );
    const component = fixture.componentInstance;

    component['save']();

    expect(notificationService.error).toHaveBeenCalledWith('Cannot remove the last active admin.');
  });

  it('emits closed when the close button is used', () => {
    const fixture = setup('user-1');
    const component = fixture.componentInstance;
    let closed = false;
    component.closed.subscribe(() => (closed = true));

    component['close']();

    expect(closed).toBe(true);
  });
});
