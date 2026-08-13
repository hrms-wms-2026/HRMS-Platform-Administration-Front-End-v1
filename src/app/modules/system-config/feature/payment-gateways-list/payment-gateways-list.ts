import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { PaymentGatewaysService } from '../../data/payment-gateways.service';
import { PaymentGatewayConfig } from '../../data/payment-gateway.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';
import { Button } from '../../../../shared/ui/button/button';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { TableSkeleton } from '../../../../shared/ui/table-skeleton/table-skeleton';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { AddPaymentGatewayModal } from '../add-payment-gateway-modal/add-payment-gateway-modal';
import { EditPaymentGatewayModal } from '../edit-payment-gateway-modal/edit-payment-gateway-modal';
import { RotatePaymentGatewayModal } from '../rotate-payment-gateway-modal/rotate-payment-gateway-modal';

@Component({
  selector: 'app-payment-gateways-list',
  imports: [
    Button,
    StatusBadge,
    TableSkeleton,
    ErrorBanner,
    EmptyState,
    AddPaymentGatewayModal,
    EditPaymentGatewayModal,
    RotatePaymentGatewayModal,
    NgTemplateOutlet,
  ],
  templateUrl: './payment-gateways-list.html',
})
export class PaymentGatewaysList implements OnInit {
  private readonly paymentGatewaysService = inject(PaymentGatewaysService);
  private readonly notificationService = inject(NotificationService);
  protected readonly permissionStore = inject(PermissionStore);

  protected readonly canView = computed(() => this.permissionStore.hasPermission('platform.system_config.read'));
  protected readonly canManage = computed(() =>
    this.permissionStore.hasPermission('platform.system_config.manage'),
  );

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly gateways = signal<PaymentGatewayConfig[]>([]);
  protected readonly showAddModal = signal(false);
  protected readonly editingGateway = signal<PaymentGatewayConfig | null>(null);
  protected readonly rotatingGateway = signal<PaymentGatewayConfig | null>(null);
  protected readonly togglingGatewayId = signal<string | null>(null);

  ngOnInit(): void {
    if (!this.canView()) {
      return;
    }
    this.loadGateways();
  }

  protected loadGateways(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.paymentGatewaysService.list().subscribe({
      next: (gateways) => {
        this.gateways.set(gateways);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Something went wrong. Please try again.');
        this.loading.set(false);
      },
    });
  }

  protected openAddModal(): void {
    this.showAddModal.set(true);
  }

  protected onGatewayCreated(): void {
    this.showAddModal.set(false);
    this.notificationService.success('Payment gateway created.');
    this.loadGateways();
  }

  protected onAddModalClosed(): void {
    this.showAddModal.set(false);
  }

  protected openRotateModal(gateway: PaymentGatewayConfig): void {
    this.rotatingGateway.set(gateway);
  }

  protected openEditModal(gateway: PaymentGatewayConfig): void {
    this.editingGateway.set(gateway);
  }

  protected onGatewayUpdated(): void {
    this.editingGateway.set(null);
    this.notificationService.success('Payment gateway updated.');
    this.loadGateways();
  }

  protected onEditModalClosed(): void {
    this.editingGateway.set(null);
  }

  protected toggleActive(gateway: PaymentGatewayConfig): void {
    this.togglingGatewayId.set(gateway.id);
    this.paymentGatewaysService.update(gateway.id, { isActive: !gateway.isActive }).subscribe({
      next: () => {
        this.togglingGatewayId.set(null);
        this.notificationService.success(gateway.isActive ? 'Gateway deactivated.' : 'Gateway activated.');
        this.loadGateways();
      },
      error: (error: { error?: { detail?: string } }) => {
        this.togglingGatewayId.set(null);
        this.notificationService.error(error.error?.detail ?? 'Could not update gateway status.');
      },
    });
  }

  protected isToggling(gatewayId: string): boolean {
    return this.togglingGatewayId() === gatewayId;
  }

  protected onCredentialsRotated(): void {
    this.rotatingGateway.set(null);
    this.notificationService.success('Gateway credentials rotated.');
    this.loadGateways();
  }

  protected onRotateModalClosed(): void {
    this.rotatingGateway.set(null);
  }

  protected formatCountries(gateway: PaymentGatewayConfig): string {
    const activeRoutes = gateway.countryRoutes.filter((route) => route.isActive);
    if (activeRoutes.length === 0) {
      return '—';
    }
    return activeRoutes.map((route) => route.countryCode).join(', ');
  }
}
