import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ConfigurationTemplatesService } from '../../data/configuration-templates.service';
import { CreateConfigurationTemplateRequest } from '../../data/configuration-template.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { ConfigurationTemplateForm } from '../configuration-template-form/configuration-template-form';

@Component({
  selector: 'app-configuration-template-create',
  imports: [ConfigurationTemplateForm],
  templateUrl: './configuration-template-create.html',
})
export class ConfigurationTemplateCreate {
  private readonly templatesService = inject(ConfigurationTemplatesService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly saving = signal(false);

  protected submit(value: CreateConfigurationTemplateRequest): void {
    this.saving.set(true);

    this.templatesService.create(value).subscribe({
      next: (template) => {
        this.saving.set(false);
        this.notificationService.success('Configuration template created.');
        this.router.navigate(['/configuration-templates', template.id]);
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.notificationService.error(error.error?.detail ?? 'Could not create the configuration template.');
      },
    });
  }
}
