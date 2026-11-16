import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AnnouncementsService } from '../../data/announcements.service';
import {
  ANNOUNCEMENT_AUDIENCE_OPTIONS,
  ANNOUNCEMENT_SEVERITY_OPTIONS,
  AnnouncementAudience,
  AnnouncementRequest,
  AnnouncementSeverity,
  fromDateTimeLocal,
  toDateTimeLocal,
} from '../../data/announcement.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { Button } from '../../../../shared/ui/button/button';
import { Loader } from '../../../../shared/ui/loader/loader';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';

/** The display window must end after it starts when both ends are set. */
function windowOrderValidator(group: AbstractControl): ValidationErrors | null {
  const startsAt = group.get('startsAt')?.value as string;
  const endsAt = group.get('endsAt')?.value as string;
  if (!startsAt || !endsAt) {
    return null;
  }
  return new Date(endsAt) > new Date(startsAt) ? null : { windowOrder: true };
}

/**
 * Creates a draft announcement (route `support/announcements/new`) or edits an existing one
 * (route `support/announcements/:id/edit`). Publishing stays a separate action on the list.
 */
@Component({
  selector: 'app-announcement-create',
  imports: [ReactiveFormsModule, Button, Loader, ErrorBanner],
  templateUrl: './announcement-create.html',
})
export class AnnouncementCreate implements OnInit {
  private readonly announcementsService = inject(AnnouncementsService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly severityOptions = ANNOUNCEMENT_SEVERITY_OPTIONS;
  protected readonly audienceOptions = ANNOUNCEMENT_AUDIENCE_OPTIONS;
  protected readonly saving = signal(false);
  protected readonly loading = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly announcementId = signal<string | null>(null);
  protected readonly isEdit = computed(() => this.announcementId() !== null);

  protected readonly form = this.formBuilder.nonNullable.group(
    {
      title: ['', [Validators.required, Validators.maxLength(200)]],
      body: ['', [Validators.required, Validators.maxLength(5000)]],
      severity: ['info' as AnnouncementSeverity, [Validators.required]],
      audience: ['all' as AnnouncementAudience, [Validators.required]],
      startsAt: [''],
      endsAt: [''],
    },
    { validators: windowOrderValidator },
  );

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.announcementId.set(id);
      this.loadAnnouncement(id);
    }
  }

  protected loadAnnouncement(id: string): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.announcementsService.getById(id).subscribe({
      next: (announcement) => {
        this.form.setValue({
          title: announcement.title,
          body: announcement.body,
          severity: announcement.severity,
          audience: announcement.audience,
          startsAt: toDateTimeLocal(announcement.startsAt),
          endsAt: toDateTimeLocal(announcement.endsAt),
        });
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.loadError.set(
          error.status === 404 ? 'This announcement no longer exists.' : 'Something went wrong. Please try again.',
        );
      },
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const request: AnnouncementRequest = {
      title: value.title,
      body: value.body,
      severity: value.severity,
      audience: value.audience,
      startsAt: fromDateTimeLocal(value.startsAt),
      endsAt: fromDateTimeLocal(value.endsAt),
    };

    const id = this.announcementId();
    const save$ = id ? this.announcementsService.update(id, request) : this.announcementsService.create(request);

    this.saving.set(true);
    save$.subscribe({
      next: () => {
        this.saving.set(false);
        this.notificationService.success(id ? 'Announcement updated.' : 'Announcement created.');
        this.router.navigateByUrl('/support/announcements');
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.notificationService.error(
          error.error?.detail ?? (id ? 'Could not update the announcement.' : 'Could not create the announcement.'),
        );
      },
    });
  }
}
