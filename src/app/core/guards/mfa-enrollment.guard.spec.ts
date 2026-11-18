import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { mfaEnrollmentGuard } from './mfa-enrollment.guard';
import { SessionService } from '../auth/session.service';
import { AuthContext } from '../auth/auth-context.model';

function context(mfaEnrollmentRequired: boolean): AuthContext {
  return {
    userId: 'u1',
    email: 'admin@example.com',
    platformRole: 'Platform Super Admin',
    expiresAt: '',
    mfaRequired: false,
    mfaEnrollmentRequired,
    permissions: [],
    scopes: {},
    entitlements: [],
  };
}

describe('mfaEnrollmentGuard', () => {
  function setup(mfaEnrollmentRequired: boolean | null) {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    if (mfaEnrollmentRequired !== null) {
      TestBed.inject(SessionService).setSession(context(mfaEnrollmentRequired));
    }
  }

  function runGuard(url: string) {
    const route = {} as ActivatedRouteSnapshot;
    const state = { url } as RouterStateSnapshot;
    return TestBed.runInInjectionContext(() => mfaEnrollmentGuard(route, state));
  }

  function serialize(result: unknown): string {
    expect(result).toBeInstanceOf(UrlTree);
    return TestBed.inject(Router).serializeUrl(result as UrlTree);
  }

  it('redirects a normal route to MFA setup while enrollment is required', () => {
    setup(true);

    expect(serialize(runGuard('/tenants'))).toBe('/settings/mfa');
    expect(serialize(runGuard('/'))).toBe('/settings/mfa');
  });

  it('allows the MFA setup route itself while enrollment is required, so it never loops', () => {
    setup(true);

    expect(runGuard('/settings/mfa')).toBe(true);
    expect(runGuard('/settings/mfa?from=login')).toBe(true);
    expect(runGuard('/settings/mfa#top')).toBe(true);
  });

  it('does not treat a lookalike path as the MFA setup route', () => {
    setup(true);

    expect(serialize(runGuard('/settings/mfa-other'))).toBe('/settings/mfa');
  });

  it('allows every route once enrollment is not required', () => {
    setup(false);

    expect(runGuard('/tenants')).toBe(true);
    expect(runGuard('/settings/mfa')).toBe(true);
  });

  it('allows navigation when no session is loaded (authGuard handles that case)', () => {
    setup(null);

    expect(runGuard('/tenants')).toBe(true);
  });
});
