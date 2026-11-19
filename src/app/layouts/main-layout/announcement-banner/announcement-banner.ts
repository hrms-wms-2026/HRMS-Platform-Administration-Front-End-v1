import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  ActiveAnnouncement,
  ActiveAnnouncementsService,
} from '../../../modules/support/data/active-announcements.service';

/**
 * Shows published platform announcements at the top of the admin console. Dismissing hides an
 * announcement for the rest of this page session only (kept in memory, never in browser storage).
 */
@Component({
  selector: 'app-announcement-banner',
  templateUrl: './announcement-banner.html',
})
export class AnnouncementBanner implements OnInit {
  private readonly announcementsService = inject(ActiveAnnouncementsService);

  private readonly announcements = signal<ActiveAnnouncement[]>([]);
  private readonly dismissed = signal<ReadonlySet<string>>(new Set());

  protected readonly visible = computed(() =>
    this.announcements().filter((announcement) => !this.dismissed().has(announcement.id)),
  );

  ngOnInit(): void {
    this.announcementsService.list().subscribe({
      next: (items) => this.announcements.set(items),
      // A banner is never worth an error message: show nothing if the feed fails.
      error: () => this.announcements.set([]),
    });
  }

  protected dismiss(id: string): void {
    this.dismissed.update((current) => new Set([...current, id]));
  }

  protected toneClasses(severity: ActiveAnnouncement['severity']): string {
    switch (severity) {
      case 'critical':
        return 'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/50 dark:text-red-100';
      case 'warning':
        return 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100';
      case 'info':
      default:
        return 'border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-100';
    }
  }
}
