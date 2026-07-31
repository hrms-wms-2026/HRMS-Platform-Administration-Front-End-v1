import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { SessionService } from '../../../../core/auth/session.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { environment } from '../../../../../environments/environment';
import { Button } from '../../../../shared/ui/button/button';

@Component({
  selector: 'app-mfa-verify',
  imports: [ReactiveFormsModule, Button],
  templateUrl: './mfa-verify.html',
})
export class MfaVerify {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly sessionService = inject(SessionService);
  private readonly permissionStore = inject(PermissionStore);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly codeForm = this.formBuilder.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  submit(): void {
    if (this.codeForm.invalid) {
      this.codeForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const { code } = this.codeForm.getRawValue();

    this.authService.verifyMfa(code).subscribe({
      next: (context) => {
        this.logDebug('MFA verify succeeded', { userId: context.userId });
        this.sessionService.setSession(context);
        this.permissionStore.setAuthorizationContext(context);
        this.loading.set(false);
        this.router.navigateByUrl('/');
      },
      error: (error: HttpErrorResponse) => {
        this.logDebug('MFA verify failed', { status: error.status });
        this.loading.set(false);
        this.errorMessage.set(this.messageForError(error));
      },
    });
  }

  private logDebug(message: string, details: Record<string, unknown>): void {
    if (!environment.enableDebugLogs) {
      return;
    }
    console.debug(`[MfaVerify] ${message}`, details);
  }

  private messageForError(error: HttpErrorResponse): string {
    switch (error.status) {
      case 401:
        return 'Invalid or expired code. Please try again.';
      case 0:
        return 'Connection failed. Please retry.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }
}