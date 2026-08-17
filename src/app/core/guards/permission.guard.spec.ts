import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, provideRouter } from '@angular/router';
import { permissionGuard } from './permission.guard';
import { PermissionStore } from '../permissions/permission.store';

describe('permissionGuard', () => {
  function setup() {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
    return TestBed.inject(PermissionStore);
  }

  function runGuard(permission: string | undefined) {
    const route = { data: { permission } } as unknown as ActivatedRouteSnapshot;
    const state = {} as RouterStateSnapshot;
    return TestBed.runInInjectionContext(() => permissionGuard(route, state));
  }

  function loadPermissions(store: InstanceType<typeof PermissionStore>, permissions: string[]) {
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
  }

  it('allows navigation to a route with no permission requirement', () => {
    setup();

    expect(runGuard(undefined)).toBe(true);
  });

  it('fails open when no permissions have loaded yet', () => {
    setup();

    expect(runGuard('platform.tenants.read')).toBe(true);
  });

  it('allows navigation when the user has the required permission', () => {
    const store = setup();
    loadPermissions(store, ['platform.tenants.read']);

    expect(runGuard('platform.tenants.read')).toBe(true);
  });

  it('redirects to /access-denied when permissions are loaded but the required one is missing', () => {
    const store = setup();
    loadPermissions(store, ['platform.tenants.read']);

    const result = runGuard('platform.roles.read');

    expect(result).not.toBe(true);
    expect(String(result)).toBe('/access-denied');
  });
});
