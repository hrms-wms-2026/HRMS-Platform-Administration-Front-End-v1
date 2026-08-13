import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { TenantsService } from '../../data/tenants.service';
import { TenantAdminService } from '../../data/tenant-admin.service';
import { TenantDetail as TenantDetailModel, ProvisioningSummary } from '../../data/tenant.model';
import { UpdateTenantPayload } from '../../data/tenant-admin.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';
import { Button, ButtonVariant } from '../../../../shared/ui/button/button';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { PageDetailSkeleton } from '../../../../shared/ui/page-detail-skeleton/page-detail-skeleton';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { ConfirmationDialog } from '../../../../shared/ui/confirmation-dialog/confirmation-dialog';
import { TenantEditForm } from '../tenant-edit-form/tenant-edit-form';
import { TenantInviteAdminModal } from '../tenant-invite-admin-modal/tenant-invite-admin-modal';
import { TenantApplyRoleTemplateModal } from '../tenant-apply-role-template-modal/tenant-apply-role-template-modal';
import { TenantRolesPanel } from '../tenant-roles-panel/tenant-roles-panel';

interface StatusAction {
  action: string;
  label: string;
  confirmVariant: ButtonVariant;
}

const ACTIONS_BY_STATUS: Record<string, StatusAction[]> = {
  provisioning: [{ action: 'cancel', label: 'Cancel', confirmVariant: 'danger' }],
  trial: [
    { action: 'activate', label: 'Activate', confirmVariant: 'indigo' },
    { action: 'suspend', label: 'Suspend', confirmVariant: 'danger' },
  ],
  active: [
    { action: 'suspend', label: 'Suspend', confirmVariant: 'danger' },
    { action: 'cancel', label: 'Cancel', confirmVariant: 'danger' },
  ],
  suspended: [
    { action: 'unsuspend', label: 'Unsuspend', confirmVariant: 'indigo' },
    { action: 'cancel', label: 'Cancel', confirmVariant: 'danger' },
  ],
  cancelled: [],
};

@Component({
  selector: 'app-tenant-detail',
  imports: [
    Button,
    StatusBadge,
    PageDetailSkeleton,
    ErrorBanner,
    ConfirmationDialog,
    TenantEditForm,
    TenantInviteAdminModal,
    TenantApplyRoleTemplateModal,
    TenantRolesPanel,
  ],
  templateUrl: './tenant-detail.html',
})
export class TenantDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly tenantsService = inject(TenantsService);
  private readonly tenantAdminService = inject(TenantAdminService);
  private readonly notificationService = inject(NotificationService);
  protected readonly permissionStore = inject(PermissionStore);

  protected readonly tenantId = this.route.snapshot.paramMap.get('id')!;

  protected readonly canManage = computed(() => this.permissionStore.hasPermission('platform.tenants.manage'));
  protected readonly canRead = computed(() => this.permissionStore.hasPermission('platform.tenants.read'));

  protected readonly loading = signal(false);
  protected readonly savingTenant = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly tenant = signal<TenantDetailModel | null>(null);
  protected readonly provisioningSummary = signal<ProvisioningSummary | null>(null);
  protected readonly pendingActivation = signal(false);
  protected readonly activating = signal(false);
  protected readonly editing = signal(false);
  protected readonly inviteAdminOpen = signal(false);
  protected readonly applyTemplateOpen = signal(false);

  protected readonly isProvisioning = computed(() => this.tenant()?.status === 'provisioning');
  protected readonly canEditDraft = computed(() => this.canManage() && this.isProvisioning());

  protected readonly availableActions = computed<StatusAction[]>(() => {
    if (!this.canManage()) {
      return [];
    }
    const status = this.tenant()?.status ?? '';
    return ACTIONS_BY_STATUS[status] ?? [];
  });

  protected readonly pendingAction = signal<StatusAction | null>(null);
  protected readonly reason = signal('');

  ngOnInit(): void {
    this.loadTenant();
  }

  protected loadTenant(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.editing.set(false);

    this.tenantsService.getById(this.tenantId).subscribe({
      next: (tenant) => {
        this.tenant.set(tenant);
        this.loading.set(false);
        this.loadProvisioningSummaryIfNeeded(tenant);
      },
      error: () => {
        this.errorMessage.set('Something went wrong. Please try again.');
        this.loading.set(false);
      },
    });
  }

  private loadProvisioningSummaryIfNeeded(tenant: TenantDetailModel): void {
    if (tenant.status !== 'provisioning') {
      this.provisioningSummary.set(null);
      return;
    }
    this.tenantsService.getProvisioningSummary(this.tenantId).subscribe({
      next: (summary) => this.provisioningSummary.set(summary),
    });
  }

  protected startEdit(): void {
    this.editing.set(true);
  }

  protected cancelEdit(): void {
    this.editing.set(false);
  }

  protected saveTenant(payload: UpdateTenantPayload): void {
    this.savingTenant.set(true);

    this.tenantAdminService.updateTenant(this.tenantId, payload).subscribe({
      next: () => {
        this.savingTenant.set(false);
        this.editing.set(false);
        this.notificationService.success('Tenant draft updated.');
        this.loadTenant();
      },
      error: (error: HttpErrorResponse) => {
        this.savingTenant.set(false);
        this.notificationService.error(error.error?.detail ?? 'Could not update the tenant.');
      },
    });
  }

  protected openInviteAdmin(): void {
    this.inviteAdminOpen.set(true);
  }

  protected closeInviteAdmin(): void {
    this.inviteAdminOpen.set(false);
  }

  protected onAdminInvited(): void {
    this.notificationService.success('Tenant admin invitation sent.');
    this.loadTenant();
  }

  protected openApplyTemplate(): void {
    this.applyTemplateOpen.set(true);
  }

  protected closeApplyTemplate(): void {
    this.applyTemplateOpen.set(false);
  }

  protected onTemplateApplied(): void {
    this.notificationService.success('Role template applied to tenant.');
    this.loadTenant();
  }

  protected startActivation(): void {
    this.pendingActivation.set(true);
  }

  protected cancelActivation(): void {
    this.pendingActivation.set(false);
  }

  protected confirmActivation(): void {
    this.pendingActivation.set(false);
    this.activating.set(true);

    this.tenantsService.confirmProvisioning(this.tenantId).subscribe({
      next: () => {
        this.activating.set(false);
        this.notificationService.success('Tenant activated.');
        this.loadTenant();
      },
      error: (error: HttpErrorResponse) => {
        this.activating.set(false);
        if (error.status === 422 && error.error) {
          this.provisioningSummary.set(error.error as ProvisioningSummary);
        } else {
          this.notificationService.error('Could not activate the tenant.');
        }
      },
    });
  }

  protected startAction(action: StatusAction): void {
    this.reason.set('');
    this.pendingAction.set(action);
  }

  protected cancelAction(): void {
    this.pendingAction.set(null);
  }

  protected confirmAction(): void {
    const action = this.pendingAction();
    if (!action) {
      return;
    }

    this.tenantsService.changeStatus(this.tenantId, action.action, this.reason() || undefined).subscribe({
      next: () => {
        this.pendingAction.set(null);
        this.notificationService.success('Tenant status updated.');
        this.loadTenant();
      },
      error: () => this.notificationService.error('Could not update the tenant status.'),
    });
  }
}
