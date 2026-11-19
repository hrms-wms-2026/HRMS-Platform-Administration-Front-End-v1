import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TenantIntegrationsService } from '../../data/tenant-integrations.service';
import {
  TenantIntegrationCredential,
  tenantIntegrationStatusLabel,
  tenantIntegrationStatusTone,
} from '../../data/tenant-integration.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { Button } from '../../../../shared/ui/button/button';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { DrawerContentSkeleton } from '../../../../shared/ui/drawer-content-skeleton/drawer-content-skeleton';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';

@Component({
  selector: 'app-tenant-integration-detail-drawer',
  imports: [Button, StatusBadge, DrawerContentSkeleton, ErrorBanner, DatePipe],
  templateUrl: './tenant-integration-detail-drawer.html',
})
export class TenantIntegrationDetailDrawer {
  private readonly tenantIntegrationsService = inject(TenantIntegrationsService);
  protected readonly permissionStore = inject(PermissionStore);

  readonly credentialId = input.required<string>();
  readonly closed = output<void>();
  readonly disconnectRequested = output<TenantIntegrationCredential>();

  protected readonly canManage = computed(() =>
    this.permissionStore.hasPermission('platform.system_config.manage'),
  );

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly credential = signal<TenantIntegrationCredential | null>(null);

  constructor() {
    effect(() => {
      this.loadCredential(this.credentialId());
    });
  }

  protected statusLabel = tenantIntegrationStatusLabel;
  protected statusTone = tenantIntegrationStatusTone;

  protected reload(): void {
    this.loadCredential(this.credentialId());
  }

  protected close(): void {
    this.closed.emit();
  }

  protected requestDisconnect(): void {
    const item = this.credential();
    if (item) {
      this.disconnectRequested.emit(item);
    }
  }

  private loadCredential(id: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.tenantIntegrationsService.getById(id).subscribe({
      next: (credential) => {
        this.credential.set(credential);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Something went wrong. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
