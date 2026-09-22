import { Component, OnInit, computed, inject, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ServiceKeysService } from '../../data/service-keys.service';
import { ServiceKeyProviderOption } from '../../data/service-key.model';
import { buildCredentialGroup, credentialValues } from '../../data/service-key-fields';
import { Button } from '../../../../shared/ui/button/button';
import { ServiceKeyFieldsForm } from '../service-key-fields-form/service-key-fields-form';

@Component({
  selector: 'app-add-service-key-modal',
  imports: [ReactiveFormsModule, Button, ServiceKeyFieldsForm],
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
  });

  private readonly selectedKey = toSignal(this.form.controls.serviceKey.valueChanges, {
    initialValue: '',
  });

  protected readonly selectedProvider = computed(
    () => this.providers().find((provider) => provider.providerKey === this.selectedKey()) ?? null,
  );

  /** A fresh credential form is built whenever a different provider is picked. */
  protected readonly credentialGroup = computed(() => {
    const provider = this.selectedProvider();
    return provider ? buildCredentialGroup(provider.fields) : null;
  });

  ngOnInit(): void {
    this.serviceKeysService.listProviders().subscribe({
      next: (providers) => this.providers.set(providers),
      error: () => this.errorMessage.set('Could not load provider options.'),
    });
  }

  protected canSubmit(): boolean {
    const group = this.credentialGroup();
    return this.form.valid && group !== null && group.valid;
  }

  protected submit(): void {
    const group = this.credentialGroup();
    if (this.form.invalid || !group || group.invalid) {
      this.form.markAllAsTouched();
      group?.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    const { serviceKey, displayName } = this.form.getRawValue();

    this.serviceKeysService.create(serviceKey, displayName, credentialValues(group)).subscribe({
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
