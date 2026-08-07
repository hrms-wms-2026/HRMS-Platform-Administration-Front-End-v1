import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { Navbar } from './navbar';
import { AuthService } from '../../../core/auth/auth.service';
import { SessionService } from '../../../core/auth/session.service';

describe('Navbar', () => {
  let authService: { logout: jest.Mock };
  let router: { navigateByUrl: jest.Mock };

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

  function createComponent() {
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();
    return fixture;
  }

  it('opens the logout confirmation modal when Logout is clicked', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['onLogoutClicked']();

    expect(component['showLogoutConfirm']()).toBe(true);
  });

  it('closes the modal without logging out when cancelled', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['onLogoutClicked']();

    component['onLogoutCancelled']();

    expect(component['showLogoutConfirm']()).toBe(false);
    expect(authService.logout).not.toHaveBeenCalled();
  });

  it('logs out and navigates to login when confirmed', () => {
    authService.logout.mockReturnValue(of(undefined));
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['onLogoutClicked']();

    component['onLogoutConfirmed']();

    expect(component['showLogoutConfirm']()).toBe(false);
    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/auth/login');
  });
});
