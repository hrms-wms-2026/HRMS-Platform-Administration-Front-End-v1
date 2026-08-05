import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { Button } from '../../../../shared/ui/button/button';

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const newPassword = control.get('newPassword')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return newPassword === confirmPassword ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, Button],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export class ResetPassword implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly view = signal<'form' | 'success' | 'invalid'>('form');
  protected readonly loading = signal(false);
  protected readonly showNewPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);
  private token = '';

  protected readonly resetPasswordForm = this.formBuilder.nonNullable.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(64)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatchValidator },
  );

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    // Strip the token from the visible URL immediately - it must never linger in the
    // address bar, browser history, or anything that reads the URL.
    this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });

    if (!token) {
      this.view.set('invalid');
      return;
    }
    this.token = token;
  }

  toggleNewPasswordVisibility(): void {
    this.showNewPassword.update((visible) => !visible);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((visible) => !visible);
  }

  submit(): void {
    if (this.resetPasswordForm.invalid) {
      this.resetPasswordForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const { newPassword } = this.resetPasswordForm.getRawValue();

    // Any failure maps to the same invalid-link view - the backend deliberately never
    // distinguishes invalid/expired/used tokens, and neither does this screen.
    this.authService.resetPassword(this.token, newPassword).subscribe({
      next: () => {
        this.loading.set(false);
        this.view.set('success');
      },
      error: () => {
        this.loading.set(false);
        this.view.set('invalid');
      },
    });
  }

  continueToSignIn(): void {
    this.router.navigateByUrl('/auth/login');
  }

  requestNewLink(): void {
    this.router.navigateByUrl('/auth/forgot-password');
  }
}
