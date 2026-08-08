import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { TenantsService } from '../../data/tenants.service';
import { CreateTenantRequest } from '../../data/tenant.model';
import { SubscriptionPlansService } from '../../../subscription-plans/data/subscription-plans.service';
import { SubscriptionPlanSummary } from '../../../subscription-plans/data/subscription-plan.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { Button } from '../../../../shared/ui/button/button';
import { Loader } from '../../../../shared/ui/loader/loader';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import {
  COMPANY_SIZE_OPTIONS,
  COUNTRY_CODE_OPTIONS,
  CURRENCY_CODE_OPTIONS,
  INDUSTRY_OPTIONS,
  TIMEZONE_OPTIONS,
  slugify,
} from '../../utils/tenant-options';

const SLUG_VALIDATION_DEBOUNCE_MS = 400;

@Component({
  selector: 'app-tenant-wizard',
  imports: [ReactiveFormsModule, Button, Loader, ErrorBanner],
  templateUrl: './tenant-wizard.html',
})
export class TenantWizard implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly tenantsService = inject(TenantsService);
  private readonly plansService = inject(SubscriptionPlansService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly industryOptions = INDUSTRY_OPTIONS;
  protected readonly companySizeOptions = COMPANY_SIZE_OPTIONS;
  protected readonly countryOptions = COUNTRY_CODE_OPTIONS;
  protected readonly currencyOptions = CURRENCY_CODE_OPTIONS;
  protected readonly timezoneOptions = TIMEZONE_OPTIONS;

  protected readonly currentStep = signal(1);

  protected readonly companyForm = this.formBuilder.nonNullable.group({
    companyName: ['', Validators.required],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/)]],
    industryProfile: ['office_it', Validators.required],
    companySizeRange: ['1-10', Validators.required],
    legalEntityName: ['', Validators.required],
    registrationNumber: [''],
    country: ['', Validators.required],
    timezone: ['', Validators.required],
    currency: ['', Validators.required],
  });

  protected readonly subscriptionForm = this.formBuilder.nonNullable.group({
    planId: ['', Validators.required],
    billingCycle: this.formBuilder.nonNullable.control<'monthly' | 'annual'>('monthly'),
  });

  protected readonly ownerForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
  });

  protected readonly slugManuallyEdited = signal(false);
  protected readonly slugConflict = signal<string | null>(null);
  private slugValidationTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly plans = signal<SubscriptionPlanSummary[]>([]);
  protected readonly loadingPlans = signal(false);
  protected readonly plansError = signal<string | null>(null);
  protected readonly selectedPlanId = signal<string | null>(null);

  protected readonly selectedPlan = computed(
    () => this.plans().find((p) => p.id === this.selectedPlanId()) ?? null,
  );

  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadingPlans.set(true);
    this.plansService.list().subscribe({
      next: (plans) => {
        this.plans.set(plans.filter((p) => p.isActive));
        this.loadingPlans.set(false);
      },
      error: () => {
        this.plansError.set('Could not load subscription plans.');
        this.loadingPlans.set(false);
      },
    });
  }

  protected onCompanyNameChanged(value: string): void {
    this.companyForm.controls.companyName.setValue(value);
    if (!this.slugManuallyEdited()) {
      this.companyForm.controls.slug.setValue(slugify(value));
    }
  }

  protected onSlugChanged(value: string): void {
    this.slugManuallyEdited.set(true);
    this.companyForm.controls.slug.setValue(value);
    this.scheduleSlugValidation(value);
  }

  private scheduleSlugValidation(slug: string): void {
    clearTimeout(this.slugValidationTimer);
    this.slugConflict.set(null);
    if (!slug) {
      return;
    }
    this.slugValidationTimer = setTimeout(() => {
      this.tenantsService.validate({ slug }).subscribe({
        next: (result) => {
          const conflict = result.conflicts.find((c) => c.field === 'slug');
          this.slugConflict.set(conflict ? conflict.message : null);
        },
      });
    }, SLUG_VALIDATION_DEBOUNCE_MS);
  }

  protected selectPlan(planId: string): void {
    this.selectedPlanId.set(planId);
    this.subscriptionForm.controls.planId.setValue(planId);
  }

  protected nextStep(): void {
    const step = this.currentStep();
    if (step === 1 && this.companyForm.invalid) {
      this.companyForm.markAllAsTouched();
      return;
    }
    if (step === 2 && this.subscriptionForm.invalid) {
      this.subscriptionForm.markAllAsTouched();
      return;
    }
    if (step === 3 && this.ownerForm.invalid) {
      this.ownerForm.markAllAsTouched();
      return;
    }
    this.currentStep.set(step + 1);
  }

  protected prevStep(): void {
    this.currentStep.set(Math.max(1, this.currentStep() - 1));
  }

  protected submit(): void {
    this.submitting.set(true);
    this.submitError.set(null);

    const company = this.companyForm.getRawValue();
    const subscription = this.subscriptionForm.getRawValue();
    const owner = this.ownerForm.getRawValue();

    const request: CreateTenantRequest = {
      companyName: company.companyName,
      slug: company.slug,
      industryProfile: company.industryProfile,
      companySizeRange: company.companySizeRange,
      legalEntityName: company.legalEntityName,
      registrationNumber: company.registrationNumber || null,
      country: company.country,
      timezone: company.timezone,
      currency: company.currency,
      planId: subscription.planId,
      billingCycle: subscription.billingCycle,
      ownerInvite: {
        email: owner.email,
        firstName: owner.firstName,
        lastName: owner.lastName,
      },
    };

    this.tenantsService.create(request).subscribe({
      next: (result) => {
        this.submitting.set(false);
        this.notificationService.success('Tenant created.');
        this.router.navigate(['/tenants', result.tenantId]);
      },
      error: (error: HttpErrorResponse) => {
        this.submitting.set(false);
        this.submitError.set(error.error?.detail ?? 'Could not create the tenant.');
      },
    });
  }
}
