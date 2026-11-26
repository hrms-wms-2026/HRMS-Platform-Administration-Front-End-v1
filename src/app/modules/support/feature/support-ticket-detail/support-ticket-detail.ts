import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { SupportTicketsService } from '../../data/support-tickets.service';
import {
  SUPPORT_ATTACHMENT_ACCEPT,
  SUPPORT_ATTACHMENT_MAX_BYTES,
  SUPPORT_TICKET_PRIORITY_OPTIONS,
  SUPPORT_TICKET_STATUS_OPTIONS,
  SupportAssignee,
  SupportTicketAttachment,
  SupportTicketComment,
  SupportTicketDetail as SupportTicketDetailModel,
  SupportTicketPriority,
  SupportTicketSummary,
  appInsightsQuery,
  formatFileSize,
  supportTicketPriorityTone,
  supportTicketStatusTone,
} from '../../data/support-ticket.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';
import { Button } from '../../../../shared/ui/button/button';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { Loader } from '../../../../shared/ui/loader/loader';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';

@Component({
  selector: 'app-support-ticket-detail',
  imports: [ReactiveFormsModule, Button, StatusBadge, Loader, ErrorBanner, DatePipe],
  templateUrl: './support-ticket-detail.html',
})
export class SupportTicketDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly ticketsService = inject(SupportTicketsService);
  private readonly notificationService = inject(NotificationService);
  private readonly formBuilder = inject(FormBuilder);
  protected readonly permissionStore = inject(PermissionStore);

  private readonly ticketId = this.route.snapshot.paramMap.get('id')!;

  protected readonly canManage = computed(() => this.permissionStore.hasPermission('platform.support.manage'));

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly detail = signal<SupportTicketDetailModel | null>(null);
  protected readonly assignees = signal<SupportAssignee[]>([]);
  protected readonly updatingStatus = signal(false);
  protected readonly updatingAssignee = signal(false);
  protected readonly postingComment = signal(false);
  protected readonly uploading = signal(false);
  protected readonly downloadingId = signal<string | null>(null);
  protected readonly uploadInternal = signal(false);
  protected readonly editing = signal(false);
  protected readonly savingEdit = signal(false);

  protected readonly statusOptions = SUPPORT_TICKET_STATUS_OPTIONS;
  protected readonly priorityOptions = SUPPORT_TICKET_PRIORITY_OPTIONS;
  protected readonly statusTone = supportTicketStatusTone;
  protected readonly priorityTone = supportTicketPriorityTone;
  protected readonly fileSize = formatFileSize;
  protected readonly attachmentAccept = SUPPORT_ATTACHMENT_ACCEPT;
  protected readonly appInsightsQuery = appInsightsQuery;

  /** Correlation ids the tenant attached; the References section is hidden when there are none. */
  protected readonly references = computed(() => this.detail()?.correlationIds ?? []);

  protected readonly commentForm = this.formBuilder.nonNullable.group({
    body: ['', [Validators.required, Validators.maxLength(10000)]],
    isInternal: [false],
  });

  protected readonly editForm = this.formBuilder.nonNullable.group({
    subject: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.required, Validators.maxLength(10000)]],
    priority: ['medium' as SupportTicketPriority, [Validators.required]],
    category: ['', [Validators.maxLength(80)]],
  });

  ngOnInit(): void {
    this.loadTicket();
    if (this.canManage()) {
      this.ticketsService.listAssignees().subscribe({
        next: (assignees) => this.assignees.set(assignees),
        error: () => this.assignees.set([]),
      });
    }
  }

  protected loadTicket(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.ticketsService.getById(this.ticketId).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Something went wrong. Please try again.');
        this.loading.set(false);
      },
    });
  }

  protected startEdit(): void {
    const ticket = this.detail()?.ticket;
    if (!ticket) {
      return;
    }
    this.editForm.setValue({
      subject: ticket.subject,
      description: ticket.description,
      priority: ticket.priority,
      category: ticket.category ?? '',
    });
    this.editing.set(true);
  }

  protected cancelEdit(): void {
    this.editing.set(false);
  }

  protected saveEdit(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const value = this.editForm.getRawValue();
    this.savingEdit.set(true);

    this.ticketsService
      .update(this.ticketId, {
        subject: value.subject.trim(),
        description: value.description.trim(),
        priority: value.priority,
        category: value.category.trim() || null,
      })
      .subscribe({
        next: (ticket) => {
          this.savingEdit.set(false);
          this.editing.set(false);
          this.notificationService.success('Ticket updated.');
          this.replaceTicket(ticket);
        },
        error: (error: HttpErrorResponse) => {
          this.savingEdit.set(false);
          this.notificationService.error(error.error?.detail ?? 'Could not update the ticket.');
        },
      });
  }

  protected changeStatus(status: string): void {
    this.updatingStatus.set(true);

    this.ticketsService.updateStatus(this.ticketId, status).subscribe({
      next: (ticket) => {
        this.updatingStatus.set(false);
        this.notificationService.success('Ticket status updated.');
        this.replaceTicket(ticket);
      },
      error: (error: HttpErrorResponse) => {
        this.updatingStatus.set(false);
        this.notificationService.error(error.error?.detail ?? 'Could not update the ticket status.');
      },
    });
  }

  protected changeAssignee(platformUserId: string): void {
    this.updatingAssignee.set(true);

    this.ticketsService.assign(this.ticketId, platformUserId || null).subscribe({
      next: (ticket) => {
        this.updatingAssignee.set(false);
        this.notificationService.success(ticket.assignedToName ? `Assigned to ${ticket.assignedToName}.` : 'Ticket unassigned.');
        this.replaceTicket(ticket);
      },
      error: (error: HttpErrorResponse) => {
        this.updatingAssignee.set(false);
        this.notificationService.error(error.error?.detail ?? 'Could not change the assignee.');
      },
    });
  }

  protected submitComment(): void {
    if (this.commentForm.invalid) {
      this.commentForm.markAllAsTouched();
      return;
    }

    const value = this.commentForm.getRawValue();
    this.postingComment.set(true);

    this.ticketsService.addComment(this.ticketId, value.body, value.isInternal).subscribe({
      next: (comment: SupportTicketComment) => {
        this.postingComment.set(false);
        this.commentForm.reset({ body: '', isInternal: false });
        const current = this.detail();
        if (current) {
          this.detail.set({ ...current, comments: [...current.comments, comment] });
        }
      },
      error: (error: HttpErrorResponse) => {
        this.postingComment.set(false);
        this.notificationService.error(error.error?.detail ?? 'Could not add the comment.');
      },
    });
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    if (file.size > SUPPORT_ATTACHMENT_MAX_BYTES) {
      this.notificationService.error('Files must be 25 MB or smaller.');
      return;
    }

    this.uploading.set(true);
    this.ticketsService.uploadAttachment(this.ticketId, file, this.uploadInternal()).subscribe({
      next: (attachment: SupportTicketAttachment) => {
        this.uploading.set(false);
        this.notificationService.success('File attached.');
        const current = this.detail();
        if (current) {
          this.detail.set({ ...current, attachments: [...current.attachments, attachment] });
        }
      },
      error: (error: HttpErrorResponse) => {
        this.uploading.set(false);
        this.notificationService.error(error.error?.detail ?? 'Could not attach the file.');
      },
    });
  }

  protected download(attachment: SupportTicketAttachment): void {
    this.downloadingId.set(attachment.id);
    this.ticketsService.getAttachmentDownloadUrl(this.ticketId, attachment.id).subscribe({
      next: (download) => {
        this.downloadingId.set(null);
        window.open(download.url, '_blank', 'noopener');
      },
      error: (error: HttpErrorResponse) => {
        this.downloadingId.set(null);
        this.notificationService.error(error.error?.detail ?? 'Could not download the file.');
      },
    });
  }

  protected copyReference(correlationId: string): void {
    this.copyToClipboard(correlationId, 'Reference copied.');
  }

  protected copyQuery(correlationId: string): void {
    this.copyToClipboard(appInsightsQuery(correlationId), 'Application Insights query copied.');
  }

  private copyToClipboard(text: string, successMessage: string): void {
    if (!navigator.clipboard) {
      this.notificationService.error('Copy is not available in this browser. Select the text and copy it instead.');
      return;
    }
    navigator.clipboard.writeText(text).then(
      () => this.notificationService.success(successMessage),
      () => this.notificationService.error('Could not copy. Select the text and copy it instead.'),
    );
  }

  private replaceTicket(ticket: SupportTicketSummary): void {
    const current = this.detail();
    if (current) {
      this.detail.set({ ...current, ticket });
    }
  }
}
