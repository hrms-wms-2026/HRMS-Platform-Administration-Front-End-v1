import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { ResetPassword } from './reset-password';
import { AuthService } from '../../../../core/auth/auth.service';

describe('ResetPassword', () => {
  let authService: { resetPassword: jest.Mock };
  let router: { navigate: jest.Mock; navigateByUrl: jest.Mock };
  let queryParamMap: Map<string, string>;

  beforeEach(async () => {
    authService = { resetPassword: jest.fn() };
    router = { navigate: jest.fn(), navigateByUrl: jest.fn() };
    queryParamMap = new Map([['token', 'raw-token']]);

    await TestBed.configureTestingModule({
      imports: [ResetPassword],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: { get: (key: string) => queryParamMap.get(key) ?? null } },
          },
        },
      ],
    }).compileComponents();
  });

  function createComponent() {
    const fixture = TestBed.createComponent(ResetPassword);
    fixture.detectChanges();
    return fixture;
  }

  it('reads the token from the query params and strips it from the URL on init', () => {
    createComponent();

    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: {}, replaceUrl: true }),
    );
  });

  it('goes straight to the invalid view when no token is present', () => {
    queryParamMap = new Map();
    const fixture = createComponent();

    expect(fixture.componentInstance['view']()).toBe('invalid');
  });

  it('flags a mismatch between new and confirm password', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['resetPasswordForm'].setValue({
      newPassword: 'CorrectHorseBattery1',
      confirmPassword: 'Different1234',
    });

    expect(component['resetPasswordForm'].invalid).toBe(true);
  });

  it('rejects a password shorter than 12 characters', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['resetPasswordForm'].setValue({ newPassword: 'Short1', confirmPassword: 'Short1' });

    expect(component['resetPasswordForm'].invalid).toBe(true);
  });

  it('shows the success view after a successful submit', () => {
    authService.resetPassword.mockReturnValue(of(undefined));
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['resetPasswordForm'].setValue({
      newPassword: 'CorrectHorseBattery1',
      confirmPassword: 'CorrectHorseBattery1',
    });

    component.submit();

    expect(authService.resetPassword).toHaveBeenCalledWith('raw-token', 'CorrectHorseBattery1');
    expect(component['view']()).toBe('success');
  });

  it('shows the invalid view after a failed submit', () => {
    authService.resetPassword.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 400 })),
    );
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['resetPasswordForm'].setValue({
      newPassword: 'CorrectHorseBattery1',
      confirmPassword: 'CorrectHorseBattery1',
    });

    component.submit();

    expect(component['view']()).toBe('invalid');
  });

  it('navigates to login when Continue to sign in is triggered', () => {
    const fixture = createComponent();

    fixture.componentInstance.continueToSignIn();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/auth/login');
  });

  it('navigates to forgot-password when Request a new link is triggered', () => {
    const fixture = createComponent();

    fixture.componentInstance.requestNewLink();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/auth/forgot-password');
  });
});
