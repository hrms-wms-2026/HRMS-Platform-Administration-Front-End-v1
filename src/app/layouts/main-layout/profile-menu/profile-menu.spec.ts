import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ProfileMenu } from './profile-menu';
import { AuthService } from '../../../core/auth/auth.service';
import { SessionService } from '../../../core/auth/session.service';

describe('ProfileMenu', () => {
  let authService: { logout: jest.Mock };
  let router: Router;
  let sessionService: SessionService;

  beforeEach(async () => {
    authService = { logout: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [ProfileMenu],
      providers: [{ provide: AuthService, useValue: authService }, provideRouter([]), SessionService],
    }).compileComponents();

    sessionService = TestBed.inject(SessionService);
    sessionService.setSession({
      userId: 'u1',
      email: 'dapiyshanth1908@gmail.com',
      platformRole: 'Platform Super Admin',
      expiresAt: '',
      mfaRequired: false,
      permissions: [],
      scopes: {},
      entitlements: [],
    });

    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  function createComponent() {
    const fixture = TestBed.createComponent(ProfileMenu);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the first two letters of the real user email as initials', () => {
    const fixture = createComponent();
    expect(fixture.nativeElement.textContent).toContain('DA');
  });

  it('is closed by default and opens when the avatar button is clicked', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    expect(component['open']()).toBe(false);

    const avatarButton: HTMLButtonElement = fixture.nativeElement.querySelector('[data-profile-avatar]');
    avatarButton.click();

    expect(component['open']()).toBe(true);
  });

  it('closes when a click happens outside the component', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['open'].set(true);

    document.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(component['open']()).toBe(false);
  });

  it('closes when Escape is pressed', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['open'].set(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(component['open']()).toBe(false);
  });

  it('has a Settings link pointing to /settings/mfa', () => {
    const fixture = createComponent();
    fixture.componentInstance['open'].set(true);
    fixture.detectChanges();

    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('[data-profile-settings-link]');
    expect(link.getAttribute('href')).toBe('/settings/mfa');
  });

  it('closes the dropdown and shows the logout confirmation modal on Logout click, without logging out immediately', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['open'].set(true);

    component['onLogoutClicked']();

    expect(component['open']()).toBe(false);
    expect(component['showLogoutConfirm']()).toBe(true);
    expect(authService.logout).not.toHaveBeenCalled();
  });

  it('logs out and navigates to login when the logout confirmation is confirmed', () => {
    authService.logout.mockReturnValue(of(undefined));
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['onLogoutClicked']();

    component['onLogoutConfirmed']();

    expect(component['showLogoutConfirm']()).toBe(false);
    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/auth/login');
  });

  it('closes the logout confirmation modal without logging out when cancelled', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['onLogoutClicked']();

    component['onLogoutCancelled']();

    expect(component['showLogoutConfirm']()).toBe(false);
    expect(authService.logout).not.toHaveBeenCalled();
  });
});
