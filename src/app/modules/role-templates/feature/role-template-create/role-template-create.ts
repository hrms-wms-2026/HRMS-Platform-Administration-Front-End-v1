import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { RoleTemplatesService } from '../../data/role-templates.service';
import { CreateRoleTemplatePayload, UpdateRoleTemplatePayload } from '../../data/role-template.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { RoleTemplateForm } from '../role-template-form/role-template-form';

@Component({
  selector: 'app-role-template-create',
  imports: [RoleTemplateForm],
  templateUrl: './role-template-create.html',
})
export class RoleTemplateCreate {
  private readonly roleTemplatesService = inject(RoleTemplatesService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly saving = signal(false);

  protected submit(value: CreateRoleTemplatePayload | UpdateRoleTemplatePayload): void {
    this.saving.set(true);

    this.roleTemplatesService.create(value as CreateRoleTemplatePayload).subscribe({
      next: (template) => {
        this.saving.set(false);
        this.notificationService.success('Role template created.');
        this.router.navigate(['/role-templates', template.id]);
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.notificationService.error(error.error?.detail ?? 'Could not create the role template.');
      },
    });
  }
}
