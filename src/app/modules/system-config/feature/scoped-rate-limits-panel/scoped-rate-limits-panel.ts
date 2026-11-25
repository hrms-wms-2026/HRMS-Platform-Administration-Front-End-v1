import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Observable } from 'rxjs';
import { RateLimitsService, RateLimitTarget } from '../../data/rate-limits.service';
import {
  EffectiveRateLimit,
  PlanRateLimit,
  RATE_LIMIT_LABELS,
  RATE_LIMIT_SOURCE_LABELS,
  MAX_REJECTION_TENANTS,
  RateLimitSetting,
  hasBurst,
} from '../../data/rate-limit.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';
import { Button } from '../../../../shared/ui/button/button';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { EditRateLimitModal, EditRateLimitMode } from '../edit-rate-limit-modal/edit-rate-limit-modal';

/**
 * The per-tenant limits (signed-in user, tray device, whole tenant) for one subscription plan or one
 * tenant (Improvements task 48). Shows the effective value and where it comes from; with
 * platform.system_config.manage, an override can be set or removed. Shown only with
 * platform.system_config.read, whatever plan or tenant permissions the admin has.
 */
@Component({
  selector: 'app-scoped-rate-limits-panel',
  imports: [Button, ErrorBanner, StatusBadge, EditRateLimitModal],
  templateUrl: './scoped-rate-limits-panel.html',
})
export class ScopedRateLimitsPanel {
  private readonly rateLimitsService = inject(RateLimitsService);
  private readonly notificationService = inject(NotificationService);
  private readonly permissionStore = inject(PermissionStore);

  readonly target = input.required<Extract<RateLimitTarget, { scope: 'plan' | 'tenant' }>>();
  /** Shown in the edit dialog, for example "Plan: Enterprise". */
  readonly scopeLabel = input<string>('');

  protected readonly canView = computed(() => this.permissionStore.hasPermission('platform.system_config.read'));
  protected readonly canManage = computed(() =>
    this.permissionStore.hasPermission('platform.system_config.manage'),
  );

  protected readonly labels = RATE_LIMIT_LABELS;
  protected readonly sourceLabels = RATE_LIMIT_SOURCE_LABELS;
  protected readonly hasBurst = hasBurst;

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly limits = signal<EffectiveRateLimit[]>([]);
  protected readonly editing = signal<{ limit: EffectiveRateLimit; mode: EditRateLimitMode } | null>(null);

  /** Task 49, tenant scope only: "N", "0" or "at most N" 429s on this API server in the last hour. */
  protected readonly recentRejections = signal<string | null>(null);

  protected readonly isPlan = computed(() => this.target().scope === 'plan');
  protected readonly ownSource = computed(() => (this.isPlan() ? 'plan' : 'tenant'));

  constructor() {
    effect(() => {
      this.target();
      untracked(() => {
        if (this.canView()) {
          this.load();
          this.loadRejections();
        }
      });
    });
  }

  protected load(): void {
    const target = this.target();
    this.loading.set(true);
    this.errorMessage.set(null);
    const request$: Observable<{ limits: EffectiveRateLimit[] }> =
      target.scope === 'plan'
        ? this.rateLimitsService.getPlan(target.planId)
        : this.rateLimitsService.getTenant(target.tenantId);
    request$.subscribe({
      next: (result) => {
        this.limits.set(result.limits);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load the rate limits.');
        this.loading.set(false);
      },
    });
  }

  /**
   * The rejections read returns the top 50 tenants only. A tenant missing from a full list may still
   * have 429s, at most as many as the 50th row; a tenant missing from a shorter list has none.
   */
  private loadRejections(): void {
    const target = this.target();
    this.recentRejections.set(null);
    if (target.scope !== 'tenant') return;
    this.rateLimitsService.listRejections(60).subscribe({
      next: (data) => {
        const row = data.tenants.find((t) => t.tenantId === target.tenantId);
        if (row) {
          this.recentRejections.set(String(row.totalRejections));
          return;
        }
        const full = data.tenants.length >= MAX_REJECTION_TENANTS;
        const lowest = full ? Math.min(...data.tenants.map((t) => t.totalRejections)) : 0;
        this.recentRejections.set(full ? `at most ${lowest}` : '0');
      },
      error: () => this.recentRejections.set(null),
    });
  }

  /** "Inherits global: 600 / min" for a plan, or the source label for a tenant. */
  protected inheritedText(limit: EffectiveRateLimit): string {
    const plan = limit as PlanRateLimit;
    if (this.isPlan() && plan.inherited) {
      return `Inherits ${plan.inheritedSource === 'global' ? 'global' : 'default'}: ${this.format(plan.inherited, hasBurst(limit))}`;
    }
    return this.sourceLabels[limit.effectiveSource];
  }

  protected format(value: RateLimitSetting | null | undefined, withBurst: boolean): string {
    if (!value) return '—';
    return withBurst && value.burst != null ? `${value.perMinute} / min, burst ${value.burst}` : `${value.perMinute} / min`;
  }

  protected startEdit(limit: EffectiveRateLimit): void {
    this.editing.set({ limit, mode: 'set' });
  }

  protected startRemove(limit: EffectiveRateLimit): void {
    this.editing.set({ limit, mode: 'remove' });
  }

  protected closeEdit(): void {
    this.editing.set(null);
  }

  protected onSaved(): void {
    const mode = this.editing()?.mode;
    this.editing.set(null);
    this.notificationService.success(mode === 'remove' ? 'Override removed.' : 'Rate limit saved.');
    this.load();
  }
}
