import { Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { SessionService } from '../../../../core/auth/session.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { environment } from '../../../../../environments/environment';
import { Button } from '../../../../shared/ui/button/button';

const CODE_PATTERN = /^\d{6}$/;

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
    code: ['', [Validators.required, Validators.pattern(CODE_PATTERN)]],
  });

  private readonly codeValue = toSignal(this.codeForm.controls.code.valueChanges, {
    initialValue: '',
  });
  private lastAutoSubmittedCode: string | null = null;

  constructor() {
    // Auto-submits once a full 6-digit code is present, so the user isn't forced to
    // click Verify after typing/pasting/autofilling the code. Guarded by the code
    // value itself (not `loading`) so re-running the effect when loading flips back
    // to false doesn't re-trigger a submit for the same code.
    effect(() => {
      const code = this.codeValue();
      if (CODE_PATTERN.test(code) && code !== this.lastAutoSubmittedCode) {
        this.lastAutoSubmittedCode = code;
        this.submit();
      }
    });
  }

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