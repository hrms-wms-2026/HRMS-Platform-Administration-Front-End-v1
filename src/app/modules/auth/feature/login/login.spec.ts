import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { Login } from './login';
import { AuthService } from '../../../../core/auth/auth.service';
import { SessionService } from '../../../../core/auth/session.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { AuthContext } from '../../../../core/auth/auth-context.model';

const REMEMBERED_EMAIL_KEY = 'onevo_admin_remembered_email';

function buildContext(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    userId: 'user-1',
    email: 'dev@onevo.io',
    platformRole: 'Platform Super Admin',
    expiresAt: '2026-01-01T00:00:00Z',
    mfaRequired: false,
    permissions: [],
    scopes: {},
    entitlements: [],
    ...overrides,
  };
}

describe('Login', () => {
  let authService: { login: jest.Mock };
  let router: { navigateByUrl: jest.Mock };

  beforeEach(async () => {
    localStorage.clear();
    authService = { login: jest.fn() };
    router = { navigateByUrl: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        SessionService,
        PermissionStore,
      ],
    }).compileComponents();
  });

  function createComponent() {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    return fixture;
  }

  it('leaves the email blank and the checkbox unchecked when nothing is remembered', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    expect(component['loginForm'].getRawValue().email).toBe('');
    expect(component['loginForm'].getRawValue().rememberEmail).toBe(false);
  });

  it('pre-fills the email and checks the box when a remembered email exists', () => {
    localStorage.setItem(REMEMBERED_EMAIL_KEY, 'dev@onevo.io');

    const fixture = createComponent();
    const component = fixture.componentInstance;

    expect(component['loginForm'].getRawValue().email).toBe('dev@onevo.io');
    expect(component['loginForm'].getRawValue().rememberEmail).toBe(true);
  });

  it('saves the email to localStorage on successful login when remember is checked', () => {
    authService.login.mockReturnValue(of(buildContext()));
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['loginForm'].setValue({
      email: 'dev@onevo.io',
      password: 'dapiyshanth@19',
      rememberEmail: true,
    });
    component.submit();

    expect(localStorage.getItem(REMEMBERED_EMAIL_KEY)).toBe('dev@onevo.io');
  });

  it('removes any saved email on successful login when remember is unchecked', () => {
    localStorage.setItem(REMEMBERED_EMAIL_KEY, 'old@onevo.io');
    authService.login.mockReturnValue(of(buildContext()));
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['loginForm'].setValue({
      email: 'dev@onevo.io',
      password: 'dapiyshanth@19',
      rememberEmail: false,
    });
    component.submit();

    expect(localStorage.getItem(REMEMBERED_EMAIL_KEY)).toBeNull();
  });

  it('navigates to mfa-verify without establishing a session when MFA is required', () => {
    authService.login.mockReturnValue(of(buildContext({ mfaRequired: true })));
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['loginForm'].setValue({
      email: 'dev@onevo.io',
      password: 'dapiyshanth@19',
      rememberEmail: false,
    });

    component.submit();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/auth/mfa-verify');
  });

  it('establishes the session and navigates home when MFA is not required', () => {
    authService.login.mockReturnValue(of(buildContext()));
    const sessionService = TestBed.inject(SessionService);
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['loginForm'].setValue({
      email: 'dev@onevo.io',
      password: 'dapiyshanth@19',
      rememberEmail: false,
    });

    component.submit();

    expect(sessionService.isAuthenticated()).toBe(true);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('shows an error message and does not touch the remembered email on failed login', () => {
    localStorage.setItem(REMEMBERED_EMAIL_KEY, 'old@onevo.io');
    authService.login.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 401 })),
    );
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['loginForm'].setValue({
      email: 'dev@onevo.io',
      password: 'wrong',
      rememberEmail: true,
    });

    component.submit();

    expect(component['errorMessage']()).toBe('Invalid email or password.');
    expect(localStorage.getItem(REMEMBERED_EMAIL_KEY)).toBe('old@onevo.io');
  });

  it('does not render a Forgot Password control (removed - not needed for the admin console)', () => {
    const fixture = createComponent();

    expect(fixture.nativeElement.textContent).not.toContain('Forgot Password');
  });
});
