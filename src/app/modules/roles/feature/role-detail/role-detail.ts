import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { PlatformRolesService } from '../../data/platform-roles.service';
import { PlatformPermission, PlatformRoleDetail } from '../../data/platform-role.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';
import { Button } from '../../../../shared/ui/button/button';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { Loader } from '../../../../shared/ui/loader/loader';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';

interface PermissionGroup {
  moduleKey: string;
  permissions: PlatformPermission[];
}

@Component({
  selector: 'app-role-detail',
  imports: [Button, StatusBadge, Loader, ErrorBanner],
  templateUrl: './role-detail.html',
})
export class RoleDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly rolesService = inject(PlatformRolesService);
  private readonly notificationService = inject(NotificationService);
  protected readonly permissionStore = inject(PermissionStore);

  private readonly roleId = this.route.snapshot.paramMap.get('id')!;

  protected readonly canManage = computed(() => this.permissionStore.hasPermission('platform.roles.manage'));

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly role = signal<PlatformRoleDetail | null>(null);
  protected readonly allPermissions = signal<PlatformPermission[]>([]);
  protected readonly checkedCodes = signal<Set<string>>(new Set());

  protected readonly groups = computed<PermissionGroup[]>(() => {
    const byModule = new Map<string, PlatformPermission[]>();
    for (const permission of this.allPermissions()) {
      const list = byModule.get(permission.moduleKey) ?? [];
      list.push(permission);
      byModule.set(permission.moduleKey, list);
    }
    return Array.from(byModule.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([moduleKey, permissions]) => ({ moduleKey, permissions }));
  });

  protected readonly hasChanges = computed(() => {
    const original = new Set(this.role()?.permissions ?? []);
    const current = this.checkedCodes();
    if (original.size !== current.size) {
      return true;
    }
    for (const code of original) {
      if (!current.has(code)) {
        return true;
      }
    }
    return false;
  });

  ngOnInit(): void {
    this.loadRole();
  }

  protected loadRole(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.rolesService.getRoleById(this.roleId).subscribe({
      next: (role) => {
        this.role.set(role);
        this.checkedCodes.set(new Set(role.permissions));
        this.loadPermissionCatalog();
      },
      error: () => {
        this.errorMessage.set('Something went wrong. Please try again.');
        this.loading.set(false);
      },
    });
  }

  private loadPermissionCatalog(): void {
    this.rolesService.listPermissions().subscribe({
      next: (permissions) => {
        this.allPermissions.set(permissions);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Something went wrong. Please try again.');
        this.loading.set(false);
      },
    });
  }

  protected toggle(code: string): void {
    const next = new Set(this.checkedCodes());
    if (next.has(code)) {
      next.delete(code);
    } else {
      next.add(code);
    }
    this.checkedCodes.set(next);
  }

  protected save(): void {
    this.saving.set(true);

    this.rolesService.updateRolePermissions(this.roleId, Array.from(this.checkedCodes())).subscribe({
      next: () => {
        this.saving.set(false);
        this.notificationService.success('Role permissions updated.');
        this.loadRole();
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.notificationService.error(error.error?.detail ?? 'Could not update the role permissions.');
      },
    });
  }
}
