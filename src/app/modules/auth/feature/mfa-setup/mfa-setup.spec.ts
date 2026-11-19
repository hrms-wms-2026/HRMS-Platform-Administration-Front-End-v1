import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { MfaSetup } from './mfa-setup';
import { AuthService } from '../../../../core/auth/auth.service';
import { SessionService } from '../../../../core/auth/session.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { AuthContext } from '../../../../core/auth/auth-context.model';

jest.mock('qrcode', () => ({ toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,qr') }));

function buildContext(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    userId: 'user-1',
    email: 'dev@onevo.io',
    platformRole: 'Platform Super Admin',
    expiresAt: '2026-12-01T00:00:00Z',
    mfaRequired: false,
    mfaEnrollmentRequired: false,
    permissions: ['platform.tenants.read'],
    scopes: {},
    entitlements: [],
    ...overrides,
  };
}

describe('MfaSetup', () => {
  let authService: { enableMfa: jest.Mock; confirmMfaSetup: jest.Mock; loadContext: jest.Mock };
  let router: { navigateByUrl: jest.Mock };

  beforeEach(async () => {
    authService = {
      enableMfa: jest.fn().mockReturnValue(of({ secret: 'JBSWY3DPEHPK3PXP', qrCodeUri: 'otpauth://totp/x' })),
      confirmMfaSetup: jest.fn().mockReturnValue(of({ success: true })),
      loadContext: jest.fn().mockReturnValue(of(buildContext())),
    };
    router = { navigateByUrl: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [MfaSetup],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        SessionService,
        PermissionStore,
      ],
    }).compileComponents();
  });

  function createComponent() {
    const fixture = TestBed.createComponent(MfaSetup);
    fixture.detectChanges();
    return fixture;
  }

  function confirmWithCode(component: MfaSetup) {
    component.startSetup();
    component['codeForm'].setValue({ code: '123456' });
    component.confirmSetup();
  }

  it('shows why setup is required while enrollment is pending', () => {
    TestBed.inject(SessionService).setSession(buildContext({ mfaEnrollmentRequired: true }));

    const fixture = createComponent();

    const notice = fixture.nativeElement.querySelector('[data-testid="mfa-enrollment-required"]');
    expect(notice?.textContent).toContain('required');
  });

  it('does not show the required notice for a voluntary setup', () => {
    TestBed.inject(SessionService).setSession(buildContext({ mfaEnrollmentRequired: false }));

    const fixture = createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="mfa-enrollment-required"]')).toBeNull();
  });

  it('refreshes the session after setup so the enrollment flag clears, then goes home', () => {
    const sessionService = TestBed.inject(SessionService);
    const permissionStore = TestBed.inject(PermissionStore);
    sessionService.setSession(buildContext({ mfaEnrollmentRequired: true }));
    const fixture = createComponent();

    confirmWithCode(fixture.componentInstance);

    expect(authService.confirmMfaSetup).toHaveBeenCalledWith('123456');
    expect(authService.loadContext).toHaveBeenCalledTimes(1);
    expect(sessionService.mfaEnrollmentRequired()).toBe(false);
    expect(permissionStore.permissions()).toEqual(['platform.tenants.read']);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('keeps the success state and asks to sign in again when the refresh fails', () => {
    authService.loadContext.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    const sessionService = TestBed.inject(SessionService);
    sessionService.setSession(buildContext({ mfaEnrollmentRequired: true }));
    const fixture = createComponent();
    const component = fixture.componentInstance;

    confirmWithCode(component);

    expect(component['confirmed']()).toBe(true);
    expect(component['errorMessage']()).toContain('sign in again');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('does not refresh or navigate when the code is rejected', () => {
    authService.confirmMfaSetup.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400 })));
    const fixture = createComponent();

    confirmWithCode(fixture.componentInstance);

    expect(authService.loadContext).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(fixture.componentInstance['errorMessage']()).toBe('Invalid code. Please try again.');
  });
});
