import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { toDataURL } from 'qrcode';
import { AuthService } from '../../../../core/auth/auth.service';
import { MfaSetupResponse } from '../../../../core/auth/mfa-setup-response.model';
import { SessionService } from '../../../../core/auth/session.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { Button } from '../../../../shared/ui/button/button';

@Component({
  selector: 'app-mfa-setup',
  imports: [ReactiveFormsModule, Button],
  templateUrl: './mfa-setup.html',
})
export class MfaSetup {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly sessionService = inject(SessionService);
  private readonly permissionStore = inject(PermissionStore);
  private readonly router = inject(Router);

  /** F-02: true when the admin was sent here because MFA is mandatory and not yet enrolled. */
  protected readonly enrollmentRequired = this.sessionService.mfaEnrollmentRequired;

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly setupResponse = signal<MfaSetupResponse | null>(null);
  protected readonly qrCodeDataUrl = signal<string | null>(null);
  protected readonly showManualKey = signal(false);
  protected readonly confirmed = signal(false);

  protected readonly codeForm = this.formBuilder.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  startSetup(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.enableMfa().subscribe({
      next: (response) => {
        this.setupResponse.set(response);
        this.showManualKey.set(false);
        this.loading.set(false);
        void this.renderQrCode(response.qrCodeUri);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(this.messageForError(error));
      },
    });
  }

  toggleManualKey(): void {
    this.showManualKey.update((visible) => !visible);
  }

  private async renderQrCode(qrCodeUri: string): Promise<void> {
    try {
      this.qrCodeDataUrl.set(await toDataURL(qrCodeUri, { width: 220, margin: 1 }));
    } catch {
      // QR rendering is a convenience over the manual key, which always works -
      // fall back to the manual-entry disclosure instead of blocking setup.
      this.qrCodeDataUrl.set(null);
      this.showManualKey.set(true);
    }
  }

  confirmSetup(): void {
    if (this.codeForm.invalid) {
      this.codeForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const { code } = this.codeForm.getRawValue();

    this.authService.confirmMfaSetup(code).subscribe({
      next: () => {
        this.confirmed.set(true);
        this.refreshSessionAndContinue();
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(this.messageForError(error));
      },
    });
  }

  /**
   * The backend lifts the enrollment restriction on the same session as soon as setup is
   * confirmed. Reload the context so the session flag and permissions match, then open the console.
   */
  private refreshSessionAndContinue(): void {
    this.authService.loadContext().subscribe({
      next: (context) => {
        this.sessionService.setSession(context);
        this.permissionStore.setAuthorizationContext(context);
        this.loading.set(false);
        this.router.navigateByUrl('/');
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set(
          'Two-factor authentication is enabled, but your session could not be refreshed. Please sign in again.',
        );
      },
    });
  }

  private messageForError(error: HttpErrorResponse): string {
    switch (error.status) {
      case 409:
        return 'MFA is already enabled on your account.';
      case 400:
        return 'Invalid code. Please try again.';
      case 401:
        return 'Your session has expired. Please sign in again.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }
}