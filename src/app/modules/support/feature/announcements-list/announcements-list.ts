import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AnnouncementsService } from '../../data/announcements.service';
import {
  ANNOUNCEMENT_SEVERITY_OPTIONS,
  AnnouncementSummary,
  announcementAudienceLabel,
  announcementPublishedTone,
  announcementSeverityTone,
} from '../../data/announcement.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { Loader } from '../../../../shared/ui/loader/loader';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Pagination } from '../../../../shared/ui/pagination/pagination';
import { Button } from '../../../../shared/ui/button/button';
import { ConfirmationDialog } from '../../../../shared/ui/confirmation-dialog/confirmation-dialog';

const PAGE_SIZE = 25;

@Component({
  selector: 'app-announcements-list',
  imports: [RouterLink, StatusBadge, Loader, ErrorBanner, EmptyState, Pagination, DatePipe, Button, ConfirmationDialog],
  templateUrl: './announcements-list.html',
})
export class AnnouncementsList implements OnInit {
  private readonly announcementsService = inject(AnnouncementsService);
  private readonly notificationService = inject(NotificationService);
  protected readonly permissionStore = inject(PermissionStore);

  protected readonly pageSize = PAGE_SIZE;
  protected readonly severityOptions = ANNOUNCEMENT_SEVERITY_OPTIONS;

  protected readonly canView = computed(() => this.permissionStore.hasPermission('platform.support.read'));
  protected readonly canManage = computed(() => this.permissionStore.hasPermission('platform.support.manage'));

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly announcements = signal<AnnouncementSummary[]>([]);
  protected readonly total = signal(0);
  protected readonly statusFilter = signal('');
  protected readonly severityFilter = signal('');
  protected readonly currentPage = signal(1);
  protected readonly pendingToggle = signal<AnnouncementSummary | null>(null);
  protected readonly togglingId = signal<string | null>(null);

  protected readonly severityTone = announcementSeverityTone;
  protected readonly publishedTone = announcementPublishedTone;
  protected readonly audienceLabel = announcementAudienceLabel;

  ngOnInit(): void {
    if (!this.canView()) {
      return;
    }
    this.loadAnnouncements();
  }

  protected onStatusFilterChange(value: string): void {
    this.statusFilter.set(value);
    this.currentPage.set(1);
    this.loadAnnouncements();
  }

  protected onSeverityFilterChange(value: string): void {
    this.severityFilter.set(value);
    this.currentPage.set(1);
    this.loadAnnouncements();
  }

  protected goToPage(page: number): void {
    this.currentPage.set(page);
    this.loadAnnouncements();
  }

  protected loadAnnouncements(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const status = this.statusFilter();

    this.announcementsService
      .list({
        isPublished: status === '' ? undefined : status === 'published',
        severity: this.severityFilter(),
        page: this.currentPage(),
        pageSize: PAGE_SIZE,
      })
      .subscribe({
        next: (response) => {
          this.announcements.set(response.items);
          this.total.set(response.total);
          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set('Something went wrong. Please try again.');
          this.loading.set(false);
        },
      });
  }

  protected startToggle(announcement: AnnouncementSummary): void {
    this.pendingToggle.set(announcement);
  }

  protected cancelToggle(): void {
    this.pendingToggle.set(null);
  }

  protected confirmToggle(): void {
    const announcement = this.pendingToggle();
    if (!announcement) {
      return;
    }
    this.pendingToggle.set(null);
    this.togglingId.set(announcement.id);

    const action$ = announcement.isPublished
      ? this.announcementsService.unpublish(announcement.id)
      : this.announcementsService.publish(announcement.id);

    action$.subscribe({
      next: (updated) => {
        this.togglingId.set(null);
        this.notificationService.success(
          updated.isPublished ? 'Announcement published.' : 'Announcement unpublished.',
        );
        this.announcements.update((items) =>
          items.map((item) => (item.id === updated.id ? updated : item)),
        );
      },
      error: (error: HttpErrorResponse) => {
        this.togglingId.set(null);
        this.notificationService.error(error.error?.detail ?? 'Could not update the announcement.');
      },
    });
  }
}
