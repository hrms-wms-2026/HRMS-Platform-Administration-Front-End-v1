import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../auth/session.service';

export const roleGuard: CanActivateFn = (route) => {
  const sessionService = inject(SessionService);
  const router = inject(Router);

  const requiredRoles = route.data['roles'] as string[];
  const userRole = sessionService.currentUser()?.platformRole;

  return userRole !== undefined && requiredRoles.includes(userRole)
    ? true
    : router.createUrlTree(['/access-denied']);
};