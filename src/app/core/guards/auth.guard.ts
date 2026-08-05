import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../auth/session.service';

export const authGuard: CanActivateFn = () => {
  const sessionService = inject(SessionService);
  const router = inject(Router);

  return sessionService.isAuthenticated() ? true : router.createUrlTree(['/auth/login']);
};