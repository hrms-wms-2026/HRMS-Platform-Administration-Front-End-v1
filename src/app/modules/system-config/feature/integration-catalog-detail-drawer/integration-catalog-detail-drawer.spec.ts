import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { IntegrationCatalogDetailDrawer } from './integration-catalog-detail-drawer';
import { IntegrationCatalogService } from '../../data/integration-catalog.service';
import { OAuthAppsService } from '../../data/oauth-apps.service';
import { ModuleCatalogService } from '../../../module-catalog/data/module-catalog.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';

describe('IntegrationCatalogDetailDrawer', () => {
  const integration = {
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

  let integrationCatalogService: {
    getByKey: jest.Mock;
    update: jest.Mock;
    setActive: jest.Mock;
    linkModule: jest.Mock;
    unlinkModule: jest.Mock;
  };
  let oauthAppsService: { list: jest.Mock };
  let moduleCatalogService: { list: jest.Mock };
  let notificationService: { success: jest.Mock; error: jest.Mock };

  function setup(permissions: string[] = ['platform.system_config.read', 'platform.system_config.manage']) {
    integrationCatalogService = {
      getByKey: jest.fn().mockReturnValue(of(integration)),
      update: jest.fn().mockReturnValue(of({ ...integration, displayName: 'GitHub Updated' })),
      setActive: jest.fn().mockReturnValue(of({ ...integration, isActive: false })),
      linkModule: jest.fn().mockReturnValue(of(undefined)),
      unlinkModule: jest.fn().mockReturnValue(of(undefined)),
    };
    oauthAppsService = {
      list: jest.fn().mockReturnValue(of([{ provider: 'github', displayName: 'GitHub' }])),
    };
    moduleCatalogService = {
      list: jest.fn().mockReturnValue(
        of([
          { moduleKey: 'work_management', displayName: 'Work Management', isActive: true },
          { moduleKey: 'hr', displayName: 'HR', isActive: true },
        ]),
      ),
    };
    notificationService = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [IntegrationCatalogDetailDrawer],
      providers: [
        { provide: IntegrationCatalogService, useValue: integrationCatalogService },
        { provide: OAuthAppsService, useValue: oauthAppsService },
        { provide: ModuleCatalogService, useValue: moduleCatalogService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(IntegrationCatalogDetailDrawer);
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
    fixture.componentRef.setInput('integrationKey', 'github');
    fixture.detectChanges();
    return fixture;
  }

  it('loads integration, oauth providers, and modules on init', () => {
    const fixture = setup();
    expect(integrationCatalogService.getByKey).toHaveBeenCalledWith('github');
    expect(oauthAppsService.list).toHaveBeenCalled();
    expect(moduleCatalogService.list).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('GitHub');
  });

  it('saves updated integration metadata', () => {
    const fixture = setup();
    let updated = false;
    fixture.componentInstance.updated.subscribe(() => (updated = true));

    fixture.componentInstance['form'].patchValue({ displayName: 'GitHub Updated' });
    fixture.componentInstance['save']();

    expect(integrationCatalogService.update).toHaveBeenCalledWith(
      'github',
      expect.objectContaining({ displayName: 'GitHub Updated' }),
    );
    expect(notificationService.success).toHaveBeenCalledWith('Integration updated.');
    expect(updated).toBe(true);
  });

  it('toggles activation status', () => {
    const fixture = setup();
    fixture.componentInstance['toggleActive']();
    expect(integrationCatalogService.setActive).toHaveBeenCalledWith('github', false);
    expect(notificationService.success).toHaveBeenCalledWith('Integration deactivated.');
  });

  it('links and unlinks modules', () => {
    const fixture = setup();
    fixture.componentInstance['linkModule']('hr');
    expect(integrationCatalogService.linkModule).toHaveBeenCalledWith('github', 'hr');

    fixture.componentInstance['unlinkModule']('work_management');
    expect(integrationCatalogService.unlinkModule).toHaveBeenCalledWith('github', 'work_management');
  });

  it('disables the form without manage permission', () => {
    const fixture = setup(['platform.system_config.read']);
    expect(fixture.componentInstance['form'].disabled).toBe(true);
  });

  it('shows backend error detail when save fails', () => {
    const fixture = setup();
    integrationCatalogService.update.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { detail: 'Invalid provider.' } })),
    );

    fixture.componentInstance['form'].patchValue({
      displayName: 'GitHub Updated',
      onevoAppProvider: 'github',
      connectionScope: 'user',
    });
    fixture.componentInstance['save']();

    expect(fixture.componentInstance['errorMessage']()).toBe('Invalid provider.');
  });
});
