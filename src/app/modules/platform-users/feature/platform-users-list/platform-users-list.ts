import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { PlatformUsersService } from '../../data/platform-users.service';
import { PlatformUser } from '../../data/platform-user.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';
import { Button } from '../../../../shared/ui/button/button';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { Loader } from '../../../../shared/ui/loader/loader';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Pagination } from '../../../../shared/ui/pagination/pagination';
import { InviteManagerModal } from '../invite-manager-modal/invite-manager-modal';
import { UserProfileDrawer } from '../user-profile-drawer/user-profile-drawer';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-platform-users-list',
  imports: [Button, StatusBadge, Loader, ErrorBanner, EmptyState, Pagination, InviteManagerModal, UserProfileDrawer],
  templateUrl: './platform-users-list.html',
})
export class PlatformUsersList implements OnInit {
  private readonly usersService = inject(PlatformUsersService);
  private readonly notificationService = inject(NotificationService);
  protected readonly permissionStore = inject(PermissionStore);

  protected readonly pageSize = PAGE_SIZE;

  protected readonly canView = computed(() => this.permissionStore.hasPermission('platform.accounts.read'));
  protected readonly canInvite = computed(() => this.permissionStore.hasPermission('platform.accounts.manage'));

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly allUsers = signal<PlatformUser[]>([]);
  protected readonly search = signal('');
  protected readonly roleFilter = signal('');
  protected readonly statusFilter = signal<'all' | 'active' | 'inactive'>('all');
  protected readonly currentPage = signal(1);

  protected readonly roleOptions = computed(() => {
    const roles = new Set(this.allUsers().map((u) => u.role).filter((r) => r.length > 0));
    return Array.from(roles).sort();
  });

  protected readonly filteredUsers = computed(() => {
    const search = this.search().trim().toLowerCase();
    const role = this.roleFilter();
    const status = this.statusFilter();

    return this.allUsers().filter((user) => {
      const matchesSearch =
        search.length === 0 ||
        user.fullName.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search);
      const matchesRole = role.length === 0 || user.role === role;
      const matchesStatus = status === 'all' || user.status === status;
      return matchesSearch && matchesRole && matchesStatus;
    });
  });

  protected readonly pagedUsers = computed(() => {
    const start = (this.currentPage() - 1) * PAGE_SIZE;
    return this.filteredUsers().slice(start, start + PAGE_SIZE);
  });

  ngOnInit(): void {
    if (!this.canView()) {
      return;
    }
    this.loadUsers();
  }

  protected onSearchChange(value: string): void {
    this.search.set(value);
    this.currentPage.set(1);
  }

  protected onRoleFilterChange(value: string): void {
    this.roleFilter.set(value);
    this.currentPage.set(1);
  }

  protected onStatusFilterChange(value: 'all' | 'active' | 'inactive'): void {
    this.statusFilter.set(value);
    this.currentPage.set(1);
  }

  protected goToPage(page: number): void {
    this.currentPage.set(page);
  }

  protected readonly showInviteModal = signal(false);

  protected onInviteManagerClicked(): void {
    this.showInviteModal.set(true);
  }

  protected onInviteModalClosed(): void {
    this.showInviteModal.set(false);
  }

  protected onInviteSuccess(): void {
    this.showInviteModal.set(false);
    this.notificationService.success('Invitation sent.');
    this.loadUsers();
  }

  protected revokeInvite(userId: string): void {
    this.usersService.revokeInvite(userId).subscribe({
      next: () => {
        this.notificationService.success('Invitation revoked.');
        this.loadUsers();
      },
      error: () => this.notificationService.error('Could not revoke the invitation.'),
    });
  }

  protected readonly selectedUserId = signal<string | null>(null);

  protected openProfile(userId: string): void {
    this.selectedUserId.set(userId);
  }

  protected closeProfile(): void {
    this.selectedUserId.set(null);
  }

  protected onProfileUpdated(): void {
    this.loadUsers();
  }

  protected initials(fullName: string): string {
    return fullName
      .split(' ')
      .filter((part) => part.length > 0)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');
  }

  protected loadUsers(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.usersService.list().subscribe({
      next: (users) => {
        this.allUsers.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Something went wrong. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
