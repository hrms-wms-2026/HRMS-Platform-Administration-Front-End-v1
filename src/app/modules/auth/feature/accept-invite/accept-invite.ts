import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { Button } from '../../../../shared/ui/button/button';

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return password === confirmPassword ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-accept-invite',
  imports: [ReactiveFormsModule, Button],
  templateUrl: './accept-invite.html',
  styleUrl: './accept-invite.css',
})
export class AcceptInvite implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly view = signal<'form' | 'success' | 'error' | 'invalid'>('form');
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  private token = '';

  protected readonly acceptInviteForm = this.formBuilder.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(64)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatchValidator },
  );

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });

    if (!token) {
      this.view.set('invalid');
      return;
    }
    this.token = token;
  }

  submit(): void {
    if (this.acceptInviteForm.invalid) {
      this.acceptInviteForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const { password } = this.acceptInviteForm.getRawValue();

    this.authService.acceptInvite(this.token, password).subscribe({
      next: () => {
        this.loading.set(false);
        this.view.set('success');
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.detail ?? 'This invitation link is invalid.');
        this.view.set('error');
      },
    });
  }

  continueToSignIn(): void {
    this.router.navigateByUrl('/auth/login');
  }
}
