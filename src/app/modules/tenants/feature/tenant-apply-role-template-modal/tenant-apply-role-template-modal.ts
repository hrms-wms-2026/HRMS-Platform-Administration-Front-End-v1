import { Component, OnInit, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { TenantAdminService } from '../../data/tenant-admin.service';
import { RoleTemplatesService } from '../../../role-templates/data/role-templates.service';
import { RoleTemplate } from '../../../role-templates/data/role-template.model';
import { Modal } from '../../../../shared/ui/modal/modal';
import { Button } from '../../../../shared/ui/button/button';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';

@Component({
  selector: 'app-tenant-apply-role-template-modal',
  imports: [ReactiveFormsModule, Modal, Button, ErrorBanner],
  templateUrl: './tenant-apply-role-template-modal.html',
})
export class TenantApplyRoleTemplateModal implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly tenantAdminService = inject(TenantAdminService);
  private readonly roleTemplatesService = inject(RoleTemplatesService);

  readonly open = input.required<boolean>();
  readonly tenantId = input.required<string>();
  readonly closed = output<void>();
  readonly applied = output<void>();

  protected readonly loadingTemplates = signal(false);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly templates = signal<RoleTemplate[]>([]);

  protected readonly form = this.formBuilder.nonNullable.group({
    templateId: [''],
    roleNameOverride: [''],
    forceUpdate: [false],
  });

  constructor() {
    effect(() => {
      if (this.open()) {
        this.loadTemplates();
      } else {
        this.form.reset({ templateId: '', roleNameOverride: '', forceUpdate: false });
        this.errorMessage.set(null);
      }
    });
  }

  ngOnInit(): void {
    this.loadTemplates();
  }

  protected loadTemplates(): void {
    this.loadingTemplates.set(true);
    this.roleTemplatesService.list().subscribe({
      next: (templates) => {
        this.templates.set(templates.filter((template) => template.isActive));
        this.loadingTemplates.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load role templates.');
        this.loadingTemplates.set(false);
      },
    });
  }

  protected submit(): void {
    const templateId = this.form.controls.templateId.value;
    if (!templateId || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    const value = this.form.getRawValue();

    this.tenantAdminService
      .applyRoleTemplate(this.tenantId(), templateId, {
        roleNameOverride: value.roleNameOverride.trim() || undefined,
        forceUpdate: value.forceUpdate,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.applied.emit();
          this.closed.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.submitting.set(false);
          this.errorMessage.set(error.error?.detail ?? 'Could not apply the role template.');
        },
      });
  }
}
