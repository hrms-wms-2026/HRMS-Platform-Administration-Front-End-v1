import { Component, OnInit, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PlatformUsersService } from '../../data/platform-users.service';
import { PlatformRoleSummary } from '../../data/platform-role-summary.model';
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
    this.usersService.listRoles().subscribe({
      next: (roles) => this.roles.set(roles),
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
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Could not send the invitation. The email may already be in use.');
      },
    });
  }

  cancel(): void {
    this.closed.emit();
  }
}
