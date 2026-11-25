import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { TenantSubscriptionService } from '../../data/tenant-subscription.service';
import {
  TenantSubscription,
  formatSubscriptionAmount,
  renewalCountdownLabel,
  seatUsageLabel,
  tenantSubscriptionStatusTone,
} from '../../data/tenant-subscription.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';
import { PageDetailSkeleton } from '../../../../shared/ui/page-detail-skeleton/page-detail-skeleton';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';

@Component({
  selector: 'app-tenant-subscription-panel',
  imports: [DatePipe, TitleCasePipe, ReactiveFormsModule, PageDetailSkeleton, ErrorBanner, StatusBadge],
  templateUrl: './tenant-subscription-panel.html',
})
export class TenantSubscriptionPanel {
  private readonly tenantSubscriptionService = inject(TenantSubscriptionService);
  private readonly permissionStore = inject(PermissionStore);
  private readonly notificationService = inject(NotificationService);
  private readonly formBuilder = inject(FormBuilder);

  readonly tenantId = input.required<string>();

  protected readonly tenantSubscriptionStatusTone = tenantSubscriptionStatusTone;
  protected readonly formatSubscriptionAmount = formatSubscriptionAmount;
  protected readonly renewalCountdownLabel = renewalCountdownLabel;

  protected readonly seatUsageLabel = seatUsageLabel;

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly subscription = signal<TenantSubscription | null>(null);

  // Seat allocation editing (platform.subscriptions.manage only).
  protected readonly canManageSeats = computed(() =>
    this.permissionStore.hasPermission('platform.subscriptions.manage'),
  );
  protected readonly editingSeats = signal(false);
  protected readonly savingSeats = signal(false);
  protected readonly seatError = signal<string | null>(null);
  protected readonly seatForm = this.formBuilder.nonNullable.group({
    includedSeats: this.formBuilder.nonNullable.control<number | null>(null, [
      Validators.required,
      Validators.min(0),
      Validators.max(100000),
      Validators.pattern(/^\d+$/),
    ]),
    overageAllowed: false,
    isTest: false,
  });
  private readonly seatFormValue = toSignal(this.seatForm.valueChanges, {
    initialValue: this.seatForm.getRawValue(),
  });
  /** True when the entered allocation leaves no free seat and overage is off. */
  protected readonly noFreeSeats = computed(() => {
    const { includedSeats, overageAllowed } = this.seatFormValue();
    if (overageAllowed || includedSeats === null || includedSeats === undefined || Number(includedSeats) < 0) {
      return false;
    }
    return Number(includedSeats) <= (this.subscription()?.usedSeats ?? 0);
  });

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

  protected startEditSeats(sub: TenantSubscription): void {
    this.seatForm.reset({
      // Never pre-fill "exactly the used count": that leaves 0 free seats and blocks the next hire.
      includedSeats: sub.includedSeats ?? (sub.usedSeats ?? 0) + 1,
      overageAllowed: sub.overageAllowed ?? false,
      isTest: sub.isTest,
    });
    this.seatError.set(null);
    this.editingSeats.set(true);
  }

  protected cancelEditSeats(): void {
    this.editingSeats.set(false);
    this.seatError.set(null);
  }

  protected saveSeats(): void {
    if (this.seatForm.invalid) {
      this.seatForm.markAllAsTouched();
      return;
    }
    const { includedSeats, overageAllowed, isTest } = this.seatForm.getRawValue();
    this.savingSeats.set(true);
    this.seatError.set(null);

    this.tenantSubscriptionService
      .update(this.tenantId(), { includedSeats: Number(includedSeats), overageAllowed, isTest })
      .subscribe({
        next: (updated) => {
          this.subscription.set(updated);
          this.savingSeats.set(false);
          this.editingSeats.set(false);
          this.notificationService.success('Seat allocation saved.');
        },
        error: (error: HttpErrorResponse) => {
          this.savingSeats.set(false);
          this.seatError.set(
            error.status === 403
              ? 'You do not have permission to change seat allocation.'
              : 'Could not save seat allocation. Please try again.',
          );
        },
      });
  }
}
