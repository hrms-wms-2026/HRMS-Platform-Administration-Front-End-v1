import { Component, HostListener, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import * as isoCountries from 'i18n-iso-countries';
import * as isoCountriesEnLocale from 'i18n-iso-countries/langs/en.json';
import { PaymentGatewaysService } from '../../data/payment-gateways.service';
import {
  PaymentGatewayConfig,
  UpdatePaymentGatewayMetadataPayload,
  parseCountryCodesInput,
} from '../../data/payment-gateway.model';
import { Button } from '../../../../shared/ui/button/button';

isoCountries.registerLocale(isoCountriesEnLocale);

@Component({
  selector: 'app-edit-payment-gateway-modal',
  imports: [ReactiveFormsModule, Button],
  templateUrl: './edit-payment-gateway-modal.html',
})
export class EditPaymentGatewayModal {
  private readonly formBuilder = inject(FormBuilder);
  private readonly paymentGatewaysService = inject(PaymentGatewaysService);

  readonly gateway = input.required<PaymentGatewayConfig>();
  readonly updated = output<void>();
  readonly closed = output<void>();

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    displayName: ['', [Validators.required, Validators.maxLength(100)]],
    logoUrl: [''],
    publicKey: [''],
    merchantId: [''],
    webhookUrl: [''],
    countryCodes: ['', Validators.required],
  });

  constructor() {
    effect(() => {
      const gateway = this.gateway();
      const activeCountryCodes = gateway.countryRoutes
        .filter((route) => route.isActive)
        .map((route) => route.countryCode)
        .join(', ');

      this.form.reset({
        displayName: gateway.displayName,
        logoUrl: gateway.logoUrl ?? '',
        publicKey: gateway.publicKey ?? '',
        merchantId: gateway.merchantId ?? '',
        webhookUrl: gateway.webhookUrl ?? '',
        countryCodes: activeCountryCodes,
      });
      this.errorMessage.set(null);
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const countryCodes = parseCountryCodesInput(value.countryCodes);
    if (countryCodes.length === 0) {
      this.errorMessage.set('At least one country route is required.');
      return;
    }
    if (countryCodes.some((code) => code.length !== 2)) {
      this.errorMessage.set('Country codes must be 2-letter ISO codes (e.g. US, GB, LK).');
      return;
    }

    const countryNameSnapshots = countryCodes.map(
      (code) => isoCountries.getName(code, 'en', { select: 'official' }) ?? null,
    );

    const payload: UpdatePaymentGatewayMetadataPayload = {
      displayName: value.displayName.trim(),
      logoUrl: value.logoUrl.trim(),
      publicKey: value.publicKey.trim(),
      merchantId: value.merchantId.trim(),
      webhookUrl: value.webhookUrl.trim(),
      countryCodes,
      countryNameSnapshots,
    };

    this.loading.set(true);
    this.errorMessage.set(null);
    this.paymentGatewaysService.update(this.gateway().id, payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.updated.emit();
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(error.error?.detail ?? 'Could not update the payment gateway.');
      },
    });
  }

  cancel(): void {
    this.closed.emit();
  }

  protected onBackdropClick(): void {
    if (!this.loading()) {
      this.cancel();
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (!this.loading()) {
      this.cancel();
    }
  }
}
