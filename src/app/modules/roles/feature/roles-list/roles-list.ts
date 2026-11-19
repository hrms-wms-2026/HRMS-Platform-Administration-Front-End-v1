import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PlatformRolesService } from '../../data/platform-roles.service';
import { PlatformRole } from '../../data/platform-role.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { TableSkeleton } from '../../../../shared/ui/table-skeleton/table-skeleton';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';

@Component({
  selector: 'app-roles-list',
  imports: [RouterLink, StatusBadge, TableSkeleton, ErrorBanner, EmptyState, DatePipe],
  templateUrl: './roles-list.html',
})
export class RolesList implements OnInit {
  private readonly rolesService = inject(PlatformRolesService);
  protected readonly permissionStore = inject(PermissionStore);

  protected readonly canView = computed(() => this.permissionStore.hasPermission('platform.roles.read'));

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly roles = signal<PlatformRole[]>([]);

  ngOnInit(): void {
    if (!this.canView()) {
      return;
    }
    this.loadRoles();
  }

  protected loadRoles(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.rolesService.listRoles().subscribe({
      next: (roles) => {
        this.roles.set(roles);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Something went wrong. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
