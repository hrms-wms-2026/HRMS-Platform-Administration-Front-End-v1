import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { PlatformUsersList } from './platform-users-list';
import { PlatformUsersService } from '../../data/platform-users.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';
import { PlatformUser } from '../../data/platform-user.model';
import { AuthContext } from '../../../../core/auth/auth-context.model';

function buildUsers(count: number): PlatformUser[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `id-${i}`,
    email: `user${i}@onevo.io`,
    fullName: `User ${i}`,
    role: i % 2 === 0 ? 'Platform Manager' : 'Support Manager',
    status: i % 3 !== 0 ? 'active' : 'inactive',
    createdAt: '2026-08-01T00:00:00Z',
    lastLoginAt: null,
  }));
}

function buildAuthContext(permissions: string[]): AuthContext {
  return {
    userId: 'admin-1',
    email: 'admin@onevo.io',
    platformRole: 'Platform Super Admin',
    expiresAt: '2026-12-31T00:00:00Z',
    mfaRequired: false,
    permissions,
    scopes: {},
    entitlements: [],
  };
}

describe('PlatformUsersList', () => {
  let usersService: { list: jest.Mock; revokeInvite: jest.Mock };
  let notificationService: { info: jest.Mock; success: jest.Mock; error: jest.Mock };
  let permissionStore: PermissionStore;

  function createComponent() {
    const fixture = TestBed.createComponent(PlatformUsersList);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(async () => {
    usersService = { list: jest.fn(), revokeInvite: jest.fn() };
    notificationService = { info: jest.fn(), success: jest.fn(), error: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [PlatformUsersList],
      providers: [
        { provide: PlatformUsersService, useValue: usersService },
        { provide: NotificationService, useValue: notificationService },
        PermissionStore,
      ],
    }).compileComponents();

    permissionStore = TestBed.inject(PermissionStore);
  });

  it('shows "No permission to view page" when the user lacks platform.accounts.read', () => {
    usersService.list.mockReturnValue(of([]));
    const fixture = createComponent();

    expect(fixture.nativeElement.textContent).toContain('No permission to view page');
    expect(usersService.list).not.toHaveBeenCalled();
  });

  it('loads and displays users when the user has platform.accounts.read', () => {
    permissionStore.setAuthorizationContext(buildAuthContext(['platform.accounts.read']));
    usersService.list.mockReturnValue(of(buildUsers(3)));

    const fixture = createComponent();
    const component = fixture.componentInstance;

    expect(component['allUsers']()).toHaveLength(3);
    expect(fixture.nativeElement.textContent).toContain('user0@onevo.io');
  });

  it('filters by search text across name and email', () => {
    permissionStore.setAuthorizationContext(buildAuthContext(['platform.accounts.read']));
    usersService.list.mockReturnValue(of(buildUsers(5)));
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['onSearchChange']('User 2');

    expect(component['filteredUsers']()).toHaveLength(1);
    expect(component['filteredUsers']()[0].fullName).toBe('User 2');
  });

  it('filters by role', () => {
    permissionStore.setAuthorizationContext(buildAuthContext(['platform.accounts.read']));
    usersService.list.mockReturnValue(of(buildUsers(4)));
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['onRoleFilterChange']('Support Manager');

    expect(component['filteredUsers']().every((u) => u.role === 'Support Manager')).toBe(true);
  });

  it('filters by status', () => {
    permissionStore.setAuthorizationContext(buildAuthContext(['platform.accounts.read']));
    usersService.list.mockReturnValue(of(buildUsers(6)));
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['onStatusFilterChange']('inactive');

    expect(component['filteredUsers']().every((u) => u.status === 'inactive')).toBe(true);
  });

  it('paginates results at 20 per page', () => {
    permissionStore.setAuthorizationContext(buildAuthContext(['platform.accounts.read']));
    usersService.list.mockReturnValue(of(buildUsers(45)));
    const fixture = createComponent();
    const component = fixture.componentInstance;

    expect(component['pagedUsers']()).toHaveLength(20);

    component['goToPage'](3);

    expect(component['pagedUsers']()).toHaveLength(5);
  });

  it('shows "No users match your search" when a filter yields nothing but users exist', () => {
    permissionStore.setAuthorizationContext(buildAuthContext(['platform.accounts.read']));
    usersService.list.mockReturnValue(of(buildUsers(2)));
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['onSearchChange']('no-such-user');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No users match your search');
  });

  it('shows "No platform users yet" when the list is empty', () => {
    permissionStore.setAuthorizationContext(buildAuthContext(['platform.accounts.read']));
    usersService.list.mockReturnValue(of([]));
    const fixture = createComponent();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No platform users yet');
  });

  it('hides the Invite Manager button without platform.accounts.manage', () => {
    permissionStore.setAuthorizationContext(buildAuthContext(['platform.accounts.read']));
    usersService.list.mockReturnValue(of([]));
    const fixture = createComponent();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Invite Manager');
  });

  it('opens the invite modal when Invite Manager is clicked', () => {
    permissionStore.setAuthorizationContext(
      buildAuthContext(['platform.accounts.read', 'platform.accounts.manage']),
    );
    usersService.list.mockReturnValue(of([]));
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['onInviteManagerClicked']();

    expect(component['showInviteModal']()).toBe(true);
  });

  it('reloads users when the modal emits invited', () => {
    permissionStore.setAuthorizationContext(
      buildAuthContext(['platform.accounts.read', 'platform.accounts.manage']),
    );
    usersService.list.mockReturnValue(of([]));
    const fixture = createComponent();
    const component = fixture.componentInstance;
    const loadUsersSpy = jest.spyOn(component, 'loadUsers');

    component['onInviteManagerClicked']();
    component['onInviteSuccess']();

    expect(component['showInviteModal']()).toBe(false);
    expect(loadUsersSpy).toHaveBeenCalled();
  });

  it('revokes a pending invite', () => {
    permissionStore.setAuthorizationContext(buildAuthContext(['platform.accounts.read']));
    usersService.list.mockReturnValue(of([]));
    usersService.revokeInvite.mockReturnValue(of(undefined));
    const fixture = createComponent();
    const component = fixture.componentInstance;
    const loadUsersSpy = jest.spyOn(component, 'loadUsers');

    component['revokeInvite']('user-id-1');

    expect(usersService.revokeInvite).toHaveBeenCalledWith('user-id-1');
    expect(loadUsersSpy).toHaveBeenCalled();
  });

  it('opens the profile drawer with the clicked user id on row click', () => {
    permissionStore.setAuthorizationContext(buildAuthContext(['platform.accounts.read']));
    usersService.list.mockReturnValue(of(buildUsers(1)));
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['openProfile']('id-0');

    expect(component['selectedUserId']()).toBe('id-0');
  });

  it('clears the selected user id on drawer close', () => {
    permissionStore.setAuthorizationContext(buildAuthContext(['platform.accounts.read']));
    usersService.list.mockReturnValue(of(buildUsers(1)));
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['openProfile']('id-0');
    component['closeProfile']();

    expect(component['selectedUserId']()).toBeNull();
  });

  it('shows an error message when the list request fails', () => {
    permissionStore.setAuthorizationContext(buildAuthContext(['platform.accounts.read']));
    usersService.list.mockReturnValue(throwError(() => new Error('network error')));
    const fixture = createComponent();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Something went wrong. Please try again.');
  });
});
