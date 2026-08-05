import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionStore } from '../permissions/permission.store';

export const entitlementGuard: CanActivateFn = (route) => {
  const store = inject(PermissionStore);
  const router = inject(Router);

  const moduleCode = route.data['entitlement'] as string;

  return store.hasEntitlement(moduleCode) ? true : router.createUrlTree(['/access-denied']);
};