import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { TenantIntegrationsService } from '../../data/tenant-integrations.service';
import {
  TenantIntegrationCredential,
  tenantIntegrationStatusLabel,
  tenantIntegrationStatusTone,
} from '../../data/tenant-integration.model';
import { TenantsService } from '../../../tenants/data/tenants.service';
import { TenantListItem } from '../../../tenants/data/tenant.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';
import { Button } from '../../../../shared/ui/button/button';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { TableSkeleton } from '../../../../shared/ui/table-skeleton/table-skeleton';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { TenantIntegrationDetailDrawer } from '../tenant-integration-detail-drawer/tenant-integration-detail-drawer';
import { DisconnectTenantIntegrationModal } from '../disconnect-tenant-integration-modal/disconnect-tenant-integration-modal';

interface TenantOption {
  id: string;
  name: string;
  slug: string;
}

@Component({
  selector: 'app-tenant-integrations-list',
  imports: [
    FormsModule,
    Button,
    StatusBadge,
    TableSkeleton,
    ErrorBanner,
    EmptyState,
    DatePipe,
    TenantIntegrationDetailDrawer,
    DisconnectTenantIntegrationModal,
  ],
  templateUrl: './tenant-integrations-list.html',
})
export class TenantIntegrationsList implements OnInit {
  private readonly tenantIntegrationsService = inject(TenantIntegrationsService);
  private readonly tenantsService = inject(TenantsService);
  private readonly notificationService = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly permissionStore = inject(PermissionStore);

  protected readonly canView = computed(() => this.permissionStore.hasPermission('platform.system_config.read'));
  protected readonly canManage = computed(() =>
    this.permissionStore.hasPermission('platform.system_config.manage'),
  );

  protected readonly tenantSearch = signal('');
  protected readonly tenants = signal<TenantOption[]>([]);
  protected readonly selectedTenantId = signal<string | null>(null);
  protected readonly loadingTenants = signal(false);
  protected readonly loadingCredentials = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly credentials = signal<TenantIntegrationCredential[]>([]);
  protected readonly selectedCredentialId = signal<string | null>(null);
  protected readonly disconnectingCredential = signal<TenantIntegrationCredential | null>(null);

  protected readonly statusLabel = tenantIntegrationStatusLabel;
  protected readonly statusTone = tenantIntegrationStatusTone;

  private readonly tenantSearchSubject = new Subject<string>();

  ngOnInit(): void {
    if (!this.canView()) {
      return;
    }

    this.tenantSearchSubject.pipe(debounceTime(300), distinctUntilChanged()).subscribe((value) => {
      this.loadTenants(value);
    });

    const tenantIdFromRoute = this.route.snapshot.queryParamMap.get('tenantId');
    this.loadTenants('', tenantIdFromRoute);
  }

  protected onTenantSearchChange(value: string): void {
    this.tenantSearch.set(value);
    this.tenantSearchSubject.next(value);
  }

  protected onTenantSelected(tenantId: string | null): void {
    this.selectedTenantId.set(tenantId);
    this.selectedCredentialId.set(null);
    this.disconnectingCredential.set(null);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tenantId: tenantId ?? null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });

    if (tenantId) {
      this.loadCredentials();
    } else {
      this.credentials.set([]);
      this.errorMessage.set(null);
    }
  }

  protected loadCredentials(): void {
    const tenantId = this.selectedTenantId();
    if (!tenantId) {
      return;
    }

    this.loadingCredentials.set(true);
    this.errorMessage.set(null);

    this.tenantIntegrationsService.listByTenant(tenantId).subscribe({
      next: (credentials) => {
        this.credentials.set(credentials);
        this.loadingCredentials.set(false);
      },
      error: () => {
        this.errorMessage.set('Something went wrong. Please try again.');
        this.loadingCredentials.set(false);
      },
    });
  }

  protected openDrawer(credentialId: string): void {
    this.selectedCredentialId.set(credentialId);
  }

  protected closeDrawer(): void {
    this.selectedCredentialId.set(null);
  }

  protected openDisconnectModal(credential: TenantIntegrationCredential): void {
    this.disconnectingCredential.set(credential);
  }

  protected closeDisconnectModal(): void {
    this.disconnectingCredential.set(null);
  }

  protected onDisconnected(): void {
    this.disconnectingCredential.set(null);
    this.selectedCredentialId.set(null);
    this.notificationService.success('Integration disconnected.');
    this.loadCredentials();
  }

  private loadTenants(searchValue = '', preselectTenantId: string | null = null): void {
    this.loadingTenants.set(true);

    this.tenantsService
      .list({
        search: searchValue,
        status: '',
        page: 1,
        pageSize: 25,
      })
      .subscribe({
        next: (response) => {
          this.tenants.set(
            response.items.map((tenant: TenantListItem) => ({
              id: tenant.id,
              name: tenant.name,
              slug: tenant.slug,
            })),
          );
          this.loadingTenants.set(false);

          if (preselectTenantId && this.selectedTenantId() !== preselectTenantId) {
            const exists = response.items.some((tenant) => tenant.id === preselectTenantId);
            if (exists) {
              this.onTenantSelected(preselectTenantId);
            }
          }
        },
        error: () => {
          this.loadingTenants.set(false);
        },
      });
  }
}
