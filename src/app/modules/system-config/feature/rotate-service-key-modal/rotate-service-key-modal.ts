import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { switchMap } from 'rxjs';
import { ServiceKeysService } from '../../data/service-keys.service';
import {
  ServiceKeyProviderOption,
  ServiceKeyVerificationResult,
} from '../../data/service-key.model';
import { buildCredentialGroup, credentialValues } from '../../data/service-key-fields';
import { Button } from '../../../../shared/ui/button/button';
import { ServiceKeyFieldsForm } from '../service-key-fields-form/service-key-fields-form';

@Component({
  selector: 'app-rotate-service-key-modal',
  imports: [Button, ServiceKeyFieldsForm],
  templateUrl: './rotate-service-key-modal.html',
})
export class RotateServiceKeyModal implements OnInit {
  private readonly serviceKeysService = inject(ServiceKeysService);

  readonly serviceKey = input.required<string>();
  readonly rotated = output<void>();
  readonly closed = output<void>();

  protected readonly loading = signal(false);
  protected readonly loadingProviders = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly providers = signal<ServiceKeyProviderOption[]>([]);
  /** Set after a live-verified provider is rotated, so the admin sees the outcome. */
  protected readonly verification = signal<ServiceKeyVerificationResult | null>(null);

  protected readonly provider = computed(
    () => this.providers().find((p) => p.providerKey === this.serviceKey()) ?? null,
  );

  protected readonly credentialGroup = computed(() => {
    const provider = this.provider();
    return provider ? buildCredentialGroup(provider.fields) : null;
  });

  ngOnInit(): void {
    this.serviceKeysService.listProviders().subscribe({
      next: (providers) => {
        this.providers.set(providers);
        this.loadingProviders.set(false);
      },
      error: () => {
        this.loadingProviders.set(false);
        this.errorMessage.set('Could not load the fields for this service key.');
      },
    });
  }

  protected submit(): void {
    const provider = this.provider();
    const group = this.credentialGroup();
    if (!provider || !group) {
      return;
    }
    if (group.invalid) {
      group.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    const rotate$ = this.serviceKeysService.rotateKey(this.serviceKey(), credentialValues(group));

    if (provider.verificationMode !== 'live') {
      rotate$.subscribe({
        next: () => {
          this.loading.set(false);
          this.rotated.emit();
        },
        error: (error: HttpErrorResponse) => this.fail(error, 'Could not rotate the service key.'),
      });
      return;
    }

    rotate$.pipe(switchMap(() => this.serviceKeysService.verify(this.serviceKey()))).subscribe({
      next: (result) => {
        this.loading.set(false);
        if (result.success) {
          this.verification.set(result);
        } else {
          this.errorMessage.set(`Saved, but the provider check failed: ${result.message}`);
        }
      },
      error: (error: HttpErrorResponse) =>
        this.fail(error, 'Could not rotate or verify the service key.'),
    });
  }

  protected finish(): void {
    this.rotated.emit();
  }

  cancel(): void {
    this.closed.emit();
  }

  private fail(error: HttpErrorResponse, fallback: string): void {
    this.loading.set(false);
    this.errorMessage.set(error.error?.detail ?? fallback);
  }
}
