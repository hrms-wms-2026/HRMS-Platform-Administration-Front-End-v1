import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { SupportTicketsService } from '../../data/support-tickets.service';
import { SUPPORT_TICKET_PRIORITY_OPTIONS, SupportTicketPriority } from '../../data/support-ticket.model';
import { TenantsService } from '../../../tenants/data/tenants.service';
import { TenantListItem } from '../../../tenants/data/tenant.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { Button } from '../../../../shared/ui/button/button';

@Component({
  selector: 'app-support-ticket-create',
  imports: [ReactiveFormsModule, Button],
  templateUrl: './support-ticket-create.html',
})
export class SupportTicketCreate implements OnInit {
  private readonly ticketsService = inject(SupportTicketsService);
  private readonly tenantsService = inject(TenantsService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly priorityOptions = SUPPORT_TICKET_PRIORITY_OPTIONS;
  protected readonly tenants = signal<TenantListItem[]>([]);
  protected readonly loadingTenants = signal(false);
  protected readonly saving = signal(false);

  protected readonly form = this.formBuilder.nonNullable.group({
    tenantId: [''],
    subject: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.required]],
    priority: ['medium' as SupportTicketPriority, [Validators.required]],
    category: [''],
  });

  ngOnInit(): void {
    this.loadingTenants.set(true);
    this.tenantsService.list({ search: '', status: '', page: 1, pageSize: 100 }).subscribe({
      next: (response) => {
        this.tenants.set(response.items);
        this.loadingTenants.set(false);
      },
      error: () => {
        this.loadingTenants.set(false);
      },
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.saving.set(true);

    this.ticketsService
      .create({
        tenantId: value.tenantId || null,
        subject: value.subject,
        description: value.description,
        priority: value.priority,
        category: value.category || null,
      })
      .subscribe({
        next: (ticket) => {
          this.saving.set(false);
          this.notificationService.success('Support ticket created.');
          this.router.navigate(['/support/tickets', ticket.id]);
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          this.notificationService.error(error.error?.detail ?? 'Could not create the support ticket.');
        },
      });
  }
}
