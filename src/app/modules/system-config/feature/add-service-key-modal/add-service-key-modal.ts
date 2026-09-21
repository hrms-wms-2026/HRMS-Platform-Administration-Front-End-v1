import { Component, OnInit, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ServiceKeysService } from '../../data/service-keys.service';
import { ServiceKeyProviderOption } from '../../data/service-key.model';
import {
  AWS_REKOGNITION_DEFAULT_REGION,
  AWS_REKOGNITION_REGIONS,
  buildAwsRekognitionBundle,
  isAwsRekognitionServiceKey,
} from '../../data/aws-rekognition-credentials';
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

  protected readonly regions = AWS_REKOGNITION_REGIONS;

  protected readonly form = this.formBuilder.nonNullable.group({
    serviceKey: ['', Validators.required],
    displayName: ['', [Validators.required, Validators.maxLength(80)]],
    apiKey: [''],
    accessKeyId: [''],
    secretAccessKey: [''],
    region: [AWS_REKOGNITION_DEFAULT_REGION],
  });

  protected isRekognition(): boolean {
    return isAwsRekognitionServiceKey(this.form.controls.serviceKey.value);
  }

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

    this.errorMessage.set(null);
    const { serviceKey, displayName, apiKey, accessKeyId, secretAccessKey, region } =
      this.form.getRawValue();

    let credential = apiKey.trim();
    if (isAwsRekognitionServiceKey(serviceKey)) {
      if (!accessKeyId.trim() || !secretAccessKey.trim() || !region.trim()) {
        this.errorMessage.set('Access Key ID, Secret Access Key, and region are required.');
        return;
      }
      credential = buildAwsRekognitionBundle(accessKeyId, secretAccessKey, region);
    } else if (!credential) {
      this.form.markAllAsTouched();
      this.errorMessage.set('API key is required.');
      return;
    }

    this.loading.set(true);
    this.serviceKeysService.create(serviceKey, displayName, credential).subscribe({
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
