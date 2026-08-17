import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AuditLogsService } from '../../data/audit-logs.service';
import { AuditLogEntry } from '../../data/audit-log.model';
import {
  AUDIT_LOG_DATE_RANGE_OPTIONS,
  AUDIT_LOG_EVENT_TYPE_OPTIONS,
  AUDIT_LOG_QUICK_CHIPS,
  ActiveAuditFilterChip,
  AuditDateRange,
  AuditQuickChip,
  auditLogDateRangeLabel,
  auditLogEventLabel,
  auditLogEventTone,
  auditLogUserPrimary,
  auditLogUserSecondary,
  isQuickChipActive,
  resolveAuditDateRange,
} from '../../data/audit-log-options';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { TableSkeleton } from '../../../../shared/ui/table-skeleton/table-skeleton';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { Button } from '../../../../shared/ui/button/button';
import { Pagination } from '../../../../shared/ui/pagination/pagination';

const PAGE_SIZE = 25;

@Component({
  selector: 'app-audit-logs-list',
  imports: [TableSkeleton, ErrorBanner, EmptyState, DatePipe, StatusBadge, Button, Pagination],
  templateUrl: './audit-logs-list.html',
})
export class AuditLogsList implements OnInit {
  private readonly auditLogsService = inject(AuditLogsService);
  protected readonly permissionStore = inject(PermissionStore);

  protected readonly canView = computed(() => this.permissionStore.hasPermission('platform.audit.read'));
  protected readonly eventTypeOptions = AUDIT_LOG_EVENT_TYPE_OPTIONS;
  protected readonly dateRangeOptions = AUDIT_LOG_DATE_RANGE_OPTIONS;
  protected readonly quickChips = AUDIT_LOG_QUICK_CHIPS;
  protected readonly eventLabel = auditLogEventLabel;
  protected readonly eventTone = auditLogEventTone;
  protected readonly userPrimary = auditLogUserPrimary;
  protected readonly userSecondary = auditLogUserSecondary;
  protected readonly isQuickChipActive = isQuickChipActive;
  protected readonly pageSize = PAGE_SIZE;

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly allEvents = signal<AuditLogEntry[]>([]);
  protected readonly currentPage = signal(1);

  protected readonly searchDraft = signal('');
  protected readonly eventTypeDraft = signal('');
  protected readonly dateRangeDraft = signal<AuditDateRange>('');

  protected readonly search = signal('');
  protected readonly eventTypeFilter = signal('');
  protected readonly dateRangeFilter = signal<AuditDateRange>('');

  protected readonly hasActiveFilters = computed(
    () =>
      this.search().trim().length > 0 ||
      this.eventTypeFilter().length > 0 ||
      this.dateRangeFilter().length > 0,
  );

  protected readonly activeFilterChips = computed((): ActiveAuditFilterChip[] => {
    const chips: ActiveAuditFilterChip[] = [];
    const search = this.search().trim();

    if (search.length > 0) {
      chips.push({ id: 'search', label: `Search: ${search}` });
    }

    const eventType = this.eventTypeFilter();
    if (eventType.length > 0) {
      chips.push({ id: 'eventType', label: auditLogEventLabel(eventType) });
    }

    const dateRange = this.dateRangeFilter();
    if (dateRange.length > 0) {
      chips.push({ id: 'dateRange', label: auditLogDateRangeLabel(dateRange) });
    }

    return chips;
  });

  protected readonly filteredEvents = computed(() => {
    const search = this.search().trim().toLowerCase();
    const eventType = this.eventTypeFilter();
    const { from, to } = resolveAuditDateRange(this.dateRangeFilter());

    return this.allEvents().filter((event) => {
      const matchesSearch =
        search.length === 0 ||
        (event.userId?.toLowerCase().includes(search) ?? false) ||
        (event.userEmail?.toLowerCase().includes(search) ?? false) ||
        (event.userFullName?.toLowerCase().includes(search) ?? false) ||
        (event.sourceIp?.toLowerCase().includes(search) ?? false) ||
        (event.userAgent?.toLowerCase().includes(search) ?? false);

      const matchesEventType = eventType.length === 0 || event.eventType === eventType;

      const createdAt = new Date(event.createdAt);
      const matchesFrom = from === null || createdAt >= from;
      const matchesTo = to === null || createdAt <= to;

      return matchesSearch && matchesEventType && matchesFrom && matchesTo;
    });
  });

  protected readonly pagedEvents = computed(() => {
    const start = (this.currentPage() - 1) * PAGE_SIZE;
    return this.filteredEvents().slice(start, start + PAGE_SIZE);
  });

  ngOnInit(): void {
    if (!this.canView()) {
      return;
    }
    this.loadEvents();
  }

  protected onSearchDraftChange(value: string): void {
    this.searchDraft.set(value);
  }

  protected onEventTypeDraftChange(value: string): void {
    this.eventTypeDraft.set(value);
  }

  protected onDateRangeDraftChange(value: string): void {
    this.dateRangeDraft.set(value as AuditDateRange);
  }

  protected applyFilters(): void {
    this.search.set(this.searchDraft().trim());
    this.eventTypeFilter.set(this.eventTypeDraft());
    this.dateRangeFilter.set(this.dateRangeDraft());
    this.currentPage.set(1);
  }

  protected resetFilters(): void {
    this.searchDraft.set('');
    this.eventTypeDraft.set('');
    this.dateRangeDraft.set('');
    this.search.set('');
    this.eventTypeFilter.set('');
    this.dateRangeFilter.set('');
    this.currentPage.set(1);
  }

  protected applyQuickChip(chip: AuditQuickChip): void {
    this.searchDraft.set('');
    this.eventTypeDraft.set(chip.eventType);
    this.dateRangeDraft.set(chip.dateRange);
    this.search.set('');
    this.eventTypeFilter.set(chip.eventType);
    this.dateRangeFilter.set(chip.dateRange);
    this.currentPage.set(1);
  }

  protected removeActiveFilterChip(chipId: string): void {
    if (chipId === 'search') {
      this.searchDraft.set('');
      this.search.set('');
    } else if (chipId === 'eventType') {
      this.eventTypeDraft.set('');
      this.eventTypeFilter.set('');
    } else if (chipId === 'dateRange') {
      this.dateRangeDraft.set('');
      this.dateRangeFilter.set('');
    }

    this.currentPage.set(1);
  }

  protected goToPage(page: number): void {
    this.currentPage.set(page);
  }

  protected loadEvents(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.auditLogsService.list().subscribe({
      next: (events) => {
        this.allEvents.set(events);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Something went wrong. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
