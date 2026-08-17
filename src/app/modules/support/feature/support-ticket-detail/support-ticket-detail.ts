import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { SupportTicketsService } from '../../data/support-tickets.service';
import {
  SUPPORT_TICKET_STATUS_OPTIONS,
  SupportTicketComment,
  SupportTicketDetail as SupportTicketDetailModel,
  shortTicketId,
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
  protected readonly updatingStatus = signal(false);
  protected readonly postingComment = signal(false);

  protected readonly statusOptions = SUPPORT_TICKET_STATUS_OPTIONS;
  protected readonly statusTone = supportTicketStatusTone;
  protected readonly priorityTone = supportTicketPriorityTone;
  protected readonly shortId = shortTicketId;

  protected readonly commentForm = this.formBuilder.nonNullable.group({
    body: ['', [Validators.required]],
    isInternal: [false],
  });

  ngOnInit(): void {
    this.loadTicket();
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

  protected changeStatus(status: string): void {
    this.updatingStatus.set(true);

    this.ticketsService.updateStatus(this.ticketId, status).subscribe({
      next: (ticket) => {
        this.updatingStatus.set(false);
        this.notificationService.success('Ticket status updated.');
        const current = this.detail();
        if (current) {
          this.detail.set({ ...current, ticket });
        }
      },
      error: (error: HttpErrorResponse) => {
        this.updatingStatus.set(false);
        this.notificationService.error(error.error?.detail ?? 'Could not update the ticket status.');
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
}
