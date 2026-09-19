import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TrayReleasesService } from '../../data/tray-releases.service';
import { TrayRelease } from '../../data/tray-release.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';
import { Button } from '../../../../shared/ui/button/button';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { TableSkeleton } from '../../../../shared/ui/table-skeleton/table-skeleton';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { ConfirmationDialog } from '../../../../shared/ui/confirmation-dialog/confirmation-dialog';
import { TrayReleaseFormModal } from '../tray-release-form-modal/tray-release-form-modal';

@Component({
  selector: 'app-tray-releases-list',
  imports: [
    Button,
    StatusBadge,
    TableSkeleton,
    ErrorBanner,
    EmptyState,
    ConfirmationDialog,
    DatePipe,
    TrayReleaseFormModal,
  ],
  templateUrl: './tray-releases-list.html',
})
export class TrayReleasesList implements OnInit {
  private readonly trayReleasesService = inject(TrayReleasesService);
  private readonly notificationService = inject(NotificationService);
  protected readonly permissionStore = inject(PermissionStore);

  protected readonly canView = computed(() => this.permissionStore.hasPermission('platform.system_config.read'));
  protected readonly canManage = computed(() =>
    this.permissionStore.hasPermission('platform.system_config.manage'),
  );

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly releases = signal<TrayRelease[]>([]);
  protected readonly showForm = signal(false);
  protected readonly pendingPromote = signal<TrayRelease | null>(null);

  ngOnInit(): void {
    if (!this.canView()) {
      return;
    }
    this.loadReleases();
  }

  protected loadReleases(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.trayReleasesService.list().subscribe({
      next: (releases) => {
        this.releases.set(releases);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load tray releases.');
        this.loading.set(false);
      },
    });
  }

  protected toggleActive(release: TrayRelease): void {
    const activate = !release.isActive;
    this.trayReleasesService.update(release.id, { isActive: activate }).subscribe({
      next: () => {
        this.notificationService.success(activate ? 'Release activated.' : 'Release deactivated.');
        this.loadReleases();
      },
      error: (error) => {
        this.notificationService.error(
          error.error?.detail ?? `Could not ${activate ? 'activate' : 'deactivate'} ${release.version}.`,
        );
      },
    });
  }

  protected askPromote(release: TrayRelease): void {
    this.pendingPromote.set(release);
  }

  protected cancelPromote(): void {
    this.pendingPromote.set(null);
  }

  protected confirmPromote(): void {
    const release = this.pendingPromote();
    if (!release) {
      return;
    }
    this.pendingPromote.set(null);
    // Promote = move to stable and make it live in one step.
    this.trayReleasesService.update(release.id, { channel: 'stable', isActive: true }).subscribe({
      next: () => {
        this.notificationService.success(`${release.version} promoted to stable.`);
        this.loadReleases();
      },
      error: (error) => {
        this.notificationService.error(
          error.error?.detail ?? `Could not promote ${release.version}. A stable ${release.version} may already exist.`,
        );
      },
    });
  }

  protected openForm(): void {
    this.showForm.set(true);
  }

  protected onFormClosed(): void {
    this.showForm.set(false);
  }

  protected onReleaseCreated(): void {
    this.showForm.set(false);
    this.notificationService.success('Release created.');
    this.loadReleases();
  }

  protected formatSize(bytes: number): string {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
}
