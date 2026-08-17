import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AnnouncementsService } from '../../data/announcements.service';
import {
  ANNOUNCEMENT_AUDIENCE_OPTIONS,
  ANNOUNCEMENT_SEVERITY_OPTIONS,
  AnnouncementAudience,
  AnnouncementSeverity,
} from '../../data/announcement.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { Button } from '../../../../shared/ui/button/button';

@Component({
  selector: 'app-announcement-create',
  imports: [ReactiveFormsModule, Button],
  templateUrl: './announcement-create.html',
})
export class AnnouncementCreate {
  private readonly announcementsService = inject(AnnouncementsService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly severityOptions = ANNOUNCEMENT_SEVERITY_OPTIONS;
  protected readonly audienceOptions = ANNOUNCEMENT_AUDIENCE_OPTIONS;
  protected readonly saving = signal(false);

  protected readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    body: ['', [Validators.required]],
    severity: ['info' as AnnouncementSeverity, [Validators.required]],
    audience: ['all' as AnnouncementAudience, [Validators.required]],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);

    this.announcementsService.create(this.form.getRawValue()).subscribe({
      next: () => {
        this.saving.set(false);
        this.notificationService.success('Announcement created.');
        this.router.navigateByUrl('/support/announcements');
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.notificationService.error(error.error?.detail ?? 'Could not create the announcement.');
      },
    });
  }
}
