import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NotificationTemplatesService } from '../../data/notification-templates.service';
import {
  CHANNEL_LABELS,
  NotificationChannel,
  NotificationEvent,
  NotificationTemplateSummary,
} from '../../data/notification-template.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { TableSkeleton } from '../../../../shared/ui/table-skeleton/table-skeleton';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Button } from '../../../../shared/ui/button/button';

@Component({
  selector: 'app-notification-templates-list',
  imports: [RouterLink, DatePipe, StatusBadge, TableSkeleton, ErrorBanner, EmptyState, Button],
  templateUrl: './notification-templates-list.html',
})
export class NotificationTemplatesList implements OnInit {
  private readonly service = inject(NotificationTemplatesService);
  protected readonly permissionStore = inject(PermissionStore);

  protected readonly canView = computed(() => this.permissionStore.hasPermission('platform.templates.read'));
  protected readonly canManage = computed(() => this.permissionStore.hasPermission('platform.templates.manage'));

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly templates = signal<NotificationTemplateSummary[]>([]);
  protected readonly events = signal<NotificationEvent[]>([]);
  protected readonly eventFilter = signal('');
  protected readonly channelFilter = signal<'' | NotificationChannel>('');
  protected readonly search = signal('');

  protected readonly channelOptions = Object.entries(CHANNEL_LABELS) as [NotificationChannel, string][];

  /** Events offered in the event filter, narrowed by the channel filter. */
  protected readonly visibleEvents = computed(() => {
    const channel = this.channelFilter();
    return channel ? this.events().filter((e) => e.supportedChannels.includes(channel)) : this.events();
  });

  protected readonly eventsByKey = computed(() => new Map(this.events().map((e) => [e.key, e])));

  protected readonly visibleTemplates = computed(() => {
    const allowed = new Set(this.visibleEvents().map((e) => e.key));
    return this.channelFilter() ? this.templates().filter((t) => allowed.has(t.eventKey)) : this.templates();
  });

  ngOnInit(): void {
    if (!this.canView()) return;
    this.service.listEvents().subscribe({ next: (events) => this.events.set(events), error: () => this.events.set([]) });
    this.loadTemplates();
  }

  protected loadTemplates(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.service.list({ eventKey: this.eventFilter() || undefined, search: this.search().trim() || undefined }).subscribe({
      next: (templates) => {
        this.templates.set(templates);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load notification templates. Please try again.');
        this.loading.set(false);
      },
    });
  }

  protected onEventFilter(key: string): void {
    this.eventFilter.set(key);
    this.loadTemplates();
  }

  protected onChannelFilter(channel: string): void {
    this.channelFilter.set(channel as '' | NotificationChannel);
    if (this.eventFilter() && !this.visibleEvents().some((e) => e.key === this.eventFilter())) {
      this.onEventFilter('');
    }
  }

  protected onSearch(value: string): void {
    this.search.set(value);
    this.loadTemplates();
  }

  protected clearFilters(): void {
    this.eventFilter.set('');
    this.channelFilter.set('');
    this.search.set('');
    this.loadTemplates();
  }

  protected eventName(key: string): string {
    return this.eventsByKey().get(key)?.displayName ?? key;
  }

  /** Events no feature raises (seeded copy only); editing them changes nothing anyone receives. */
  protected isNotUsed(key: string): boolean {
    const event = this.eventsByKey().get(key);
    return event !== undefined && !event.customizable;
  }

  protected channels(key: string): string {
    return (this.eventsByKey().get(key)?.supportedChannels ?? []).map((c) => CHANNEL_LABELS[c]).join(', ');
  }
}
