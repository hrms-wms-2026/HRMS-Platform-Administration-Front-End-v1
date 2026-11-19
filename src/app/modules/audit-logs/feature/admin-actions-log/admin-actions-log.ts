import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AuditLogsService } from '../../data/audit-logs.service';
import { AdminActionLogEntry, AdminActionOutcomeFilter } from '../../data/admin-action-log.model';
import {
  ADMIN_ACTION_AREA_OPTIONS,
  ADMIN_ACTION_OUTCOME_OPTIONS,
  adminActionActorPrimary,
  adminActionActorSecondary,
  adminActionAreaLabel,
  adminActionOutcomeLabel,
  adminActionOutcomeTone,
  adminActionVerbLabel,
  formatAuditState,
} from '../../data/admin-action-log-options';
import { AUDIT_LOG_DATE_RANGE_OPTIONS, AuditDateRange, resolveAuditDateRange } from '../../data/audit-log-options';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { TableSkeleton } from '../../../../shared/ui/table-skeleton/table-skeleton';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { Button } from '../../../../shared/ui/button/button';
import { Pagination } from '../../../../shared/ui/pagination/pagination';

const PAGE_SIZE = 25;

/**
 * Privileged admin actions (security finding F-07): who changed what, when, from where, with the
 * recorded before/after values. Read-only; the backend pages and filters.
 */
@Component({
  selector: 'app-admin-actions-log',
  imports: [TableSkeleton, ErrorBanner, EmptyState, DatePipe, StatusBadge, Button, Pagination],
  templateUrl: './admin-actions-log.html',
})
export class AdminActionsLog implements OnInit {
  private readonly auditLogsService = inject(AuditLogsService);

  protected readonly areaOptions = ADMIN_ACTION_AREA_OPTIONS;
  protected readonly outcomeOptions = ADMIN_ACTION_OUTCOME_OPTIONS;
  protected readonly dateRangeOptions = AUDIT_LOG_DATE_RANGE_OPTIONS;
  protected readonly areaLabel = adminActionAreaLabel;
  protected readonly verbLabel = adminActionVerbLabel;
  protected readonly outcomeTone = adminActionOutcomeTone;
  protected readonly outcomeLabel = adminActionOutcomeLabel;
  protected readonly actorPrimary = adminActionActorPrimary;
  protected readonly actorSecondary = adminActionActorSecondary;
  protected readonly formatState = formatAuditState;
  protected readonly pageSize = PAGE_SIZE;

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly entries = signal<AdminActionLogEntry[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly currentPage = signal(1);
  protected readonly expandedId = signal<string | null>(null);

  protected readonly areaDraft = signal('');
  protected readonly outcomeDraft = signal<AdminActionOutcomeFilter>('');
  protected readonly dateRangeDraft = signal<AuditDateRange>('');

  protected readonly areaFilter = signal('');
  protected readonly outcomeFilter = signal<AdminActionOutcomeFilter>('');
  protected readonly dateRangeFilter = signal<AuditDateRange>('');

  protected readonly hasActiveFilters = computed(
    () => this.areaFilter() !== '' || this.outcomeFilter() !== '' || this.dateRangeFilter() !== '',
  );

  /** Responses for an older request are dropped, so a slow page never overwrites a newer one. */
  private requestSequence = 0;

  ngOnInit(): void {
    this.load();
  }

  protected onAreaDraftChange(value: string): void {
    this.areaDraft.set(value);
  }

  protected onOutcomeDraftChange(value: string): void {
    this.outcomeDraft.set(value as AdminActionOutcomeFilter);
  }

  protected onDateRangeDraftChange(value: string): void {
    this.dateRangeDraft.set(value as AuditDateRange);
  }

  protected applyFilters(): void {
    this.areaFilter.set(this.areaDraft());
    this.outcomeFilter.set(this.outcomeDraft());
    this.dateRangeFilter.set(this.dateRangeDraft());
    this.currentPage.set(1);
    this.load();
  }

  protected resetFilters(): void {
    this.areaDraft.set('');
    this.outcomeDraft.set('');
    this.dateRangeDraft.set('');
    this.areaFilter.set('');
    this.outcomeFilter.set('');
    this.dateRangeFilter.set('');
    this.currentPage.set(1);
    this.load();
  }

  protected goToPage(page: number): void {
    this.currentPage.set(page);
    this.load();
  }

  protected toggleDetails(entry: AdminActionLogEntry): void {
    this.expandedId.set(this.expandedId() === entry.id ? null : entry.id);
  }

  protected load(): void {
    const sequence = ++this.requestSequence;
    const { from, to } = resolveAuditDateRange(this.dateRangeFilter());
    this.loading.set(true);
    this.errorMessage.set(null);
    this.expandedId.set(null);

    this.auditLogsService
      .listAdminActions({
        page: this.currentPage(),
        pageSize: PAGE_SIZE,
        targetType: this.areaFilter() || undefined,
        outcome: this.outcomeFilter(),
        from,
        to,
      })
      .subscribe({
        next: (page) => {
          if (sequence !== this.requestSequence) return;
          this.entries.set(page.items);
          this.totalCount.set(page.totalCount);
          this.loading.set(false);
        },
        error: () => {
          if (sequence !== this.requestSequence) return;
          this.errorMessage.set('Something went wrong. Please try again.');
          this.loading.set(false);
        },
      });
  }
}
