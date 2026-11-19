import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { IntegrationCatalogService } from '../../data/integration-catalog.service';
import { IntegrationCatalogEntry } from '../../data/integration-catalog.model';
import { connectionScopeLabel } from '../../data/integration-catalog-options';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { TableSkeleton } from '../../../../shared/ui/table-skeleton/table-skeleton';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { Button } from '../../../../shared/ui/button/button';
import { IntegrationCatalogDetailDrawer } from '../integration-catalog-detail-drawer/integration-catalog-detail-drawer';
import { AddIntegrationModal } from '../add-integration-modal/add-integration-modal';

@Component({
  selector: 'app-integration-catalog-list',
  imports: [
    TableSkeleton,
    ErrorBanner,
    EmptyState,
    StatusBadge,
    Button,
    DatePipe,
    IntegrationCatalogDetailDrawer,
    AddIntegrationModal,
  ],
  templateUrl: './integration-catalog-list.html',
})
export class IntegrationCatalogList implements OnInit {
  private readonly integrationCatalogService = inject(IntegrationCatalogService);
  protected readonly permissionStore = inject(PermissionStore);

  protected readonly canView = computed(() => this.permissionStore.hasPermission('platform.system_config.read'));
  protected readonly canManage = computed(() => this.permissionStore.hasPermission('platform.system_config.manage'));
  protected readonly scopeLabel = connectionScopeLabel;

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly integrations = signal<IntegrationCatalogEntry[]>([]);
  protected readonly selectedKey = signal<string | null>(null);
  protected readonly showAddModal = signal(false);

  ngOnInit(): void {
    if (!this.canView()) {
      return;
    }
    this.loadIntegrations();
  }

  protected loadIntegrations(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.integrationCatalogService.list().subscribe({
      next: (integrations) => {
        this.integrations.set(integrations);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Something went wrong. Please try again.');
        this.loading.set(false);
      },
    });
  }

  protected openDrawer(integrationKey: string): void {
    this.selectedKey.set(integrationKey);
  }

  protected closeDrawer(): void {
    this.selectedKey.set(null);
  }

  protected openAddModal(): void {
    this.showAddModal.set(true);
  }

  protected onIntegrationCreated(): void {
    this.showAddModal.set(false);
    this.loadIntegrations();
  }

  protected onAddModalClosed(): void {
    this.showAddModal.set(false);
  }

  protected onIntegrationUpdated(): void {
    this.loadIntegrations();
  }
}
