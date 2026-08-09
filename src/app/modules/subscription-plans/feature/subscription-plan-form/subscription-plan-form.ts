import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModuleCatalogService } from '../../../module-catalog/data/module-catalog.service';
import { ModuleCatalogItem } from '../../../module-catalog/data/module-catalog.model';
import { CreateSubscriptionPlanRequest, SubscriptionPlanDetail } from '../../data/subscription-plan.model';
import { COMPANY_SIZE_OPTIONS, CURRENCY_CODE_OPTIONS } from '../../../tenants/utils/tenant-options';
import { Button } from '../../../../shared/ui/button/button';
import { Loader } from '../../../../shared/ui/loader/loader';

const CODE_PATTERN = /^[a-z0-9_]+$/;
const COMPANY_SIZE_PATTERN = /^\d+(-\d+|\+)$/;

@Component({
  selector: 'app-subscription-plan-form',
  imports: [ReactiveFormsModule, Button, Loader],
  templateUrl: './subscription-plan-form.html',
})
export class SubscriptionPlanForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly moduleCatalogService = inject(ModuleCatalogService);

  readonly mode = input.required<'create' | 'edit'>();
  readonly initialValue = input<SubscriptionPlanDetail | null>(null);
  readonly saving = input(false);
  readonly submitted = output<CreateSubscriptionPlanRequest>();

  protected readonly companySizeOptions = COMPANY_SIZE_OPTIONS;
  protected readonly currencyOptions = CURRENCY_CODE_OPTIONS;

  protected readonly loadingModules = signal(false);
  protected readonly modulesError = signal<string | null>(null);
  protected readonly modules = signal<ModuleCatalogItem[]>([]);
  protected readonly selectedModuleKeys = signal<Set<string>>(new Set());

  protected readonly isCreate = computed(() => this.mode() === 'create');

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    code: ['', [Validators.required, Validators.maxLength(20), Validators.pattern(CODE_PATTERN)]],
    tier: ['', [Validators.required, Validators.maxLength(50)]],
    companySizeRange: ['', [Validators.required, Validators.pattern(COMPANY_SIZE_PATTERN)]],
    currency: ['USD', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
    overrideMonthlyPrice: this.formBuilder.control<number | null>(null),
    overrideAnnualPrice: this.formBuilder.control<number | null>(null),
    aiTokenLimitPerMonth: this.formBuilder.control<number | null>(null),
    trialPeriodDays: [30, [Validators.required, Validators.min(0)]],
    unpaidGracePeriodDays: [7, [Validators.required, Validators.min(0)]],
  });

  // Reading form.valueChanges only to establish a signal dependency - form.getRawValue()
  // itself is a plain (non-signal) snapshot read, always accurate at call time, but
  // reading it alone inside computed() would never trigger recomputation on keystrokes.
  private readonly formValueTick = toSignal(this.form.valueChanges, { initialValue: null });

  protected readonly hasChanges = computed(() => {
    this.formValueTick();
    this.selectedModuleKeys();

    if (this.isCreate()) {
      return true;
    }
    const initial = this.initialValue();
    if (!initial) {
      return true;
    }

    const raw = this.form.getRawValue();
    const fieldsChanged =
      raw.name !== initial.name ||
      raw.tier !== initial.tier ||
      raw.companySizeRange !== initial.companySizeRange ||
      raw.currency !== initial.currency ||
      raw.overrideMonthlyPrice !== initial.overrideMonthlyPrice ||
      raw.overrideAnnualPrice !== initial.overrideAnnualPrice ||
      raw.aiTokenLimitPerMonth !== initial.aiTokenLimitPerMonth ||
      raw.trialPeriodDays !== initial.trialPeriodDays ||
      raw.unpaidGracePeriodDays !== initial.unpaidGracePeriodDays;
    if (fieldsChanged) {
      return true;
    }

    const currentModules = this.selectedModuleKeys();
    const initialModules = new Set(initial.includedModules);
    if (currentModules.size !== initialModules.size) {
      return true;
    }
    for (const key of currentModules) {
      if (!initialModules.has(key)) {
        return true;
      }
    }
    return false;
  });

  protected readonly canSubmit = computed(() => {
    // Read every signal unconditionally before combining with && - short-circuiting on
    // form.valid (a plain getter, not a signal) would otherwise skip reading
    // selectedModuleKeys()/saving()/hasChanges() on that pass, so Angular never tracks
    // them as dependencies and this computed gets stuck stale forever.
    const hasSelectedModule = this.selectedModuleKeys().size > 0;
    const notSaving = !this.saving();
    const changed = this.hasChanges();
    return this.form.valid && hasSelectedModule && notSaving && changed;
  });

  ngOnInit(): void {
    this.loadModules();

    const value = this.initialValue();
    if (value) {
      this.form.patchValue({
        name: value.name,
        code: value.code,
        tier: value.tier,
        companySizeRange: value.companySizeRange,
        currency: value.currency,
        overrideMonthlyPrice: value.overrideMonthlyPrice,
        overrideAnnualPrice: value.overrideAnnualPrice,
        aiTokenLimitPerMonth: value.aiTokenLimitPerMonth,
        trialPeriodDays: value.trialPeriodDays,
        unpaidGracePeriodDays: value.unpaidGracePeriodDays,
      });
      this.selectedModuleKeys.set(new Set(value.includedModules));
    }

    if (this.mode() === 'edit') {
      this.form.controls.code.disable();
    }
  }

  private loadModules(): void {
    this.loadingModules.set(true);
    this.modulesError.set(null);

    this.moduleCatalogService.list().subscribe({
      next: (modules) => {
        this.modules.set(modules.filter((m) => m.isActive));
        this.loadingModules.set(false);
      },
      error: () => {
        this.modulesError.set('Could not load the module catalog.');
        this.loadingModules.set(false);
      },
    });
  }

  protected toggleModule(moduleKey: string): void {
    const next = new Set(this.selectedModuleKeys());
    if (next.has(moduleKey)) {
      next.delete(moduleKey);
    } else {
      next.add(moduleKey);
    }
    this.selectedModuleKeys.set(next);
  }

  protected submit(): void {
    if (!this.canSubmit()) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.submitted.emit({
      name: raw.name,
      code: raw.code,
      tier: raw.tier,
      companySizeRange: raw.companySizeRange,
      moduleKeys: Array.from(this.selectedModuleKeys()),
      currency: raw.currency,
      overrideMonthlyPrice: raw.overrideMonthlyPrice,
      overrideAnnualPrice: raw.overrideAnnualPrice,
      aiTokenLimitPerMonth: raw.aiTokenLimitPerMonth,
      trialPeriodDays: raw.trialPeriodDays,
      unpaidGracePeriodDays: raw.unpaidGracePeriodDays,
    });
  }
}
