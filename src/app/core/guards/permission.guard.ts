import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionStore } from '../permissions/permission.store';

export const permissionGuard: CanActivateFn = (route) => {
  const store = inject(PermissionStore);
  const router = inject(Router);

  const permission = route.data['permission'] as string | undefined;

  return store.canAccess(permission) ? true : router.createUrlTree(['/access-denied']);
};