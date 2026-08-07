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

  it('renders Dashboard and Users as real navigable links', () => {
    const fixture = setup();
    const links = fixture.debugElement.queryAll(By.css('a'));
    const hrefs = links.map((link) => link.nativeElement.getAttribute('href'));

    expect(hrefs).toContain('/');
    expect(hrefs).toContain('/users');
  });

  it('renders Roles & Permissions, Audit Logs, and Settings as non-navigable', () => {
    const fixture = setup();
    const disabledLabels = ['Roles & Permissions', 'Audit Logs', 'Settings'];

    for (const label of disabledLabels) {
      const item = fixture.debugElement
        .queryAll(By.css('[data-sidebar-item]'))
        .find((el) => el.nativeElement.textContent.includes(label));

      expect(item).toBeTruthy();
      expect(item!.nativeElement.querySelector('a')).toBeNull();
    }
  });
});
