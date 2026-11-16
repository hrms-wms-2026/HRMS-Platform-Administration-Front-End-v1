import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MainLayout } from './main-layout';
import { AuthService } from '../../core/auth/auth.service';
import { SessionService } from '../../core/auth/session.service';
import { AuthContext } from '../../core/auth/auth-context.model';

function buildContext(mfaEnrollmentRequired: boolean): AuthContext {
  return {
    userId: 'user-1',
    email: 'dev@onevo.io',
    platformRole: 'Platform Super Admin',
    expiresAt: '2026-12-01T00:00:00Z',
    mfaRequired: false,
    mfaEnrollmentRequired,
    permissions: [],
    scopes: {},
    entitlements: [],
  };
}

describe('MainLayout', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainLayout],
      providers: [{ provide: AuthService, useValue: { logout: jest.fn() } }, provideRouter([]), provideHttpClient(), provideHttpClientTesting(), SessionService],
    }).compileComponents();
  });

  function render(mfaEnrollmentRequired: boolean): HTMLElement {
    TestBed.inject(SessionService).setSession(buildContext(mfaEnrollmentRequired));
    const fixture = TestBed.createComponent(MainLayout);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the sidebar and the full navbar once MFA is enrolled', () => {
    const element = render(false);

    expect(element.querySelector('app-sidebar')).toBeTruthy();
    expect(element.querySelector('button[aria-label="Open navigation menu"]')).toBeTruthy();
    expect(element.querySelector('app-profile-menu')).toBeTruthy();
    expect(element.querySelector('app-announcement-banner')).toBeTruthy();
  });

  it('hides navigation while MFA enrollment is required but keeps sign-out reachable', () => {
    const element = render(true);

    expect(element.querySelector('app-sidebar')).toBeNull();
    expect(element.querySelector('button[aria-label="Open navigation menu"]')).toBeNull();
    expect(element.querySelector('app-breadcrumb')).toBeNull();
    expect(element.querySelector('input[type="text"]')).toBeNull();
    expect(element.querySelector('app-announcement-banner')).toBeNull();
    expect(element.querySelector('app-support-bell')).toBeNull();
    expect(element.querySelector('app-profile-menu')).toBeTruthy();
  });
});
