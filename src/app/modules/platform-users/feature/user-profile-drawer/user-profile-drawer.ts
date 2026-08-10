import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { PlatformUsersService } from '../../data/platform-users.service';
import { PlatformUserDetail } from '../../data/platform-user.model';
import { PlatformRoleSummary } from '../../data/platform-role-summary.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';
import { Button } from '../../../../shared/ui/button/button';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { Loader } from '../../../../shared/ui/loader/loader';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  active: 'success',
  pending: 'warning',
  inactive: 'danger',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  pending: 'Pending',
  inactive: 'Inactive',
};

@Component({
  selector: 'app-user-profile-drawer',
  imports: [Button, StatusBadge, Loader, ErrorBanner, DatePipe],
  templateUrl: './user-profile-drawer.html',
})
export class UserProfileDrawer {
  private readonly usersService = inject(PlatformUsersService);
  private readonly notificationService = inject(NotificationService);
  protected readonly permissionStore = inject(PermissionStore);

  readonly userId = input.required<string>();
  readonly closed = output<void>();
  readonly updated = output<void>();

  protected readonly canManageRoles = computed(() => this.permissionStore.hasPermission('platform.roles.manage'));

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly user = signal<PlatformUserDetail | null>(null);
  protected readonly allRoles = signal<PlatformRoleSummary[]>([]);
  protected readonly checkedRoleIds = signal<Set<string>>(new Set());

  protected readonly hasChanges = computed(() => {
    const original = new Set((this.user()?.roles ?? []).map((r) => r.id));
    const current = this.checkedRoleIds();
    if (original.size !== current.size) {
      return true;
    }
    for (const id of original) {
      if (!current.has(id)) {
        return true;
      }
    }
    return false;
  });

  constructor() {
    effect(() => {
      const id = this.userId();
      this.loadUser(id);
    });
  }

  protected toneFor(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
    return STATUS_TONE[status] ?? 'neutral';
  }

  protected labelFor(status: string): string {
    return STATUS_LABEL[status] ?? status;
  }

  protected initials(fullName: string): string {
    return fullName
      .split(' ')
      .filter((part) => part.length > 0)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');
  }

  protected toggleRole(roleId: string): void {
    const next = new Set(this.checkedRoleIds());
    if (next.has(roleId)) {
      next.delete(roleId);
    } else {
      next.add(roleId);
    }
    this.checkedRoleIds.set(next);
  }

  protected save(): void {
    this.saving.set(true);

    this.usersService.updateUserRoles(this.userId(), Array.from(this.checkedRoleIds())).subscribe({
      next: () => {
        this.saving.set(false);
        this.notificationService.success('User roles updated.');
        this.loadUser(this.userId());
        this.updated.emit();
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.notificationService.error(error.error?.detail ?? 'Could not update the user roles.');
      },
    });
  }

  protected close(): void {
    this.closed.emit();
  }

  private loadUser(id: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.usersService.getUserById(id).subscribe({
      next: (user) => {
        this.user.set(user);
        this.checkedRoleIds.set(new Set(user.roles.map((r) => r.id)));
        this.loadRoles();
      },
      error: () => {
        this.errorMessage.set('Something went wrong. Please try again.');
        this.loading.set(false);
      },
    });
  }

  private loadRoles(): void {
    this.usersService.listRoles().subscribe({
      next: (roles) => {
        this.allRoles.set(roles);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Something went wrong. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
