import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { MfaVerify } from './mfa-verify';
import { AuthService } from '../../../../core/auth/auth.service';
import { SessionService } from '../../../../core/auth/session.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';

describe('MfaVerify', () => {
  let authService: { verifyMfa: jest.Mock };
  let sessionService: { setSession: jest.Mock };
  let permissionStore: { setAuthorizationContext: jest.Mock };
  let router: { navigateByUrl: jest.Mock };

  function setup() {
    authService = { verifyMfa: jest.fn() };
    sessionService = { setSession: jest.fn() };
    permissionStore = { setAuthorizationContext: jest.fn() };
    router = { navigateByUrl: jest.fn() };

    TestBed.configureTestingModule({
      imports: [MfaVerify],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: SessionService, useValue: sessionService },
        { provide: PermissionStore, useValue: permissionStore },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(MfaVerify);
    fixture.detectChanges();
    return fixture;
  }

  it('auto-submits once a full 6-digit code is entered', () => {
    const fixture = setup();
    authService.verifyMfa.mockReturnValue(of({ userId: 'u1' }));
    const component = fixture.componentInstance;

    component['codeForm'].controls.code.setValue('123456');
    fixture.detectChanges();

    expect(authService.verifyMfa).toHaveBeenCalledWith('123456');
    expect(authService.verifyMfa).toHaveBeenCalledTimes(1);
  });

  it('does not auto-submit for an incomplete code', () => {
    const fixture = setup();
    const component = fixture.componentInstance;

    component['codeForm'].controls.code.setValue('123');
    fixture.detectChanges();

    expect(authService.verifyMfa).not.toHaveBeenCalled();
  });

  it('does not re-submit the same code twice', () => {
    const fixture = setup();
    authService.verifyMfa.mockReturnValue(of({ userId: 'u1' }));
    const component = fixture.componentInstance;

    component['codeForm'].controls.code.setValue('123456');
    fixture.detectChanges();
    component['codeForm'].controls.code.setValue('123456');
    fixture.detectChanges();

    expect(authService.verifyMfa).toHaveBeenCalledTimes(1);
  });

  it('auto-submits again for a new code after a failed attempt', () => {
    const fixture = setup();
    authService.verifyMfa.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 401 })),
    );
    const component = fixture.componentInstance;

    component['codeForm'].controls.code.setValue('111111');
    fixture.detectChanges();
    component['codeForm'].controls.code.setValue('222222');
    fixture.detectChanges();

    expect(authService.verifyMfa).toHaveBeenCalledTimes(2);
    expect(authService.verifyMfa).toHaveBeenNthCalledWith(1, '111111');
    expect(authService.verifyMfa).toHaveBeenNthCalledWith(2, '222222');
  });

  it('navigates to the dashboard on successful verification', () => {
    const fixture = setup();
    authService.verifyMfa.mockReturnValue(of({ userId: 'u1' }));
    const component = fixture.componentInstance;

    component['codeForm'].controls.code.setValue('123456');
    fixture.detectChanges();

    expect(sessionService.setSession).toHaveBeenCalledWith({ userId: 'u1' });
    expect(permissionStore.setAuthorizationContext).toHaveBeenCalledWith({ userId: 'u1' });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });
});
