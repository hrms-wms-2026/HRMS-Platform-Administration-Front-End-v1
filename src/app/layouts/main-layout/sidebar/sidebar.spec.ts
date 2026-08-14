import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { Sidebar } from './sidebar';
import { PermissionStore } from '../../../core/permissions/permission.store';
import { MobileNavService } from '../mobile-nav.service';

describe('Sidebar', () => {
  function setup(permissions: string[] = []) {
    TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(Sidebar);
    const store = TestBed.inject(PermissionStore);
    store.setAuthorizationContext({
      userId: 'u1',
      email: 'admin@example.com',
      platformRole: 'Platform Super Admin',
      expiresAt: '',
      mfaRequired: false,
      permissions,
      scopes: {},
      entitlements: [],
    });

    fixture.detectChanges();
    return fixture;
  }

  function hrefs(fixture: ReturnType<typeof setup>) {
    return fixture.debugElement
      .queryAll(By.css('a'))
      .map((link) => link.nativeElement.getAttribute('href'));
  }

  it('renders all five section labels', () => {
    const fixture = setup();
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Platform');
    expect(text).toContain('Access Control');
    expect(text).toContain('Subscription & Billing');
    expect(text).toContain('System Config');
    expect(text).toContain('Security & Compliance');
  });

  it('renders all built screens as real navigable links', () => {
    const fixture = setup();
    const links = hrefs(fixture);

    expect(links).toContain('/');
    expect(links).toContain('/tenants');
    expect(links).toContain('/users');
    expect(links).toContain('/roles');
    expect(links).toContain('/subscription-plans');
    expect(links).toContain('/invoices');
    expect(links).toContain('/system-config/providers');
    expect(links).toContain('/system-config/service-keys');
    expect(links).toContain('/system-config/oauth-apps');
    expect(links).toContain('/system-config/payment-gateways');
    expect(links).toContain('/system-config/tenant-integrations');
    expect(links).toContain('/audit-logs');
    expect(links).toContain('/legal-documents');
  });

  it('dashboard remains accessible even when no permissions are loaded', () => {
    const fixture = setup([]);

    expect(hrefs(fixture)).toContain('/');
  });

  it('hides sidebar links the user lacks permission for once permissions are loaded', () => {
    const fixture = setup(['platform.tenants.read']);
    const links = hrefs(fixture);

    expect(links).toContain('/tenants');
    expect(links).not.toContain('/users');
    expect(links).not.toContain('/roles');
    expect(links).not.toContain('/system-config/providers');
  });

  it('hides a section heading when none of its links are visible', () => {
    const fixture = setup(['platform.tenants.read']);
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Platform');
    expect(text).not.toContain('Access Control');
    expect(text).not.toContain('System Config');
  });

  it('renders the sidebar on desktop without an off-canvas backdrop', () => {
    const fixture = setup();

    expect(fixture.debugElement.query(By.css('aside'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[role="button"][aria-label="Close navigation menu"]'))).toBeNull();
  });

  it('shows a backdrop when the mobile nav is open', () => {
    const fixture = setup();
    const mobileNav = TestBed.inject(MobileNavService);

    mobileNav.open.set(true);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[role="button"][aria-label="Close navigation menu"]'))).toBeTruthy();
  });

  it('closes the mobile nav when the backdrop is clicked', () => {
    const fixture = setup();
    const mobileNav = TestBed.inject(MobileNavService);
    mobileNav.open.set(true);
    fixture.detectChanges();

    const backdrop = fixture.debugElement.query(By.css('[role="button"][aria-label="Close navigation menu"]'));
    backdrop.nativeElement.click();

    expect(mobileNav.open()).toBe(false);
  });

  it('closes the mobile nav on Escape', () => {
    const fixture = setup();
    const mobileNav = TestBed.inject(MobileNavService);
    mobileNav.open.set(true);
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(mobileNav.open()).toBe(false);
  });

  it('closes the mobile nav when a nav link is clicked', () => {
    const fixture = setup();
    const mobileNav = TestBed.inject(MobileNavService);
    mobileNav.open.set(true);
    fixture.detectChanges();

    const link = fixture.debugElement.query(By.css('a[data-sidebar-item]'));
    link.nativeElement.click();

    expect(mobileNav.open()).toBe(false);
  });
});
