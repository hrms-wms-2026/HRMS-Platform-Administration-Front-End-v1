import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { Navbar } from './navbar';
import { AuthService } from '../../../core/auth/auth.service';
import { SessionService } from '../../../core/auth/session.service';

describe('Navbar', () => {
  let authService: { logout: jest.Mock };
  let router: { navigateByUrl: jest.Mock };
  let confirmSpy: jest.SpyInstance;

  beforeEach(async () => {
    authService = { logout: jest.fn() };
    router = { navigateByUrl: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: {} },
        SessionService,
      ],
    }).compileComponents();
  });

  afterEach(() => {
    confirmSpy?.mockRestore();
  });

  function createComponent() {
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();
    return fixture;
  }

  it('logs out when the confirmation dialog is accepted', () => {
    confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    authService.logout.mockReturnValue(of(undefined));
    const fixture = createComponent();

    fixture.componentInstance.logout();

    expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to log out?');
    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/auth/login');
  });

  it('does not log out when the confirmation dialog is declined', () => {
    confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
    const fixture = createComponent();

    fixture.componentInstance.logout();

    expect(authService.logout).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
