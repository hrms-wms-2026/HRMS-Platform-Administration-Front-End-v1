import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { RoleTemplatesService } from '../../data/role-templates.service';
import { RoleTemplate } from '../../data/role-template.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { TableSkeleton } from '../../../../shared/ui/table-skeleton/table-skeleton';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { Button } from '../../../../shared/ui/button/button';

@Component({
  selector: 'app-role-templates-list',
  imports: [
    RouterLink,
    TableSkeleton,
    ErrorBanner,
    EmptyState,
    StatusBadge,
    Button,
    DatePipe,
  ],
  templateUrl: './role-templates-list.html',
})
export class RoleTemplatesList implements OnInit {
  private readonly roleTemplatesService = inject(RoleTemplatesService);
  protected readonly permissionStore = inject(PermissionStore);

  protected readonly canView = computed(() => this.permissionStore.hasPermission('platform.templates.read'));
  protected readonly canManage = computed(() => this.permissionStore.hasPermission('platform.templates.manage'));

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly templates = signal<RoleTemplate[]>([]);

  ngOnInit(): void {
    if (!this.canView()) {
      return;
    }
    this.loadTemplates();
  }

  protected loadTemplates(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.roleTemplatesService.list().subscribe({
      next: (templates) => {
        this.templates.set(templates);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Something went wrong. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
