import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../auth/session.service';

/** Where a platform admin enrolls TOTP. Also the only screen allowed while enrollment is pending. */
export const MFA_SETUP_URL = '/settings/mfa';

/**
 * Security audit F-02: MFA is mandatory for platform admins. Until an admin enrolls, the backend
 * answers every admin/v1 route except MFA setup, /me and logout with 403, so the console keeps them
 * on the setup screen. Runs as canActivateChild on the authenticated shell. The setup route itself
 * is always allowed, so the redirect can never loop.
 */
export const mfaEnrollmentGuard: CanActivateFn = (_route, state) => {
  const sessionService = inject(SessionService);
  const router = inject(Router);

  if (!sessionService.mfaEnrollmentRequired()) {
    return true;
  }

  const path = router.parseUrl(state.url).root.children['primary']?.segments.map((s) => s.path).join('/') ?? '';
  return `/${path}` === MFA_SETUP_URL ? true : router.createUrlTree([MFA_SETUP_URL]);
};
