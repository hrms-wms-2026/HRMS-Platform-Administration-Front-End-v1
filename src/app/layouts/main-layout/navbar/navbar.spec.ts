import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { Navbar } from './navbar';
import { AuthService } from '../../../core/auth/auth.service';
import { SessionService } from '../../../core/auth/session.service';
import { MobileNavService } from '../mobile-nav.service';

describe('Navbar', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [{ provide: AuthService, useValue: { logout: jest.fn() } }, provideRouter([]), SessionService],
    }).compileComponents();
  });

  it('renders the profile menu', () => {
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-profile-menu')).toBeTruthy();
  });

  it('renders the ONEXSO logo icon and wordmark', () => {
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();

    const images = fixture.debugElement.queryAll(By.css('img'));
    const srcs = images.map((img) => img.nativeElement.getAttribute('src'));

    expect(srcs).toContain('onexso-logo-icon.svg');
    expect(srcs).toContain('onexso-logo-text.svg');
  });

  it('renders the breadcrumb', () => {
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-breadcrumb')).toBeTruthy();
  });

  it('renders a disabled search input with placeholder text', () => {
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();

    const input = fixture.debugElement.query(By.css('input[type="text"]'));
    expect(input).toBeTruthy();
    expect(input.nativeElement.disabled).toBe(true);
    expect(input.nativeElement.getAttribute('placeholder')).toBe('Search tenants, users, settings...');
  });

  it('renders a disabled notification button', () => {
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('button[aria-label="Notifications"]'));
    expect(button).toBeTruthy();
    expect(button.nativeElement.disabled).toBe(true);
  });

  it('renders a hamburger button with an aria-label', () => {
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('button[aria-label="Open navigation menu"]'));
    expect(button).toBeTruthy();
  });

  it('toggles the mobile nav open state when the hamburger is clicked', () => {
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();
    const mobileNav = TestBed.inject(MobileNavService);

    expect(mobileNav.open()).toBe(false);

    const button = fixture.debugElement.query(By.css('button[aria-label="Open navigation menu"]'));
    button.nativeElement.click();

    expect(mobileNav.open()).toBe(true);
  });
});
