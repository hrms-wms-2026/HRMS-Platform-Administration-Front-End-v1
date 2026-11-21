import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RateLimitsService, RateLimitTarget } from '../../data/rate-limits.service';
import {
  EffectiveRateLimit,
  RATE_LIMIT_LABELS,
  hasBurst,
  rateLimitErrorMessage,
} from '../../data/rate-limit.model';
import { Button } from '../../../../shared/ui/button/button';

export type EditRateLimitMode = 'set' | 'remove';

/**
 * Sets or removes one rate limit override, globally, for a plan or for a tenant (Improvements
 * task 48). Every change needs a reason. The parent reloads its list after `saved`: the backend
 * owns the effective values, so nothing is patched locally.
 */
@Component({
  selector: 'app-edit-rate-limit-modal',
  imports: [ReactiveFormsModule, Button],
  templateUrl: './edit-rate-limit-modal.html',
})
export class EditRateLimitModal implements OnInit {
  private readonly rateLimitsService = inject(RateLimitsService);
  private readonly fb = inject(FormBuilder);

  readonly target = input.required<RateLimitTarget>();
  readonly limit = input.required<EffectiveRateLimit>();
  readonly mode = input<EditRateLimitMode>('set');
  /** Where the override applies, for the heading, for example "Global" or "Plan: Enterprise". */
  readonly scopeLabel = input('Global');
  readonly saved = output<void>();
  readonly closed = output<void>();

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly label = computed(() => RATE_LIMIT_LABELS[this.limit().limitName]);
  protected readonly withBurst = computed(() => hasBurst(this.limit()));
  protected readonly bounds = computed(() => this.limit().bounds);

  protected readonly form = this.fb.nonNullable.group({
    perMinute: [0, [Validators.required]],
    burst: [0],
    reason: ['', [Validators.required, Validators.maxLength(500)]],
  });

  ngOnInit(): void {
    const limit = this.limit();
    const start = limit.override ?? limit.effective;
    const bounds = limit.bounds;
    this.form.controls.perMinute.setValue(start.perMinute);
    this.form.controls.perMinute.addValidators([
      Validators.min(bounds.minPerMinute),
      Validators.max(bounds.maxPerMinute),
    ]);
    if (this.withBurst()) {
      this.form.controls.burst.setValue(start.burst ?? bounds.minBurst ?? 1);
      this.form.controls.burst.addValidators([
        Validators.required,
        Validators.min(bounds.minBurst ?? 1),
        Validators.max(bounds.maxBurst ?? Number.MAX_SAFE_INTEGER),
      ]);
    }
    this.form.updateValueAndValidity();
  }

  protected submit(): void {
    const reasonControl = this.form.controls.reason;
    reasonControl.setValue(reasonControl.value.trim());
    const invalid =
      this.mode() === 'remove' ? reasonControl.invalid : this.form.invalid;
    if (invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    const limit = this.limit();
    const rowVersion = limit.override?.rowVersion ?? null;
    const request$ =
      this.mode() === 'remove'
        ? this.rateLimitsService.remove(this.target(), limit.limitName, reasonControl.value, rowVersion)
        : this.rateLimitsService.set(this.target(), limit.limitName, {
            perMinute: Number(this.form.controls.perMinute.value),
            burst: this.withBurst() ? Number(this.form.controls.burst.value) : null,
            reason: reasonControl.value,
            rowVersion,
          });

    request$.subscribe({
      next: () => {
        this.loading.set(false);
        this.saved.emit();
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(
          rateLimitErrorMessage(
            error,
            this.mode() === 'remove' ? 'Could not remove the override.' : 'Could not save the limit.',
          ),
        );
      },
    });
  }

  cancel(): void {
    this.closed.emit();
  }
}
