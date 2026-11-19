import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { DisconnectTenantIntegrationModal } from './disconnect-tenant-integration-modal';
import { TenantIntegrationsService } from '../../data/tenant-integrations.service';
import { TenantIntegrationCredential } from '../../data/tenant-integration.model';

describe('DisconnectTenantIntegrationModal', () => {
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

  let tenantIntegrationsService: { disconnect: jest.Mock };

  beforeEach(async () => {
    tenantIntegrationsService = {
      disconnect: jest.fn().mockReturnValue(of({ ...credential, status: 'disconnected' })),
    };

    await TestBed.configureTestingModule({
      imports: [DisconnectTenantIntegrationModal],
      providers: [{ provide: TenantIntegrationsService, useValue: tenantIntegrationsService }],
    }).compileComponents();
  });

  function setup() {
    const fixture = TestBed.createComponent(DisconnectTenantIntegrationModal);
    fixture.componentRef.setInput('credential', credential);
    fixture.detectChanges();
    return fixture;
  }

  it('disconnects the credential and emits disconnected', () => {
    const fixture = setup();
    let disconnected = false;
    fixture.componentInstance.disconnected.subscribe(() => (disconnected = true));

    fixture.componentInstance['confirm']();

    expect(tenantIntegrationsService.disconnect).toHaveBeenCalledWith('cred-1');
    expect(disconnected).toBe(true);
  });

  it('surfaces backend error detail on failure', () => {
    tenantIntegrationsService.disconnect.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { detail: 'Already disconnected.' } })),
    );
    const fixture = setup();

    fixture.componentInstance['confirm']();

    expect(fixture.componentInstance['errorMessage']()).toBe('Already disconnected.');
  });

  it('emits closed when cancelled', () => {
    const fixture = setup();
    let closed = false;
    fixture.componentInstance.closed.subscribe(() => (closed = true));

    fixture.componentInstance['cancel']();

    expect(closed).toBe(true);
  });
});
