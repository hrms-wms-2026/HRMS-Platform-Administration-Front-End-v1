import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { TenantAdminService } from '../../data/tenant-admin.service';
import {
  TenantPermissionCatalogItem,
  TenantRoleDetail,
  TenantRoleSummary,
} from '../../data/tenant-admin.model';
import { Button } from '../../../../shared/ui/button/button';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { TableSkeleton } from '../../../../shared/ui/table-skeleton/table-skeleton';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Modal } from '../../../../shared/ui/modal/modal';
import { CheckboxGridSkeleton } from '../../../../shared/ui/checkbox-grid-skeleton/checkbox-grid-skeleton';

@Component({
  selector: 'app-tenant-roles-panel',
  imports: [
    ReactiveFormsModule,
    DatePipe,
    Button,
    StatusBadge,
    TableSkeleton,
    ErrorBanner,
    EmptyState,
    Modal,
    CheckboxGridSkeleton,
  ],
  templateUrl: './tenant-roles-panel.html',
})
export class TenantRolesPanel implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly tenantAdminService = inject(TenantAdminService);

  readonly tenantId = input.required<string>();
  readonly canManage = input(false);
  readonly refreshed = output<void>();

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly roles = signal<TenantRoleSummary[]>([]);

  protected readonly createOpen = signal(false);
  protected readonly permissionsOpen = signal(false);
  protected readonly creating = signal(false);
  protected readonly savingPermissions = signal(false);
  protected readonly loadingCatalog = signal(false);
  protected readonly catalogError = signal<string | null>(null);
  protected readonly assignablePermissions = signal<TenantPermissionCatalogItem[]>([]);
  protected readonly selectedPermissionIds = signal<Set<string>>(new Set());
  protected readonly createPermissionIds = signal<Set<string>>(new Set());
  protected readonly activeRole = signal<TenantRoleSummary | null>(null);
  protected readonly roleDetailsCache = signal<Map<string, TenantRoleDetail>>(new Map());

  protected readonly permissionGroups = computed(() => this.groupPermissions(this.assignablePermissions()));

  protected readonly createForm = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
  });

  ngOnInit(): void {
    this.loadRoles();
  }

  protected loadRoles(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.tenantAdminService.listRoles(this.tenantId()).subscribe({
      next: (roles) => {
        this.roles.set(roles);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load tenant roles.');
        this.loading.set(false);
      },
    });
  }

  protected openCreate(): void {
    this.createForm.reset({ name: '', description: '' });
    this.createPermissionIds.set(new Set());
    this.createOpen.set(true);
    this.ensureCatalogLoaded();
  }

  protected closeCreate(): void {
    this.createOpen.set(false);
    this.catalogError.set(null);
  }

  protected submitCreate(): void {
    if (this.createForm.invalid || this.creating()) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.creating.set(true);
    const value = this.createForm.getRawValue();

    this.tenantAdminService
      .createRole(this.tenantId(), {
        name: value.name.trim(),
        description: value.description.trim() || undefined,
        permissionIds: Array.from(this.createPermissionIds()),
      })
      .subscribe({
        next: (created) => {
          this.creating.set(false);
          this.createOpen.set(false);
          this.cacheRoleDetail(created);
          this.loadRoles();
          this.refreshed.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.creating.set(false);
          this.catalogError.set(error.error?.detail ?? 'Could not create the tenant role.');
        },
      });
  }

  protected openPermissions(role: TenantRoleSummary): void {
    this.activeRole.set(role);
    this.permissionsOpen.set(true);
    this.catalogError.set(null);
    this.ensureCatalogLoaded(() => {
      const cached = this.roleDetailsCache().get(role.id);
      this.selectedPermissionIds.set(
        new Set(cached?.permissions.map((permission) => permission.id) ?? []),
      );
    });
  }

  protected closePermissions(): void {
    this.permissionsOpen.set(false);
    this.activeRole.set(null);
    this.catalogError.set(null);
  }

  protected toggleCreatePermission(permissionId: string): void {
    this.createPermissionIds.update((current) => this.toggleSet(current, permissionId));
  }

  protected togglePermission(permissionId: string): void {
    this.selectedPermissionIds.update((current) => this.toggleSet(current, permissionId));
  }

  protected savePermissions(): void {
    const role = this.activeRole();
    if (!role || this.savingPermissions()) {
      return;
    }

    this.savingPermissions.set(true);
    this.tenantAdminService
      .assignRolePermissions(this.tenantId(), role.id, Array.from(this.selectedPermissionIds()))
      .subscribe({
        next: (updated) => {
          this.savingPermissions.set(false);
          this.cacheRoleDetail(updated);
          this.permissionsOpen.set(false);
          this.activeRole.set(null);
          this.loadRoles();
          this.refreshed.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.savingPermissions.set(false);
          this.catalogError.set(error.error?.detail ?? 'Could not update role permissions.');
        },
      });
  }

  private ensureCatalogLoaded(onLoaded?: () => void): void {
    if (this.assignablePermissions().length > 0) {
      onLoaded?.();
      return;
    }

    this.loadingCatalog.set(true);
    this.catalogError.set(null);

    this.tenantAdminService.getPermissionCatalog(this.tenantId()).subscribe({
      next: (catalog) => {
        this.assignablePermissions.set(catalog.assignablePermissions);
        this.loadingCatalog.set(false);
        onLoaded?.();
      },
      error: () => {
        this.catalogError.set('Could not load the tenant permission catalog.');
        this.loadingCatalog.set(false);
      },
    });
  }

  private groupPermissions(permissions: TenantPermissionCatalogItem[]) {
    const byModule = new Map<string, TenantPermissionCatalogItem[]>();
    for (const permission of permissions) {
      if (!permission.id || !permission.isAssignable) {
        continue;
      }
      const list = byModule.get(permission.module) ?? [];
      list.push(permission);
      byModule.set(permission.module, list);
    }
    return Array.from(byModule.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([moduleKey, items]) => ({ moduleKey, permissions: items }));
  }

  private toggleSet(current: Set<string>, permissionId: string): Set<string> {
    const next = new Set(current);
    if (next.has(permissionId)) {
      next.delete(permissionId);
    } else {
      next.add(permissionId);
    }
    return next;
  }

  private cacheRoleDetail(role: TenantRoleDetail): void {
    this.roleDetailsCache.update((cache) => {
      const next = new Map(cache);
      next.set(role.id, role);
      return next;
    });
  }
}
