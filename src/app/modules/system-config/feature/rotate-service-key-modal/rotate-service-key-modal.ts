import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { switchMap } from 'rxjs';
import { ServiceKeysService } from '../../data/service-keys.service';
import { ServiceKeyVerificationResult } from '../../data/service-key.model';
import {
  AWS_REKOGNITION_DEFAULT_REGION,
  AWS_REKOGNITION_REGIONS,
  buildAwsRekognitionBundle,
  isAwsRekognitionServiceKey,
  regionLabel,
} from '../../data/aws-rekognition-credentials';
import { Button } from '../../../../shared/ui/button/button';

@Component({
  selector: 'app-rotate-service-key-modal',
  imports: [ReactiveFormsModule, Button],
  templateUrl: './rotate-service-key-modal.html',
})
export class RotateServiceKeyModal {
  private readonly formBuilder = inject(FormBuilder);
  private readonly serviceKeysService = inject(ServiceKeysService);

  readonly serviceKey = input.required<string>();
  readonly rotated = output<void>();
  readonly closed = output<void>();

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly connection = signal<ServiceKeyVerificationResult | null>(null);
  protected readonly regions = AWS_REKOGNITION_REGIONS;
  protected readonly isRekognition = computed(() => isAwsRekognitionServiceKey(this.serviceKey()));

  protected readonly form = this.formBuilder.nonNullable.group({
    apiKey: [''],
    accessKeyId: [''],
    secretAccessKey: [''],
    region: [AWS_REKOGNITION_DEFAULT_REGION],
  });

  protected regionDisplay(region: string | null | undefined): string {
    return region ? regionLabel(region) : '';
  }

  protected submit(): void {
    if (this.isRekognition()) {
      this.verifyRekognitionConnection();
      return;
    }

    const apiKey = this.form.controls.apiKey.value.trim();
    if (!apiKey) {
      this.form.controls.apiKey.setValidators(Validators.required);
      this.form.controls.apiKey.updateValueAndValidity();
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.serviceKeysService.rotateKey(this.serviceKey(), apiKey).subscribe({
      next: () => {
        this.loading.set(false);
        this.rotated.emit();
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(error.error?.detail ?? 'Could not rotate the service key.');
      },
    });
  }

  private verifyRekognitionConnection(): void {
    const { accessKeyId, secretAccessKey, region } = this.form.getRawValue();
    if (!accessKeyId.trim() || !secretAccessKey.trim() || !region.trim()) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Access Key ID, Secret Access Key, and region are required.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.connection.set(null);
    const bundle = buildAwsRekognitionBundle(accessKeyId, secretAccessKey, region);

    this.serviceKeysService
      .rotateKey(this.serviceKey(), bundle)
      .pipe(switchMap(() => this.serviceKeysService.verify(this.serviceKey())))
      .subscribe({
        next: (result) => {
          this.loading.set(false);
          if (!result.success) {
            this.errorMessage.set(result.message);
            return;
          }
          this.connection.set(result);
        },
        error: (error: HttpErrorResponse) => {
          this.loading.set(false);
          this.errorMessage.set(error.error?.detail ?? 'Could not verify the AWS Rekognition connection.');
        },
      });
  }

  protected finishConnected(): void {
    this.rotated.emit();
  }

  cancel(): void {
    this.closed.emit();
  }
}
