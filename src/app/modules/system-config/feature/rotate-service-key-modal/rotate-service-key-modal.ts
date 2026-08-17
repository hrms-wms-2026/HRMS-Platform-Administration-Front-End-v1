import { Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ServiceKeysService } from '../../data/service-keys.service';
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

  protected readonly form = this.formBuilder.nonNullable.group({
    apiKey: ['', Validators.required],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    const { apiKey } = this.form.getRawValue();

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

  cancel(): void {
    this.closed.emit();
  }
}
