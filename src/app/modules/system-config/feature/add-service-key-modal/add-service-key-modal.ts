import { Component, OnInit, computed, inject, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ServiceKeysService } from '../../data/service-keys.service';
import { ServiceKeyProviderOption, getJsonCredentialProviderInfo } from '../../data/service-key.model';
import { Button } from '../../../../shared/ui/button/button';

@Component({
  selector: 'app-add-service-key-modal',
  imports: [ReactiveFormsModule, Button],
  templateUrl: './add-service-key-modal.html',
})
export class AddServiceKeyModal implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly serviceKeysService = inject(ServiceKeysService);

  readonly created = output<void>();
  readonly closed = output<void>();

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly providers = signal<ServiceKeyProviderOption[]>([]);

  protected readonly form = this.formBuilder.nonNullable.group({
    serviceKey: ['', Validators.required],
    displayName: ['', [Validators.required, Validators.maxLength(80)]],
    apiKey: ['', Validators.required],
  });

  private readonly selectedServiceKey = toSignal(this.form.controls.serviceKey.valueChanges, {
    initialValue: this.form.controls.serviceKey.value,
  });

  protected readonly jsonCredentialInfo = computed(() =>
    getJsonCredentialProviderInfo(this.selectedServiceKey()),
  );

  ngOnInit(): void {
    this.serviceKeysService.listProviders().subscribe({
      next: (providers) => this.providers.set(providers),
      error: () => this.errorMessage.set('Could not load provider options.'),
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    const { serviceKey, displayName, apiKey } = this.form.getRawValue();

    this.serviceKeysService.create(serviceKey, displayName, apiKey).subscribe({
      next: () => {
        this.loading.set(false);
        this.created.emit();
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(error.error?.detail ?? 'Could not create the service key.');
      },
    });
  }

  cancel(): void {
    this.closed.emit();
  }
}
