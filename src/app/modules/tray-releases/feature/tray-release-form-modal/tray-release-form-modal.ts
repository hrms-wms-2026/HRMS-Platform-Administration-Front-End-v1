import { Component, inject, output, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { TrayReleasesService } from '../../data/tray-releases.service';
import { TrayReleaseChannel } from '../../data/tray-release.model';
import { Button } from '../../../../shared/ui/button/button';

const VERSION = /^\d+\.\d+\.\d+$/;
const SHA256 = /^[0-9a-fA-F]{64}$/;
const HTTPS_URL = /^https:\/\/\S+$/;

/** Passes when empty; otherwise the value must match the pattern. */
const optionalPattern =
  (pattern: RegExp): ValidatorFn =>
  (control: AbstractControl): ValidationErrors | null =>
    !control.value || pattern.test(control.value) ? null : { pattern: true };

@Component({
  selector: 'app-tray-release-form-modal',
  imports: [ReactiveFormsModule, Button],
  templateUrl: './tray-release-form-modal.html',
})
export class TrayReleaseFormModal {
  private readonly formBuilder = inject(FormBuilder);
  private readonly trayReleasesService = inject(TrayReleasesService);

  readonly created = output<void>();
  readonly closed = output<void>();

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    version: ['', [Validators.required, Validators.pattern(VERSION)]],
    channel: ['beta' as TrayReleaseChannel, Validators.required],
    downloadUrl: ['', [Validators.required, Validators.pattern(HTTPS_URL)]],
    sha256: ['', [Validators.required, Validators.pattern(SHA256)]],
    fileSizeBytes: [0, [Validators.required, Validators.min(1)]],
    publisher: ['CN=ONEVO', [Validators.required, Validators.maxLength(200)]],
    minimumWindowsVersion: ['10.0.19041.0', Validators.required],
    minSupportedVersion: ['', optionalPattern(VERSION)],
    releaseNotes: [''],
    isActive: [false],
  });

  protected showError(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.invalid && control.touched;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    const value = this.form.getRawValue();

    this.trayReleasesService
      .create({
        ...value,
        minSupportedVersion: value.minSupportedVersion.trim() || null,
        releaseNotes: value.releaseNotes.trim() || null,
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.created.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.loading.set(false);
          this.errorMessage.set(
            error.status === 409
              ? 'That version already exists in this channel.'
              : (error.error?.detail ?? 'Could not create the release.'),
          );
        },
      });
  }

  cancel(): void {
    this.closed.emit();
  }
}
