import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { RoleTemplatesService } from '../../data/role-templates.service';
import { RoleTemplate, UpdateRoleTemplatePayload, CreateRoleTemplatePayload } from '../../data/role-template.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';
import { PageDetailSkeleton } from '../../../../shared/ui/page-detail-skeleton/page-detail-skeleton';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { RoleTemplateForm } from '../role-template-form/role-template-form';

@Component({
  selector: 'app-role-template-detail',
  imports: [PageDetailSkeleton, ErrorBanner, StatusBadge, RoleTemplateForm],
  templateUrl: './role-template-detail.html',
})
export class RoleTemplateDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly roleTemplatesService = inject(RoleTemplatesService);
  private readonly notificationService = inject(NotificationService);
  protected readonly permissionStore = inject(PermissionStore);

  private readonly templateId = this.route.snapshot.paramMap.get('id')!;

  protected readonly canManage = computed(() => this.permissionStore.hasPermission('platform.templates.manage'));

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly template = signal<RoleTemplate | null>(null);

  protected readonly readOnly = computed(() => {
    const template = this.template();
    return template?.isSystem === true || !this.canManage();
  });

  ngOnInit(): void {
    this.loadTemplate();
  }

  protected loadTemplate(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.roleTemplatesService.list().subscribe({
      next: (templates) => {
        const match = templates.find((item) => item.id === this.templateId) ?? null;
        if (!match) {
          this.errorMessage.set('Role template not found.');
        } else {
          this.template.set(match);
        }
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Something went wrong. Please try again.');
        this.loading.set(false);
      },
    });
  }

  protected submit(value: CreateRoleTemplatePayload | UpdateRoleTemplatePayload): void {
    this.saving.set(true);

    this.roleTemplatesService.update(this.templateId, value as UpdateRoleTemplatePayload).subscribe({
      next: (updated) => {
        this.template.set(updated);
        this.saving.set(false);
        this.notificationService.success('Role template updated.');
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.notificationService.error(error.error?.detail ?? 'Could not update the role template.');
      },
    });
  }
}
