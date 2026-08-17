import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { JsonPipe } from '@angular/common';
import { ConfigurationTemplatesService } from '../../data/configuration-templates.service';
import { ConfigurationTemplateDetail as ConfigurationTemplateDetailModel, CreateConfigurationTemplateRequest } from '../../data/configuration-template.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';
import { Button } from '../../../../shared/ui/button/button';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { PageDetailSkeleton } from '../../../../shared/ui/page-detail-skeleton/page-detail-skeleton';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { ConfirmationDialog } from '../../../../shared/ui/confirmation-dialog/confirmation-dialog';
import { ConfigurationTemplateForm } from '../configuration-template-form/configuration-template-form';
import { ApplyToTenantModal } from '../apply-to-tenant-modal/apply-to-tenant-modal';

@Component({
  selector: 'app-configuration-template-detail',
  imports: [Button, StatusBadge, PageDetailSkeleton, ErrorBanner, ConfirmationDialog, ConfigurationTemplateForm, ApplyToTenantModal, JsonPipe],
  templateUrl: './configuration-template-detail.html',
})
export class ConfigurationTemplateDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly templatesService = inject(ConfigurationTemplatesService);
  private readonly notificationService = inject(NotificationService);
  protected readonly permissionStore = inject(PermissionStore);

  readonly templateId = this.route.snapshot.paramMap.get('id')!;

  protected readonly canManage = computed(() =>
    this.permissionStore.hasPermission('platform.templates.manage'),
  );

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly detail = signal<ConfigurationTemplateDetailModel | null>(null);
  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected readonly pendingDeactivate = signal(false);
  protected readonly deactivating = signal(false);
  protected readonly applyModalOpen = signal(false);

  ngOnInit(): void {
    this.loadDetail();
  }

  protected loadDetail(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.templatesService.getById(this.templateId).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 404) {
          this.errorMessage.set('Configuration template not found.');
        } else {
          this.errorMessage.set('Something went wrong. Please try again.');
        }
        this.loading.set(false);
      },
    });
  }

  protected startEdit(): void {
    this.editing.set(true);
  }

  protected cancelEdit(): void {
    this.editing.set(false);
  }

  protected saveEdit(value: CreateConfigurationTemplateRequest): void {
    this.saving.set(true);

    const request: {
      name?: string;
      description?: string | null;
      moduleKeys?: string[];
      industryProfileTag?: string | null;
      payloadJson?: Record<string, unknown>;
    } = {
      name: value.name,
      description: value.description,
      moduleKeys: value.moduleKeys,
      industryProfileTag: value.industryProfileTag,
      payloadJson: value.payloadJson,
    };

    this.templatesService.update(this.templateId, request).subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(false);
        this.notificationService.success('Configuration template updated.');
        this.loadDetail();
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.notificationService.error(error.error?.detail ?? 'Could not update the configuration template.');
      },
    });
  }

  protected startDeactivate(): void {
    this.pendingDeactivate.set(true);
  }

  protected cancelDeactivate(): void {
    this.pendingDeactivate.set(false);
  }

  protected confirmDeactivate(): void {
    this.pendingDeactivate.set(false);
    this.deactivating.set(true);

    this.templatesService.deactivate(this.templateId).subscribe({
      next: () => {
        this.deactivating.set(false);
        this.notificationService.success('Configuration template deactivated.');
        this.loadDetail();
      },
      error: () => {
        this.deactivating.set(false);
        this.notificationService.error('Could not deactivate the configuration template.');
      },
    });
  }

  protected cloneTemplate(): void {
    this.templatesService.clone(this.templateId).subscribe({
      next: (cloned) => {
        this.notificationService.success('Configuration template cloned.');
        this.router.navigate(['/configuration-templates', cloned.id]);
      },
      error: (error: HttpErrorResponse) => {
        this.notificationService.error(error.error?.detail ?? 'Could not clone the configuration template.');
      },
    });
  }

  protected openApplyModal(): void {
    this.applyModalOpen.set(true);
  }

  protected closeApplyModal(): void {
    this.applyModalOpen.set(false);
  }

  protected onApplied(): void {
    this.notificationService.success('Template applied to tenant.');
    this.loadDetail();
  }
}