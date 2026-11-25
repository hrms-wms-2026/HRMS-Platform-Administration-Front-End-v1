import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { PlatformUsersService } from '../../data/platform-users.service';
import { PlatformRoleSummary } from '../../data/platform-role-summary.model';
import { InvitePrefill } from '../../data/platform-user.model';
import { Button } from '../../../../shared/ui/button/button';

@Component({
  selector: 'app-invite-manager-modal',
  imports: [ReactiveFormsModule, Button],
  templateUrl: './invite-manager-modal.html',
  styleUrl: './invite-manager-modal.css',
})
export class InviteManagerModal implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly usersService = inject(PlatformUsersService);

  /** Set when re-inviting a revoked user: the email is locked so the same account is reused. */
  readonly prefill = input<InvitePrefill | null>(null);
  readonly invited = output<void>();
  readonly closed = output<void>();

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly roles = signal<PlatformRoleSummary[]>([]);
  protected readonly selectedRoleIds = signal<string[]>([]);

  protected readonly inviteForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    fullName: ['', Validators.required],
  });

  ngOnInit(): void {
    const prefill = this.prefill();
    if (prefill) {
      this.inviteForm.patchValue({ email: prefill.email, fullName: prefill.fullName });
      this.inviteForm.controls.email.disable();
    }

    this.usersService.listRoles().subscribe({
      next: (roles) => {
        this.roles.set(roles);
        const previousRole = prefill ? roles.find((role) => role.name === prefill.roleName) : undefined;
        if (previousRole) {
          this.selectedRoleIds.set([previousRole.id]);
        }
      },
      error: () => this.errorMessage.set('Could not load roles. Please retry.'),
    });
  }

  protected toggleRole(roleId: string): void {
    this.selectedRoleIds.update((ids) =>
      ids.includes(roleId) ? ids.filter((id) => id !== roleId) : [...ids, roleId],
    );
  }

  protected get inviteFormInvalid(): boolean {
    return this.inviteForm.invalid || this.selectedRoleIds().length === 0;
  }

  submit(): void {
    if (this.inviteFormInvalid) {
      this.inviteForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    const { email, fullName } = this.inviteForm.getRawValue();

    this.usersService.invite(email, fullName, this.selectedRoleIds()).subscribe({
      next: () => {
        this.loading.set(false);
        this.invited.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const detail = typeof err?.error?.detail === 'string' ? err.error.detail : null;
        this.errorMessage.set(detail ?? 'Could not send the invitation. The email may already be in use.');
      },
    });
  }

  cancel(): void {
    this.closed.emit();
  }
}
