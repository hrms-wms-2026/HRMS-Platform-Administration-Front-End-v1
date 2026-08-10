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

  it('renders the ONEXSO logo icon and wordmark', () => {
    const fixture = setup();
    const images = fixture.debugElement.queryAll(By.css('img'));
    const srcs = images.map((img) => img.nativeElement.getAttribute('src'));

    expect(srcs).toContain('onexso-logo-icon.svg');
    expect(srcs).toContain('onexso-logo-text.svg');
  });

  it('renders a Platform section label', () => {
    const fixture = setup();
    expect(fixture.nativeElement.textContent).toContain('Platform');
  });

  it('renders all sidebar items as real navigable links', () => {
    const fixture = setup();
    const links = fixture.debugElement.queryAll(By.css('a'));
    const hrefs = links.map((link) => link.nativeElement.getAttribute('href'));

    expect(hrefs).toContain('/');
    expect(hrefs).toContain('/tenants');
    expect(hrefs).toContain('/users');
    expect(hrefs).toContain('/roles');
    expect(hrefs).toContain('/subscription-plans');
    expect(hrefs).toContain('/audit-logs');
    expect(hrefs).toContain('/system-config/service-keys');
  });
});
