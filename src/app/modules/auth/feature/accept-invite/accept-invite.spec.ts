import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AcceptInvite } from './accept-invite';
import { AuthService } from '../../../../core/auth/auth.service';

describe('AcceptInvite', () => {
  let authService: { acceptInvite: jest.Mock };
  let router: { navigate: jest.Mock; navigateByUrl: jest.Mock };

  function setup(token: string | null) {
    authService = { acceptInvite: jest.fn() };
    router = { navigate: jest.fn(), navigateByUrl: jest.fn() };

    TestBed.configureTestingModule({
      imports: [AcceptInvite],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap(token ? { token } : {}) },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AcceptInvite);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the not-found view when there is no token in the URL', () => {
    const fixture = setup(null);
    expect(fixture.componentInstance['view']()).toBe('invalid');
  });

  it('submits the token and password, showing success on completion', () => {
    const fixture = setup('raw-token');
    const component = fixture.componentInstance;
    authService.acceptInvite.mockReturnValue(of(undefined));
    component['acceptInviteForm'].setValue({ password: 'NewPassword1!', confirmPassword: 'NewPassword1!' });

    component.submit();

    expect(authService.acceptInvite).toHaveBeenCalledWith('raw-token', 'NewPassword1!');
    expect(component['view']()).toBe('success');
  });

  it('shows the specific backend error message on failure', () => {
    const fixture = setup('raw-token');
    const component = fixture.componentInstance;
    authService.acceptInvite.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { detail: 'This invitation has expired.' } })),
    );
    component['acceptInviteForm'].setValue({ password: 'NewPassword1!', confirmPassword: 'NewPassword1!' });

    component.submit();

    expect(component['view']()).toBe('error');
    expect(component['errorMessage']()).toBe('This invitation has expired.');
  });

  it('navigates to login when Sign in is clicked', () => {
    const fixture = setup('raw-token');
    fixture.componentInstance.continueToSignIn();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/auth/login');
  });
});
