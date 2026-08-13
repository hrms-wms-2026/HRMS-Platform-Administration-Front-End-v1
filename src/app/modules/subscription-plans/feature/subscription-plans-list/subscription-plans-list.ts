import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SubscriptionPlansService } from '../../data/subscription-plans.service';
import { SubscriptionPlanSummary } from '../../data/subscription-plan.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { TableSkeleton } from '../../../../shared/ui/table-skeleton/table-skeleton';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Button } from '../../../../shared/ui/button/button';

@Component({
  selector: 'app-subscription-plans-list',
  imports: [RouterLink, StatusBadge, TableSkeleton, ErrorBanner, EmptyState, Button],
  templateUrl: './subscription-plans-list.html',
})
export class SubscriptionPlansList implements OnInit {
  private readonly plansService = inject(SubscriptionPlansService);
  protected readonly permissionStore = inject(PermissionStore);

  protected readonly canView = computed(() => this.permissionStore.hasPermission('platform.subscriptions.read'));
  protected readonly canManage = computed(() =>
    this.permissionStore.hasPermission('platform.subscriptions.manage'),
  );

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly plans = signal<SubscriptionPlanSummary[]>([]);

  ngOnInit(): void {
    if (!this.canView()) {
      return;
    }
    this.loadPlans();
  }

  protected loadPlans(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.plansService.list().subscribe({
      next: (plans) => {
        this.plans.set(plans);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Something went wrong. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
