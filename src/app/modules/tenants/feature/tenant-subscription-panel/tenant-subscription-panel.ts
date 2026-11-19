import { Component, effect, inject, input, signal } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { TenantSubscriptionService } from '../../data/tenant-subscription.service';
import {
  TenantSubscription,
  formatSubscriptionAmount,
  renewalCountdownLabel,
  tenantSubscriptionStatusTone,
} from '../../data/tenant-subscription.model';
import { PageDetailSkeleton } from '../../../../shared/ui/page-detail-skeleton/page-detail-skeleton';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';

@Component({
  selector: 'app-tenant-subscription-panel',
  imports: [DatePipe, TitleCasePipe, PageDetailSkeleton, ErrorBanner, StatusBadge],
  templateUrl: './tenant-subscription-panel.html',
})
export class TenantSubscriptionPanel {
  private readonly tenantSubscriptionService = inject(TenantSubscriptionService);

  readonly tenantId = input.required<string>();

  protected readonly tenantSubscriptionStatusTone = tenantSubscriptionStatusTone;
  protected readonly formatSubscriptionAmount = formatSubscriptionAmount;
  protected readonly renewalCountdownLabel = renewalCountdownLabel;

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly subscription = signal<TenantSubscription | null>(null);

  constructor() {
    effect(() => {
      const tenantId = this.tenantId();
      if (tenantId) {
        this.loadSubscription(tenantId);
      }
    });
  }

  protected loadSubscription(tenantId: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.tenantSubscriptionService.get(tenantId).subscribe({
      next: (subscription) => {
        this.subscription.set(subscription);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 404) {
          this.errorMessage.set('No subscription found for this tenant.');
        } else {
          this.errorMessage.set('Could not load billing and renewal details.');
        }
        this.subscription.set(null);
        this.loading.set(false);
      },
    });
  }
}
