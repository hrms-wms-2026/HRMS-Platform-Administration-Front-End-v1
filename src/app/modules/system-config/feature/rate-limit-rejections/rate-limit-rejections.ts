import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RateLimitsService } from '../../data/rate-limits.service';
import {
  RATE_LIMIT_LABELS,
  RateLimitRejectionLimit,
  RateLimitRejections as RateLimitRejectionsData,
  TenantRateLimitRejections,
  rejectionKindLabel,
} from '../../data/rate-limit.model';
import { Button } from '../../../../shared/ui/button/button';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { MetricCard } from '../../../../shared/ui/metric-card/metric-card';
import { TableSkeleton } from '../../../../shared/ui/table-skeleton/table-skeleton';

/**
 * "Rejections (last hour)" on the Rate Limits page (Improvements task 49): which tenants hit their
 * limits on this API server, so an admin can check before raising one. The counts are per API
 * server and start again on a restart; the section says so.
 */
@Component({
  selector: 'app-rate-limit-rejections',
  imports: [Button, ErrorBanner, EmptyState, MetricCard, TableSkeleton, DatePipe, RouterLink],
  templateUrl: './rate-limit-rejections.html',
})
export class RateLimitRejections implements OnInit {
  private readonly rateLimitsService = inject(RateLimitsService);

  protected readonly minutes = 60;
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly data = signal<RateLimitRejectionsData | null>(null);

  protected readonly tenantRows = computed(() => this.data()?.tenants.filter((t) => !!t.tenantId) ?? []);
  protected readonly noTenantRow = computed(() => this.data()?.tenants.find((t) => !t.tenantId) ?? null);

  protected readonly labels = RATE_LIMIT_LABELS;
  protected readonly kindLabel = rejectionKindLabel;

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.rateLimitsService.listRejections(this.minutes).subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load the rejection counts.');
        this.loading.set(false);
      },
    });
  }

  protected kinds(row: TenantRateLimitRejections): string {
    return row.byKind.map((k) => `${this.kindLabel(k.kind)}: ${k.count}`).join(', ');
  }

  protected limit(row: TenantRateLimitRejections, name: RateLimitRejectionLimit['limitName']): string {
    const limit = row.effectiveLimits.find((l) => l.limitName === name);
    if (!limit) return '—';
    return limit.burst != null ? `${limit.perMinute} / min, burst ${limit.burst}` : `${limit.perMinute} / min`;
  }
}
