import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AnnouncementsService } from '../../data/announcements.service';
import {
  ANNOUNCEMENT_SEVERITY_OPTIONS,
  AUDIENCE_SCOPE_OPTIONS,
  AnnouncementAudienceScope,
  AnnouncementSeverity,
  PlatformAdminScope,
  RecipientScope,
  TenantRoleTarget,
  TenantScope,
} from '../../data/announcement.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { Button } from '../../../../shared/ui/button/button';
import { PlatformRolesService } from '../../../roles/data/platform-roles.service';
import { PlatformRole } from '../../../roles/data/platform-role.model';
import { TenantsService } from '../../../tenants/data/tenants.service';
import { TenantListItem } from '../../../tenants/data/tenant.model';
import { TenantAdminService } from '../../../tenants/data/tenant-admin.service';
import { TenantRoleSummary } from '../../../tenants/data/tenant-admin.model';

@Component({
  selector: 'app-announcement-create',
  imports: [ReactiveFormsModule, Button],
  templateUrl: './announcement-create.html',
})
export class AnnouncementCreate {
  private readonly announcementsService = inject(AnnouncementsService);
  private readonly platformRolesService = inject(PlatformRolesService);
  private readonly tenantsService = inject(TenantsService);
  private readonly tenantAdminService = inject(TenantAdminService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly severityOptions = ANNOUNCEMENT_SEVERITY_OPTIONS;
  protected readonly audienceScopeOptions = AUDIENCE_SCOPE_OPTIONS;
  protected readonly saving = signal(false);

  protected readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    body: ['', [Validators.required]],
    severity: ['info' as AnnouncementSeverity, [Validators.required]],
  });

  protected readonly audienceScope = signal<AnnouncementAudienceScope>('platform_wide');

  protected readonly platformAdminScope = signal<PlatformAdminScope>('all');
  protected readonly platformRoles = signal<PlatformRole[]>([]);
  protected readonly platformRolesLoading = signal(false);
  protected readonly selectedPlatformRoleIds = signal<Set<string>>(new Set());

  protected readonly tenantScope = signal<TenantScope>('all_tenants');
  protected readonly allTenants = signal<TenantListItem[]>([]);
  protected readonly tenantsLoading = signal(false);
  protected readonly selectedTenantIds = signal<Set<string>>(new Set());

  protected readonly recipientScope = signal<RecipientScope>('all_users');
  protected readonly rolesByTenant = signal<Map<string, TenantRoleSummary[]>>(new Map());
  protected readonly tenantRolesLoading = signal<Set<string>>(new Set());
  protected readonly selectedTenantRoleTargets = signal<TenantRoleTarget[]>([]);

  protected readonly selectedTenants = computed(() =>
    this.allTenants().filter((t) => this.selectedTenantIds().has(t.id)),
  );

  protected onAudienceScopeChange(value: string): void {
    this.audienceScope.set(value as AnnouncementAudienceScope);
    if (value === 'platform_admins' && this.platformRoles().length === 0) {
      this.loadPlatformRoles();
    }
    if (value === 'tenant_users' && this.allTenants().length === 0) {
      this.loadTenants();
    }
  }

  protected onPlatformAdminScopeChange(value: string): void {
    this.platformAdminScope.set(value as PlatformAdminScope);
    if (value === 'selected_roles' && this.platformRoles().length === 0) {
      this.loadPlatformRoles();
    }
  }

  protected togglePlatformRole(roleId: string): void {
    const next = new Set(this.selectedPlatformRoleIds());
    if (next.has(roleId)) {
      next.delete(roleId);
    } else {
      next.add(roleId);
    }
    this.selectedPlatformRoleIds.set(next);
  }

  protected onTenantScopeChange(value: string): void {
    this.tenantScope.set(value as TenantScope);
    if (value === 'all_tenants') {
      // Role refinement always needs a concrete tenant to resolve roles against, so it only
      // applies once specific tenants are chosen - collapse back to "all users" here.
      this.recipientScope.set('all_users');
      this.selectedTenantRoleTargets.set([]);
    }
  }

  protected toggleSelectedTenant(tenantId: string): void {
    const next = new Set(this.selectedTenantIds());
    if (next.has(tenantId)) {
      next.delete(tenantId);
      this.selectedTenantRoleTargets.set(
        this.selectedTenantRoleTargets().filter((t) => t.tenantId !== tenantId),
      );
    } else {
      next.add(tenantId);
      if (this.recipientScope() === 'selected_roles') {
        this.loadRolesForTenant(tenantId);
      }
    }
    this.selectedTenantIds.set(next);
  }

  protected onRecipientScopeChange(value: string): void {
    this.recipientScope.set(value as RecipientScope);
    if (value === 'selected_roles') {
      for (const tenantId of this.selectedTenantIds()) {
        this.loadRolesForTenant(tenantId);
      }
    }
  }

  protected isTenantRoleSelected(tenantId: string, roleId: string): boolean {
    return this.selectedTenantRoleTargets().some((t) => t.tenantId === tenantId && t.roleId === roleId);
  }

  protected toggleTenantRole(tenantId: string, roleId: string): void {
    const current = this.selectedTenantRoleTargets();
    const exists = current.some((t) => t.tenantId === tenantId && t.roleId === roleId);
    this.selectedTenantRoleTargets.set(
      exists
        ? current.filter((t) => !(t.tenantId === tenantId && t.roleId === roleId))
        : [...current, { tenantId, roleId }],
    );
  }

  protected rolesForTenant(tenantId: string): TenantRoleSummary[] {
    return this.rolesByTenant().get(tenantId) ?? [];
  }

  protected isLoadingRolesForTenant(tenantId: string): boolean {
    return this.tenantRolesLoading().has(tenantId);
  }

  private loadPlatformRoles(): void {
    this.platformRolesLoading.set(true);
    this.platformRolesService.listRoles().subscribe({
      next: (roles) => {
        this.platformRoles.set(roles);
        this.platformRolesLoading.set(false);
      },
      error: () => {
        this.platformRolesLoading.set(false);
        this.notificationService.error('Could not load platform roles.');
      },
    });
  }

  private loadTenants(): void {
    this.tenantsLoading.set(true);
    this.tenantsService.list({ search: '', status: '', page: 1, pageSize: 200 }).subscribe({
      next: (response) => {
        this.allTenants.set(response.items);
        this.tenantsLoading.set(false);
      },
      error: () => {
        this.tenantsLoading.set(false);
        this.notificationService.error('Could not load tenants.');
      },
    });
  }

  private loadRolesForTenant(tenantId: string): void {
    if (this.rolesByTenant().has(tenantId) || this.tenantRolesLoading().has(tenantId)) {
      return;
    }
    const loading = new Set(this.tenantRolesLoading());
    loading.add(tenantId);
    this.tenantRolesLoading.set(loading);

    this.tenantAdminService.listRoles(tenantId).subscribe({
      next: (roles) => {
        const next = new Map(this.rolesByTenant());
        next.set(tenantId, roles);
        this.rolesByTenant.set(next);
        const stillLoading = new Set(this.tenantRolesLoading());
        stillLoading.delete(tenantId);
        this.tenantRolesLoading.set(stillLoading);
      },
      error: () => {
        const stillLoading = new Set(this.tenantRolesLoading());
        stillLoading.delete(tenantId);
        this.tenantRolesLoading.set(stillLoading);
        this.notificationService.error('Could not load roles for one of the selected tenants.');
      },
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const scope = this.audienceScope();
    if (scope === 'platform_admins' && this.platformAdminScope() === 'selected_roles'
      && this.selectedPlatformRoleIds().size === 0) {
      this.notificationService.error('Select at least one platform role.');
      return;
    }
    if (scope === 'tenant_users' && this.tenantScope() === 'selected_tenants'
      && this.selectedTenantIds().size === 0) {
      this.notificationService.error('Select at least one tenant.');
      return;
    }
    if (scope === 'tenant_users' && this.recipientScope() === 'selected_roles'
      && this.selectedTenantRoleTargets().length === 0) {
      this.notificationService.error('Select at least one role.');
      return;
    }

    this.saving.set(true);

    const { title, body, severity } = this.form.getRawValue();
    this.announcementsService
      .create({
        title,
        body,
        severity,
        audienceScope: scope,
        platformAdminScope: scope === 'platform_admins' ? this.platformAdminScope() : undefined,
        platformRoleIds:
          scope === 'platform_admins' && this.platformAdminScope() === 'selected_roles'
            ? Array.from(this.selectedPlatformRoleIds())
            : undefined,
        tenantScope: scope === 'tenant_users' ? this.tenantScope() : undefined,
        tenantIds:
          scope === 'tenant_users' && this.tenantScope() === 'selected_tenants'
            ? Array.from(this.selectedTenantIds())
            : undefined,
        recipientScope: scope === 'tenant_users' ? this.recipientScope() : undefined,
        tenantRoleTargets:
          scope === 'tenant_users' && this.recipientScope() === 'selected_roles'
            ? this.selectedTenantRoleTargets()
            : undefined,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.notificationService.success('Announcement created.');
          this.router.navigateByUrl('/support/announcements');
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          this.notificationService.error(error.error?.detail ?? 'Could not create the announcement.');
        },
      });
  }
}
