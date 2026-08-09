import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { SubscriptionPlansService } from '../../data/subscription-plans.service';
import { CreateSubscriptionPlanRequest } from '../../data/subscription-plan.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { SubscriptionPlanForm } from '../subscription-plan-form/subscription-plan-form';

@Component({
  selector: 'app-subscription-plan-create',
  imports: [SubscriptionPlanForm],
  templateUrl: './subscription-plan-create.html',
})
export class SubscriptionPlanCreate {
  private readonly plansService = inject(SubscriptionPlansService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly saving = signal(false);

  protected submit(value: CreateSubscriptionPlanRequest): void {
    this.saving.set(true);

    this.plansService.create(value).subscribe({
      next: (plan) => {
        this.saving.set(false);
        this.notificationService.success('Subscription plan created.');
        this.router.navigate(['/subscription-plans', plan.id]);
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.notificationService.error(error.error?.detail ?? 'Could not create the subscription plan.');
      },
    });
  }
}
