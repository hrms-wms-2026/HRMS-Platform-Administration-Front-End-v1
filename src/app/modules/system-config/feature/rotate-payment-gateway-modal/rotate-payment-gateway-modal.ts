import { Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { PaymentGatewaysService } from '../../data/payment-gateways.service';
import { PaymentGatewayConfig } from '../../data/payment-gateway.model';
import { Button } from '../../../../shared/ui/button/button';

@Component({
  selector: 'app-rotate-payment-gateway-modal',
  imports: [ReactiveFormsModule, Button],
  templateUrl: './rotate-payment-gateway-modal.html',
})
export class RotatePaymentGatewayModal {
  private readonly formBuilder = inject(FormBuilder);
  private readonly paymentGatewaysService = inject(PaymentGatewaysService);

  readonly gateway = input.required<PaymentGatewayConfig>();
  readonly rotated = output<void>();
  readonly closed = output<void>();

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    secretKey: ['', Validators.required],
    webhookSecret: [''],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    const value = this.form.getRawValue();

    this.paymentGatewaysService
      .rotateCredentials(this.gateway().id, {
        secretKey: value.secretKey.trim(),
        webhookSecret: value.webhookSecret.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.rotated.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.loading.set(false);
          this.errorMessage.set(error.error?.detail ?? 'Could not rotate gateway credentials.');
        },
      });
  }

  cancel(): void {
    this.closed.emit();
  }
}
