import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ModuleCatalogList } from './module-catalog-list';
import { ModuleCatalogService } from '../../data/module-catalog.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';

describe('ModuleCatalogList', () => {
  let moduleCatalogService: { list: jest.Mock };

  function setup(permissions: string[] = ['platform.module_catalog.read']) {
    moduleCatalogService = { list: jest.fn() };

    TestBed.configureTestingModule({
      imports: [ModuleCatalogList],
      providers: [provideRouter([]), { provide: ModuleCatalogService, useValue: moduleCatalogService }],
    }).compileComponents();

    const fixture = TestBed.createComponent(ModuleCatalogList);
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

    expect(moduleCatalogService.list).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('No permission to view page');
  });

  it('loads modules on init when authorized', () => {
    const fixture = setup();
    moduleCatalogService.list.mockReturnValue(
      of([
        {
          moduleKey: 'core-hr',
          name: 'Core HR',
          pillar: 'Organization Administration',
          phase: '1',
          pricingUnit: 'per_employee',
          isActive: true,
        },
      ]),
    );
    fixture.detectChanges();

    expect(moduleCatalogService.list).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Core HR');
  });

  it('shows an empty state when there are no modules', () => {
    const fixture = setup();
    moduleCatalogService.list.mockReturnValue(of([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No modules in the catalog yet');
  });
});
