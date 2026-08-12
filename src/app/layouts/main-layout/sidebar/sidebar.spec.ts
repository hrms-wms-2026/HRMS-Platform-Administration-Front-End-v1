import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { Sidebar } from './sidebar';

describe('Sidebar', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();
    return fixture;
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
    const links = fixture.debugElement.queryAll(By.css('a'));
    const hrefs = links.map((link) => link.nativeElement.getAttribute('href'));

    expect(hrefs).toContain('/');
    expect(hrefs).toContain('/tenants');
    expect(hrefs).toContain('/users');
    expect(hrefs).toContain('/roles');
    expect(hrefs).toContain('/subscription-plans');
    expect(hrefs).toContain('/system-config/providers');
    expect(hrefs).toContain('/system-config/service-keys');
    expect(hrefs).toContain('/system-config/oauth-apps');
    expect(hrefs).toContain('/audit-logs');
  });

  it('renders Payment Gateways as non-navigable', () => {
    const fixture = setup();
    const item = fixture.debugElement
      .queryAll(By.css('[data-sidebar-item]'))
      .find((el) => el.nativeElement.textContent.includes('Payment Gateways'));

    expect(item).toBeTruthy();
    expect(item!.nativeElement.querySelector('a')).toBeNull();
    expect(item!.nativeElement.tagName.toLowerCase()).toBe('span');
  });
});
