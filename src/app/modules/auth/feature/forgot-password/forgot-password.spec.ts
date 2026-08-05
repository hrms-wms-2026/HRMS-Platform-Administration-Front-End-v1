import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { ForgotPassword } from './forgot-password';
import { AuthService } from '../../../../core/auth/auth.service';

describe('ForgotPassword', () => {
  let authService: { forgotPassword: jest.Mock };
  let router: { navigateByUrl: jest.Mock };

  beforeEach(async () => {
    authService = { forgotPassword: jest.fn() };
    router = { navigateByUrl: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [ForgotPassword],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();
  });

  function createComponent() {
    const fixture = TestBed.createComponent(ForgotPassword);
    fixture.detectChanges();
    return fixture;
  }

  it('disables submit when the email field is empty or invalid', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    expect(component['forgotPasswordForm'].invalid).toBe(true);

    component['forgotPasswordForm'].setValue({ email: 'not-an-email' });
    expect(component['forgotPasswordForm'].invalid).toBe(true);

    component['forgotPasswordForm'].setValue({ email: 'admin@onexso.test' });
    expect(component['forgotPasswordForm'].invalid).toBe(false);
  });

  it('shows the success view after a successful submit', () => {
    authService.forgotPassword.mockReturnValue(of(undefined));
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['forgotPasswordForm'].setValue({ email: 'admin@onexso.test' });

    component.submit();

    expect(authService.forgotPassword).toHaveBeenCalledWith('admin@onexso.test');
    expect(component['submitted']()).toBe(true);
  });

  it('shows an inline error and does not flip to the success view on a network failure', () => {
    authService.forgotPassword.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 0 })),
    );
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['forgotPasswordForm'].setValue({ email: 'admin@onexso.test' });

    component.submit();

    expect(component['errorMessage']()).toBe('Connection failed. Please retry.');
    expect(component['submitted']()).toBe(false);
  });

  it('navigates to login when Back to sign in is clicked', () => {
    const fixture = createComponent();

    fixture.componentInstance.goToLogin();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/auth/login');
  });
});
