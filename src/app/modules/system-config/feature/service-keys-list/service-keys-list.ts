import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ServiceKeysService } from '../../data/service-keys.service';
import { ServiceKey } from '../../data/service-key.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';
import { Button } from '../../../../shared/ui/button/button';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { Loader } from '../../../../shared/ui/loader/loader';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { AddServiceKeyModal } from '../add-service-key-modal/add-service-key-modal';

@Component({
  selector: 'app-service-keys-list',
  imports: [Button, StatusBadge, Loader, ErrorBanner, EmptyState, DatePipe, AddServiceKeyModal],
  templateUrl: './service-keys-list.html',
})
export class ServiceKeysList implements OnInit {
  private readonly serviceKeysService = inject(ServiceKeysService);
  private readonly notificationService = inject(NotificationService);
  protected readonly permissionStore = inject(PermissionStore);

  protected readonly canView = computed(() => this.permissionStore.hasPermission('platform.system_config.read'));
  protected readonly canManage = computed(() =>
    this.permissionStore.hasPermission('platform.system_config.manage'),
  );

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly keys = signal<ServiceKey[]>([]);
  protected readonly verifyingKey = signal<string | null>(null);
  protected readonly editingKey = signal<string | null>(null);
  protected readonly editingName = signal('');
  protected readonly showAddModal = signal(false);
  protected readonly rotatingKey = signal<string | null>(null);

  ngOnInit(): void {
    if (!this.canView()) {
      return;
    }
    this.loadKeys();
  }

  protected loadKeys(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.serviceKeysService.list().subscribe({
      next: (keys) => {
        this.keys.set(keys);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Something went wrong. Please try again.');
        this.loading.set(false);
      },
    });
  }

  protected verifyKey(serviceKey: string): void {
    this.verifyingKey.set(serviceKey);
    this.serviceKeysService.verify(serviceKey).subscribe({
      next: (result) => {
        this.verifyingKey.set(null);
        if (result.success) {
          this.notificationService.success(result.message);
        } else {
          this.notificationService.error(result.message);
        }
        this.loadKeys();
      },
      error: () => {
        this.verifyingKey.set(null);
        this.notificationService.error('Could not verify the service key.');
      },
    });
  }

  protected toggleActive(key: ServiceKey): void {
    this.serviceKeysService.setActive(key.serviceKey, !key.isActive).subscribe({
      next: () => {
        this.notificationService.success(key.isActive ? 'Service key deactivated.' : 'Service key activated.');
        this.loadKeys();
      },
      error: (error) => {
        this.notificationService.error(error.error?.detail ?? 'Could not update the service key.');
      },
    });
  }

  protected startEditName(key: ServiceKey): void {
    this.editingKey.set(key.serviceKey);
    this.editingName.set(key.displayName);
  }

  protected cancelEditName(): void {
    this.editingKey.set(null);
  }

  protected saveEditName(serviceKey: string): void {
    const displayName = this.editingName().trim();
    if (!displayName) {
      this.editingKey.set(null);
      return;
    }

    this.serviceKeysService.updateDisplayName(serviceKey, displayName).subscribe({
      next: () => {
        this.editingKey.set(null);
        this.notificationService.success('Display name updated.');
        this.loadKeys();
      },
      error: (error) => {
        this.editingKey.set(null);
        this.notificationService.error(error.error?.detail ?? 'Could not update the display name.');
      },
    });
  }

  protected openAddModal(): void {
    this.showAddModal.set(true);
  }

  protected onAddModalClosed(): void {
    this.showAddModal.set(false);
  }

  protected onServiceKeyCreated(): void {
    this.showAddModal.set(false);
    this.notificationService.success('Service key created.');
    this.loadKeys();
  }

  protected openRotateModal(serviceKey: string): void {
    this.rotatingKey.set(serviceKey);
  }

  protected onRotateModalClosed(): void {
    this.rotatingKey.set(null);
  }

  protected onKeyRotated(): void {
    this.rotatingKey.set(null);
    this.notificationService.success('Service key rotated.');
    this.loadKeys();
  }
}
