import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RateLimitsService, RateLimitTarget } from '../../data/rate-limits.service';
import {
  GlobalRateLimit,
  RATE_LIMIT_LABELS,
  RATE_LIMIT_SOURCE_LABELS,
  RateLimitChange,
  RateLimitSetting,
  hasBurst,
} from '../../data/rate-limit.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';
import { Button } from '../../../../shared/ui/button/button';
import { TableSkeleton } from '../../../../shared/ui/table-skeleton/table-skeleton';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Pagination } from '../../../../shared/ui/pagination/pagination';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { EditRateLimitModal, EditRateLimitMode } from '../edit-rate-limit-modal/edit-rate-limit-modal';
import { RateLimitRejections } from '../rate-limit-rejections/rate-limit-rejections';

/**
 * Platform rate limits (Improvements task 48): the six limits an admin may change, their
 * appsettings default and allowed range, and the change history. Login, MFA and password reset
 * limits and the RateLimiting:Enabled switch are deliberately not here.
 */
@Component({
  selector: 'app-rate-limits-list',
  imports: [Button, TableSkeleton, ErrorBanner, EmptyState, Pagination, StatusBadge, DatePipe, EditRateLimitModal, RateLimitRejections],
  templateUrl: './rate-limits-list.html',
})
export class RateLimitsList implements OnInit {
  private readonly rateLimitsService = inject(RateLimitsService);
  private readonly notificationService = inject(NotificationService);
  private readonly permissionStore = inject(PermissionStore);

  protected readonly canView = computed(() => this.permissionStore.hasPermission('platform.system_config.read'));
  protected readonly canManage = computed(() =>
    this.permissionStore.hasPermission('platform.system_config.manage'),
  );

  protected readonly globalTarget: RateLimitTarget = { scope: 'global' };
  protected readonly labels = RATE_LIMIT_LABELS;
  protected readonly sourceLabels = RATE_LIMIT_SOURCE_LABELS;
  protected readonly hasBurst = hasBurst;

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly limits = signal<GlobalRateLimit[]>([]);

  protected readonly changesPageSize = 10;
  protected readonly changesPage = signal(1);
  protected readonly changesTotal = signal(0);
  protected readonly changes = signal<RateLimitChange[]>([]);
  protected readonly changesLoading = signal(false);
  protected readonly changesError = signal<string | null>(null);

  protected readonly editing = signal<{ limit: GlobalRateLimit; mode: EditRateLimitMode } | null>(null);

  ngOnInit(): void {
    if (!this.canView()) {
      return;
    }
    this.loadLimits();
    this.loadChanges(1);
  }

  protected loadLimits(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.rateLimitsService.listGlobal().subscribe({
      next: (limits) => {
        this.limits.set(limits);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Something went wrong. Please try again.');
        this.loading.set(false);
      },
    });
  }

  protected loadChanges(page: number): void {
    this.changesPage.set(page);
    this.changesLoading.set(true);
    this.changesError.set(null);
    this.rateLimitsService
      .listChanges({ scope: 'global', page, pageSize: this.changesPageSize })
      .subscribe({
        next: (result) => {
          this.changes.set(result.items);
          this.changesTotal.set(result.totalCount);
          this.changesLoading.set(false);
        },
        error: () => {
          this.changesError.set('Could not load the change history.');
          this.changesLoading.set(false);
        },
      });
  }

  protected startEdit(limit: GlobalRateLimit): void {
    this.editing.set({ limit, mode: 'set' });
  }

  protected startReset(limit: GlobalRateLimit): void {
    this.editing.set({ limit, mode: 'remove' });
  }

  protected closeEdit(): void {
    this.editing.set(null);
  }

  protected onSaved(): void {
    const mode = this.editing()?.mode;
    this.editing.set(null);
    this.notificationService.success(mode === 'remove' ? 'Override removed.' : 'Rate limit saved.');
    this.loadLimits();
    this.loadChanges(1);
  }

  protected format(value: RateLimitSetting | null | undefined, withBurst: boolean): string {
    if (!value) return '—';
    return withBurst && value.burst != null ? `${value.perMinute} / min, burst ${value.burst}` : `${value.perMinute} / min`;
  }

  protected describeChange(change: RateLimitChange): string {
    const before = change.oldPerMinute != null ? this.pair(change.oldPerMinute, change.oldBurst) : 'default';
    const after = change.newPerMinute != null ? this.pair(change.newPerMinute, change.newBurst) : 'default';
    return `${before} → ${after}`;
  }

  private pair(perMinute: number, burst: number | null | undefined): string {
    return burst != null ? `${perMinute}/min, burst ${burst}` : `${perMinute}/min`;
  }
}
