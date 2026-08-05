import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { Button } from '../../../../shared/ui/button/button';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, Button],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly submitted = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly forgotPasswordForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  submit(): void {
    if (this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const { email } = this.forgotPasswordForm.getRawValue();

    // Enumeration-safe by design: the backend answers 200 for every email, so any
    // error reaching here is a transport/server failure - one generic retry message.
    this.authService.forgotPassword(email).subscribe({
      next: () => {
        this.loading.set(false);
        this.submitted.set(true);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Connection failed. Please retry.');
      },
    });
  }

  goToLogin(): void {
    this.router.navigateByUrl('/auth/login');
  }
}
