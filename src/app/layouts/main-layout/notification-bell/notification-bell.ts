import { Component, ElementRef, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PlatformNotificationsService } from '../../../modules/notifications/data/platform-notifications.service';
import { PlatformNotification } from '../../../modules/notifications/data/platform-notification.model';

const UNREAD_COUNT_POLL_MS = 60_000;

@Component({
  selector: 'app-notification-bell',
  imports: [DatePipe],
  templateUrl: './notification-bell.html',
})
export class NotificationBell implements OnInit, OnDestroy {
  private readonly notifications = inject(PlatformNotificationsService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private pollHandle: ReturnType<typeof setInterval> | null = null;

  protected readonly open = signal(false);
  protected readonly unreadCount = signal(0);
  protected readonly items = signal<PlatformNotification[]>([]);
  protected readonly loading = signal(false);

  ngOnInit(): void {
    this.refreshUnreadCount();
    this.pollHandle = setInterval(() => this.refreshUnreadCount(), UNREAD_COUNT_POLL_MS);
  }

  ngOnDestroy(): void {
    if (this.pollHandle !== null) {
      clearInterval(this.pollHandle);
    }
  }

  protected toggleOpen(): void {
    const next = !this.open();
    this.open.set(next);
    if (next) {
      this.loadNotifications();
    }
  }

  protected closePanel(): void {
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.elementRef.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.open.set(false);
  }

  protected markRead(notification: PlatformNotification): void {
    if (notification.isRead) {
      return;
    }
    this.notifications.markRead(notification.id).subscribe({
      next: () => {
        this.items.update((items) =>
          items.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item)),
        );
        this.refreshUnreadCount();
      },
    });
  }

  protected markAllRead(): void {
    this.notifications.markAllRead().subscribe({
      next: () => {
        this.items.update((items) => items.map((item) => ({ ...item, isRead: true })));
        this.unreadCount.set(0);
      },
    });
  }

  private loadNotifications(): void {
    this.loading.set(true);
    this.notifications.list(false, 1).subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  private refreshUnreadCount(): void {
    this.notifications.unreadCount().subscribe({
      next: (response) => this.unreadCount.set(response.count),
      error: () => {
        // Silent - the bell simply shows no badge if this fails.
      },
    });
  }
}
