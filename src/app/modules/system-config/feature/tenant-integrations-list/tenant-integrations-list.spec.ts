import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { TenantIntegrationsList } from './tenant-integrations-list';
import { TenantIntegrationsService } from '../../data/tenant-integrations.service';
import { TenantsService } from '../../../tenants/data/tenants.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';

describe('TenantIntegrationsList', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TenantIntegrationsList],
      providers: [
        provideRouter([]),
        {
          provide: TenantIntegrationsService,
          useValue: {
            listByTenant: jest.fn().mockReturnValue(
              of([
                {
                  id: 'cred-1',
                  tenantId: 'tenant-1',
                  integrationKey: 'github',
                  status: 'connected',
                  scopesGranted: ['repo'],
                  externalAccountId: 'acct-1',
                  externalAccountName: 'Onevo Org',
                  tokenExpiresAt: null,
                  lastSyncAt: null,
                  connectedAt: '2026-01-01T00:00:00Z',
                  connectedByUserId: 'user-1',
                  disconnectedAt: null,
                  errorMessage: null,
                  hasAccessToken: true,
                  hasRefreshToken: true,
                },
              ]),
            ),
          },
        },
        {
          provide: TenantsService,
          useValue: {
            list: jest.fn().mockReturnValue(
              of({
                items: [{ id: 'tenant-1', name: 'Acme Corp', slug: 'acme', status: 'active' }],
                total: 1,
                page: 1,
                pageSize: 25,
              }),
            ),
          },
        },
        {
          provide: PermissionStore,
          useValue: {
            hasPermission: (code: string) =>
              code === 'platform.system_config.read' || code === 'platform.system_config.manage',
          },
        },
        { provide: NotificationService, useValue: { success: jest.fn(), error: jest.fn() } },
      ],
    }).compileComponents();
  });

  it('loads credentials after selecting a tenant', () => {
    const fixture = TestBed.createComponent(TenantIntegrationsList);
    fixture.detectChanges();

    fixture.componentInstance.onTenantSelected('tenant-1');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('github');
    expect(fixture.nativeElement.textContent).toContain('Onevo Org');
  });
});
