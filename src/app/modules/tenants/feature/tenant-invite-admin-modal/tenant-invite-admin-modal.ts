import { Component, OnInit, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { TenantAdminService } from '../../data/tenant-admin.service';
import { TenantRoleSummary } from '../../data/tenant-admin.model';
import { Modal } from '../../../../shared/ui/modal/modal';
import { Button } from '../../../../shared/ui/button/button';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';

@Component({
  selector: 'app-tenant-invite-admin-modal',
  imports: [ReactiveFormsModule, Modal, Button, ErrorBanner],
  templateUrl: './tenant-invite-admin-modal.html',
})
export class TenantInviteAdminModal implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly tenantAdminService = inject(TenantAdminService);

  readonly open = input.required<boolean>();
  readonly tenantId = input.required<string>();
  readonly closed = output<void>();
  readonly invited = output<void>();

  protected readonly loadingRoles = signal(false);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly roles = signal<TenantRoleSummary[]>([]);

  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    roleId: ['', Validators.required],
  });

  constructor() {
    effect(() => {
      if (this.open()) {
        this.loadRoles();
      } else {
        this.form.reset();
        this.errorMessage.set(null);
      }
    });
  }

  ngOnInit(): void {
    this.loadRoles();
  }

  protected loadRoles(): void {
    if (!this.tenantId()) {
      return;
    }

    this.loadingRoles.set(true);
    this.tenantAdminService.listRoles(this.tenantId()).subscribe({
      next: (roles) => {
        this.roles.set(roles);
        this.loadingRoles.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load tenant roles.');
        this.loadingRoles.set(false);
      },
    });
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    const value = this.form.getRawValue();

    this.tenantAdminService
      .inviteAdmin(this.tenantId(), {
        email: value.email.trim(),
        firstName: value.firstName.trim(),
        lastName: value.lastName.trim(),
        roleId: value.roleId,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.invited.emit();
          this.closed.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.submitting.set(false);
          this.errorMessage.set(error.error?.detail ?? 'Could not send the tenant admin invitation.');
        },
      });
  }
}
