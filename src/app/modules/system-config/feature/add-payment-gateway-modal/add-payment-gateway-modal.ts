import { Component, OnInit, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import * as isoCountries from 'i18n-iso-countries';
import * as isoCountriesEnLocale from 'i18n-iso-countries/langs/en.json';
import { PaymentGatewaysService } from '../../data/payment-gateways.service';
import {
  CreatePaymentGatewayPayload,
  PAYMENT_GATEWAY_ENVIRONMENTS,
  PaymentGatewayProviderOption,
  parseCountryCodesInput,
} from '../../data/payment-gateway.model';
import { Button } from '../../../../shared/ui/button/button';

isoCountries.registerLocale(isoCountriesEnLocale);

@Component({
  selector: 'app-add-payment-gateway-modal',
  imports: [ReactiveFormsModule, Button],
  templateUrl: './add-payment-gateway-modal.html',
})
export class AddPaymentGatewayModal implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly paymentGatewaysService = inject(PaymentGatewaysService);

  readonly created = output<void>();
  readonly closed = output<void>();

  protected readonly environments = PAYMENT_GATEWAY_ENVIRONMENTS;
  protected readonly loading = signal(false);
  protected readonly verifying = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly verifyMessage = signal<string | null>(null);
  protected readonly providers = signal<PaymentGatewayProviderOption[]>([]);

  protected readonly form = this.formBuilder.nonNullable.group({
    gatewayKey: ['', [Validators.required, Validators.maxLength(80)]],
    provider: ['', Validators.required],
    environment: ['sandbox' as 'sandbox' | 'production', Validators.required],
    displayName: ['', [Validators.required, Validators.maxLength(100)]],
    logoUrl: [''],
    publicKey: [''],
    merchantId: [''],
    webhookUrl: [''],
    secretKey: ['', Validators.required],
    webhookSecret: [''],
    countryCodes: ['', Validators.required],
    isActive: [true],
  });

  ngOnInit(): void {
    this.paymentGatewaysService.listProviders().subscribe({
      next: (providers) => this.providers.set(providers),
      error: () => this.errorMessage.set('Could not load payment gateway providers.'),
    });
  }

  protected verifyCredentials(): void {
    const provider = this.form.controls.provider.value;
    const secretKey = this.form.controls.secretKey.value.trim();
    if (!provider || !secretKey) {
      this.verifyMessage.set('Select a provider and enter a secret key before verifying.');
      return;
    }

    this.verifying.set(true);
    this.verifyMessage.set(null);
    this.paymentGatewaysService.verifyCredentials(provider, secretKey).subscribe({
      next: (result) => {
        this.verifying.set(false);
        if (result.isVerified) {
          this.verifyMessage.set(
            `Verified${result.accountName ? `: ${result.accountName}` : ''}${
              result.defaultCurrency ? ` (${result.defaultCurrency})` : ''
            }`,
          );
        } else {
          this.verifyMessage.set(result.errorMessage ?? 'Credentials could not be verified.');
        }
      },
      error: (error: HttpErrorResponse) => {
        this.verifying.set(false);
        this.verifyMessage.set(error.error?.detail ?? 'Verification request failed.');
      },
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const countryCodes = parseCountryCodesInput(value.countryCodes);
    if (countryCodes.some((code) => code.length !== 2)) {
      this.errorMessage.set('Country codes must be 2-letter ISO codes (e.g. US, GB, LK).');
      return;
    }

    const countryNameSnapshots = countryCodes.map(
      (code) => isoCountries.getName(code, 'en', { select: 'official' }) ?? null,
    );

    const payload: CreatePaymentGatewayPayload = {
      gatewayKey: value.gatewayKey.trim(),
      provider: value.provider,
      environment: value.environment,
      displayName: value.displayName.trim(),
      logoUrl: value.logoUrl.trim() || undefined,
      publicKey: value.publicKey.trim() || undefined,
      merchantId: value.merchantId.trim() || undefined,
      webhookUrl: value.webhookUrl.trim() || undefined,
      isActive: value.isActive,
      secretKey: value.secretKey.trim(),
      webhookSecret: value.webhookSecret.trim() || undefined,
      countryCodes,
      countryNameSnapshots,
    };

    this.loading.set(true);
    this.errorMessage.set(null);
    this.paymentGatewaysService.create(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.created.emit();
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(error.error?.detail ?? 'Could not create the payment gateway.');
      },
    });
  }

  cancel(): void {
    this.closed.emit();
  }
}
