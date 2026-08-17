import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { Breadcrumb } from './breadcrumb';

describe('Breadcrumb', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [Breadcrumb],
      providers: [
        provideRouter([
          { path: '', data: { breadcrumb: { section: 'Platform', page: 'Dashboard' } }, children: [] },
          { path: 'tenants', data: { breadcrumb: { section: 'Platform', page: 'Tenants' } }, children: [] },
          {
            path: 'tenants/:id',
            data: {
              breadcrumb: {
                section: 'Platform',
                parent: { label: 'Tenants', route: '/tenants' },
                page: 'Tenant Details',
              },
            },
            children: [],
          },
          { path: 'settings/mfa', data: { breadcrumb: { page: 'Two-Factor Authentication' } }, children: [] },
          { path: 'access-denied', children: [] },
        ]),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(Breadcrumb);
    const router = TestBed.inject(Router);
    fixture.detectChanges();
    return { fixture, router };
  }

  it('renders section and page for a top-level route with no parent link', async () => {
    const { fixture, router } = setup();
    await router.navigateByUrl('/tenants');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Platform');
    expect(text).toContain('Tenants');
    expect(fixture.debugElement.queryAll(By.css('a')).length).toBe(0);
  });

  it('renders section, a clickable parent link, and the current page for a detail route', async () => {
    const { fixture, router } = setup();
    await router.navigateByUrl('/tenants/abc123');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Platform');
    expect(text).toContain('Tenants');
    expect(text).toContain('Tenant Details');

    const parentLink = fixture.debugElement.query(By.css('a'));
    expect(parentLink.nativeElement.getAttribute('href')).toBe('/tenants');
  });

  it('renders a single segment with no section for a standalone route', async () => {
    const { fixture, router } = setup();
    await router.navigateByUrl('/settings/mfa');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe('Two-Factor Authentication');
  });

  it('renders nothing for a route with no breadcrumb data', async () => {
    const { fixture, router } = setup();
    await router.navigateByUrl('/access-denied');
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('nav'))).toBeNull();
  });
});
