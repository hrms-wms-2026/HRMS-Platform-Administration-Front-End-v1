import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { SessionService } from '../../../../core/auth/session.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { environment } from '../../../../../environments/environment';
import { Button } from '../../../../shared/ui/button/button';

const REMEMBERED_EMAIL_KEY = 'onevo_admin_remembered_email';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, Button],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly sessionService = inject(SessionService);
  private readonly permissionStore = inject(PermissionStore);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  protected readonly loginForm = this.formBuilder.nonNullable.group({
    email: [this.readRememberedEmail() ?? '', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    rememberEmail: [this.readRememberedEmail() !== null],
  });

  togglePasswordVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }

  submit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const { email, password, rememberEmail } = this.loginForm.getRawValue();

    this.logDebug('Login attempt', { email, apiUrl: environment.apiUrl });

    this.authService.login({ email, password }).subscribe({
      next: (context) => {
        this.rememberEmail(rememberEmail, email);
        this.loading.set(false);

        if (context.mfaRequired) {
          this.logDebug('Login succeeded, MFA required', { email });
          this.router.navigateByUrl('/auth/mfa-verify');
          return;
        }

        this.logDebug('Login succeeded', { userId: context.userId, role: context.platformRole });
        this.sessionService.setSession(context);
        this.permissionStore.setAuthorizationContext(context);
        this.router.navigateByUrl('/');
      },
      error: (error: HttpErrorResponse) => {
        this.logDebug('Login failed', { status: error.status, url: error.url, message: error.message });
        this.loading.set(false);
        this.errorMessage.set(this.messageForError(error));
      },
    });
  }

  private logDebug(message: string, details: Record<string, unknown>): void {
    if (!environment.enableDebugLogs) {
      return;
    }
    console.debug(`[Login] ${message}`, details);
  }

  private messageForError(error: HttpErrorResponse): string {
    switch (error.status) {
      case 401:
        return 'Invalid email or password.';
      case 403:
        return 'Access restricted. Contact platform support.';
      case 423:
        return 'Account locked. Try again in 15 minutes.';
      case 0:
        return 'Connection failed. Please retry.';
      default:
        return 'Invalid email or password.';
    }
  }

  private rememberEmail(remember: boolean, email: string): void {
    if (remember) {
      localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
    } else {
      localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    }
  }

  private readRememberedEmail(): string | null {
    return localStorage.getItem(REMEMBERED_EMAIL_KEY);
  }
}