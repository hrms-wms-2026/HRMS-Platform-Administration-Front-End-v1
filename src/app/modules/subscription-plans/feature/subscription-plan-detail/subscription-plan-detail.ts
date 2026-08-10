import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { SubscriptionPlansService } from '../../data/subscription-plans.service';
import {
  CreateSubscriptionPlanRequest,
  SubscriptionPlanDetail as SubscriptionPlanDetailModel,
  UpdateSubscriptionPlanRequest,
} from '../../data/subscription-plan.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';
import { Button } from '../../../../shared/ui/button/button';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { Loader } from '../../../../shared/ui/loader/loader';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { ConfirmationDialog } from '../../../../shared/ui/confirmation-dialog/confirmation-dialog';
import { SubscriptionPlanForm } from '../subscription-plan-form/subscription-plan-form';

@Component({
  selector: 'app-subscription-plan-detail',
  imports: [Button, StatusBadge, Loader, ErrorBanner, ConfirmationDialog, SubscriptionPlanForm],
  templateUrl: './subscription-plan-detail.html',
})
export class SubscriptionPlanDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly plansService = inject(SubscriptionPlansService);
  private readonly notificationService = inject(NotificationService);
  protected readonly permissionStore = inject(PermissionStore);

  private readonly planId = this.route.snapshot.paramMap.get('id')!;

  protected readonly canManage = computed(() =>
    this.permissionStore.hasPermission('platform.subscriptions.manage'),
  );

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly plan = signal<SubscriptionPlanDetailModel | null>(null);
  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected readonly pendingArchive = signal(false);
  protected readonly archiving = signal(false);

  ngOnInit(): void {
    this.loadPlan();
  }

  protected loadPlan(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.plansService.getById(this.planId).subscribe({
      next: (plan) => {
        this.plan.set(plan);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Something went wrong. Please try again.');
        this.loading.set(false);
      },
    });
  }

  protected startEdit(): void {
    this.editing.set(true);
  }

  protected cancelEdit(): void {
    this.editing.set(false);
  }

  protected saveEdit(value: CreateSubscriptionPlanRequest): void {
    this.saving.set(true);

    const request: UpdateSubscriptionPlanRequest = {
      name: value.name,
      tier: value.tier,
      companySizeRange: value.companySizeRange,
      moduleKeys: value.moduleKeys,
      currency: value.currency,
      overrideMonthlyPrice: value.overrideMonthlyPrice,
      overrideAnnualPrice: value.overrideAnnualPrice,
      aiTokenLimitPerMonth: value.aiTokenLimitPerMonth,
      trialPeriodDays: value.trialPeriodDays,
      unpaidGracePeriodDays: value.unpaidGracePeriodDays,
    };

    this.plansService.update(this.planId, request).subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(false);
        this.notificationService.success('Subscription plan updated.');
        this.loadPlan();
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.notificationService.error(error.error?.detail ?? 'Could not update the subscription plan.');
      },
    });
  }

  protected startArchive(): void {
    this.pendingArchive.set(true);
  }

  protected cancelArchive(): void {
    this.pendingArchive.set(false);
  }

  protected confirmArchive(): void {
    this.pendingArchive.set(false);
    this.archiving.set(true);

    this.plansService.archive(this.planId).subscribe({
      next: () => {
        this.archiving.set(false);
        this.notificationService.success('Subscription plan archived.');
        // Archived plans 404 on GetById by backend design (EfSubscriptionRepository
        // filters IsActive) - reloading this page would immediately error, so go
        // back to the list instead.
        this.router.navigateByUrl('/subscription-plans');
      },
      error: () => {
        this.archiving.set(false);
        this.notificationService.error('Could not archive the subscription plan.');
      },
    });
  }
}
