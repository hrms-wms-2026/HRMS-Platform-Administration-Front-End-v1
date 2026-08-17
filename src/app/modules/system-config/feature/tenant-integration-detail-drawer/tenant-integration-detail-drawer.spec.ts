import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TenantIntegrationDetailDrawer } from './tenant-integration-detail-drawer';
import { TenantIntegrationsService } from '../../data/tenant-integrations.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { TenantIntegrationCredential } from '../../data/tenant-integration.model';

describe('TenantIntegrationDetailDrawer', () => {
  const credential: TenantIntegrationCredential = {
    id: 'cred-1',
    tenantId: 'tenant-1',
    integrationKey: 'github',
    status: 'connected',
    scopesGranted: ['repo'],
    externalAccountId: 'acct-1',
    externalAccountName: 'Acme Org',
    tokenExpiresAt: null,
    lastSyncAt: null,
    connectedAt: '2026-01-01T00:00:00Z',
    connectedByUserId: 'user-1',
    disconnectedAt: null,
    errorMessage: null,
    hasAccessToken: true,
    hasRefreshToken: true,
  };

  let tenantIntegrationsService: { getById: jest.Mock };

  function setup(permissions: string[] = ['platform.system_config.read', 'platform.system_config.manage']) {
    tenantIntegrationsService = {
      getById: jest.fn().mockReturnValue(of(credential)),
    };

    TestBed.configureTestingModule({
      imports: [TenantIntegrationDetailDrawer],
      providers: [{ provide: TenantIntegrationsService, useValue: tenantIntegrationsService }],
    }).compileComponents();

    const fixture = TestBed.createComponent(TenantIntegrationDetailDrawer);
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
    fixture.componentRef.setInput('credentialId', 'cred-1');
    fixture.detectChanges();
    return fixture;
  }

  it('loads credential details on init', () => {
    const fixture = setup();
    expect(tenantIntegrationsService.getById).toHaveBeenCalledWith('cred-1');
    expect(fixture.nativeElement.textContent).toContain('github');
    expect(fixture.nativeElement.textContent).toContain('Acme Org');
  });

  it('shows an error banner when loading fails', () => {
    const failingService = {
      getById: jest.fn().mockReturnValue(throwError(() => new Error('network'))),
    };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [TenantIntegrationDetailDrawer],
      providers: [{ provide: TenantIntegrationsService, useValue: failingService }],
    }).compileComponents();

    const fixture = TestBed.createComponent(TenantIntegrationDetailDrawer);
    const store = TestBed.inject(PermissionStore);
    store.setAuthorizationContext({
      userId: 'u1',
      email: 'admin@example.com',
      platformRole: 'Platform Super Admin',
      expiresAt: '',
      mfaRequired: false,
      permissions: ['platform.system_config.read', 'platform.system_config.manage'],
      scopes: {},
      entitlements: [],
    });
    fixture.componentRef.setInput('credentialId', 'cred-1');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Something went wrong');
  });

  it('emits disconnectRequested for connected credentials', () => {
    const fixture = setup();
    let requested: TenantIntegrationCredential | undefined;
    fixture.componentInstance.disconnectRequested.subscribe((item) => (requested = item));

    fixture.componentInstance['requestDisconnect']();

    expect(requested?.id).toBe('cred-1');
  });

  it('emits closed when the drawer is dismissed', () => {
    const fixture = setup();
    let closed = false;
    fixture.componentInstance.closed.subscribe(() => (closed = true));

    fixture.componentInstance['close']();

    expect(closed).toBe(true);
  });

  it('reloads credential details from the error banner retry', () => {
    const fixture = setup();
    tenantIntegrationsService.getById.mockClear();

    fixture.componentInstance['reload']();

    expect(tenantIntegrationsService.getById).toHaveBeenCalledWith('cred-1');
  });
});
