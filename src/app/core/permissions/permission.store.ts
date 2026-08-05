import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { AuthContext } from '../auth/auth-context.model';
import { PermissionState } from './permission.types';

const initialState: PermissionState = {
  permissions: [],
  scopes: {},
  entitlements: [],
  loaded: false,
};

export const PermissionStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => ({
    setAuthorizationContext(context: AuthContext): void {
      patchState(store, {
        permissions: context.permissions,
        scopes: context.scopes,
        entitlements: context.entitlements,
        loaded: true,
      });
    },

    hasPermission(permission: string): boolean {
      return store.permissions().includes(permission);
    },

    hasAnyPermission(permissions: string[]): boolean {
      return permissions.some((permission) => store.permissions().includes(permission));
    },

    hasAllPermissions(permissions: string[]): boolean {
      return permissions.every((permission) => store.permissions().includes(permission));
    },

    hasEntitlement(moduleCode: string): boolean {
      return store.entitlements().includes(moduleCode);
    },

    clear(): void {
      patchState(store, {
        permissions: [],
        scopes: {},
        entitlements: [],
        loaded: false,
      });
    },
  })),
);