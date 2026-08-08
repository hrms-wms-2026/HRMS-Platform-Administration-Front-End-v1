import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { TenantsList } from './tenants-list';
import { TenantsService } from '../../data/tenants.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';

describe('TenantsList', () => {
  let tenantsService: { list: jest.Mock };

  function setup(permissions: string[] = ['platform.tenants.read']) {
    tenantsService = { list: jest.fn() };

    TestBed.configureTestingModule({
      imports: [TenantsList],
      providers: [provideRouter([]), { provide: TenantsService, useValue: tenantsService }],
    }).compileComponents();

    const fixture = TestBed.createComponent(TenantsList);
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
    return fixture;
  }

  it('does not call the API and shows the no-permission message when unauthorized', () => {
    const fixture = setup([]);
    fixture.detectChanges();

    expect(tenantsService.list).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('No permission to view page');
  });

  it('loads tenants on init when authorized', () => {
    const fixture = setup();
    tenantsService.list.mockReturnValue(
      of({
        items: [{ id: 't1', name: 'Acme', slug: 'acme', status: 'active', createdAt: '2026-01-01T00:00:00Z' }],
        total: 1,
        page: 1,
        pageSize: 20,
      }),
    );
    fixture.detectChanges();

    expect(tenantsService.list).toHaveBeenCalledWith({ search: '', status: '', page: 1, pageSize: 20 });
    expect(fixture.nativeElement.textContent).toContain('Acme');
  });

  it('resets to page 1 and re-queries (debounced) when the search term changes', () => {
    jest.useFakeTimers();
    const fixture = setup();
    tenantsService.list.mockReturnValue(of({ items: [], total: 0, page: 1, pageSize: 20 }));
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['goToPage'](3);
    component['onSearchChange']('acme');
    expect(component['currentPage']()).toBe(1);

    jest.advanceTimersByTime(300);

    expect(tenantsService.list).toHaveBeenLastCalledWith({
      search: 'acme',
      status: '',
      page: 1,
      pageSize: 20,
    });
    jest.useRealTimers();
  });

  it('hides the Create Tenant link without platform.tenants.manage', () => {
    const fixture = setup(['platform.tenants.read']);
    tenantsService.list.mockReturnValue(of({ items: [], total: 0, page: 1, pageSize: 20 }));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Create Tenant');
  });

  it('shows the Create Tenant link with platform.tenants.manage', () => {
    const fixture = setup(['platform.tenants.read', 'platform.tenants.manage']);
    tenantsService.list.mockReturnValue(of({ items: [], total: 0, page: 1, pageSize: 20 }));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Create Tenant');
  });
});
