import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { IntegrationCatalogList } from './integration-catalog-list';
import { IntegrationCatalogService } from '../../data/integration-catalog.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';

describe('IntegrationCatalogList', () => {
  let integrationCatalogService: { list: jest.Mock };

  const sampleIntegration = {
    integrationKey: 'github',
    displayName: 'GitHub',
    description: 'Connect GitHub',
    connectionScope: 'user' as const,
    onevoAppProvider: 'github',
    logoUrl: null,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    linkedModuleKeys: ['work_management'],
  };

  function setup(permissions: string[] = ['platform.system_config.read', 'platform.system_config.manage']) {
    integrationCatalogService = { list: jest.fn().mockReturnValue(of([sampleIntegration])) };

    TestBed.configureTestingModule({
      imports: [IntegrationCatalogList],
      providers: [{ provide: IntegrationCatalogService, useValue: integrationCatalogService }],
    }).compileComponents();

    const fixture = TestBed.createComponent(IntegrationCatalogList);
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

  it('does not call the API when unauthorized', () => {
    const fixture = setup([]);
    fixture.detectChanges();

    expect(integrationCatalogService.list).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('No permission to view page');
  });

  it('loads and displays integrations when authorized', () => {
    const fixture = setup();
    fixture.detectChanges();

    expect(integrationCatalogService.list).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('GitHub');
    expect(fixture.nativeElement.textContent).toContain('Integration Catalog');
  });

  it('shows add integration button only for managers', () => {
    const fixture = setup(['platform.system_config.read']);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Add Integration');
  });
});
