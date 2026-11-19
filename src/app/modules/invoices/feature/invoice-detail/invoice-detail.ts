import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { InvoicesService } from '../../data/invoices.service';
import {
  BillingAuditLog,
  InvoiceDetail as InvoiceDetailModel,
  canMarkPaidInvoice,
  canResendInvoiceEmail,
  canVoidInvoice,
  formatInvoiceAmount,
  formatInvoicePeriod,
  invoiceStatusTone,
  shortTenantLabel,
} from '../../data/invoice.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';
import { PageDetailSkeleton } from '../../../../shared/ui/page-detail-skeleton/page-detail-skeleton';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { Button } from '../../../../shared/ui/button/button';
import { ConfirmationDialog } from '../../../../shared/ui/confirmation-dialog/confirmation-dialog';

@Component({
  selector: 'app-invoice-detail',
  imports: [
    RouterLink,
    DatePipe,
    TitleCasePipe,
    PageDetailSkeleton,
    ErrorBanner,
    StatusBadge,
    Button,
    ConfirmationDialog,
  ],
  templateUrl: './invoice-detail.html',
})
export class InvoiceDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly invoicesService = inject(InvoicesService);
  private readonly notificationService = inject(NotificationService);
  protected readonly permissionStore = inject(PermissionStore);

  private readonly invoiceId = this.route.snapshot.paramMap.get('id')!;

  protected readonly invoiceStatusTone = invoiceStatusTone;
  protected readonly formatInvoiceAmount = formatInvoiceAmount;
  protected readonly formatInvoicePeriod = formatInvoicePeriod;
  protected readonly shortTenantLabel = shortTenantLabel;
  protected readonly canMarkPaidInvoice = canMarkPaidInvoice;
  protected readonly canVoidInvoice = canVoidInvoice;
  protected readonly canResendInvoiceEmail = canResendInvoiceEmail;

  protected readonly canManage = computed(() =>
    this.permissionStore.hasPermission('platform.subscriptions.manage'),
  );

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly invoice = signal<InvoiceDetailModel | null>(null);
  protected readonly pendingMarkPaid = signal(false);
  protected readonly pendingVoid = signal(false);
  protected readonly pendingResendEmail = signal(false);
  protected readonly markingPaid = signal(false);
  protected readonly voiding = signal(false);
  protected readonly resendingEmail = signal(false);

  protected readonly sortedAuditLogs = computed(() => {
    const logs = this.invoice()?.auditLogs ?? [];
    return [...logs].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
  });

  ngOnInit(): void {
    this.loadInvoice();
  }

  protected loadInvoice(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.invoicesService.getById(this.invoiceId).subscribe({
      next: (invoice) => {
        this.invoice.set(invoice);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 404) {
          this.errorMessage.set('Invoice not found.');
        } else {
          this.errorMessage.set('Something went wrong. Please try again.');
        }
        this.loading.set(false);
      },
    });
  }

  protected startMarkPaid(): void {
    this.pendingMarkPaid.set(true);
  }

  protected cancelMarkPaid(): void {
    this.pendingMarkPaid.set(false);
  }

  protected confirmMarkPaid(): void {
    this.pendingMarkPaid.set(false);
    this.markingPaid.set(true);

    this.invoicesService.markPaid(this.invoiceId).subscribe({
      next: () => {
        this.markingPaid.set(false);
        this.notificationService.success('Invoice marked as paid.');
        this.loadInvoice();
      },
      error: (error: HttpErrorResponse) => {
        this.markingPaid.set(false);
        this.notificationService.error(error.error?.detail ?? 'Could not mark the invoice as paid.');
      },
    });
  }

  protected startVoid(): void {
    this.pendingVoid.set(true);
  }

  protected cancelVoid(): void {
    this.pendingVoid.set(false);
  }

  protected confirmVoid(): void {
    this.pendingVoid.set(false);
    this.voiding.set(true);

    this.invoicesService.void(this.invoiceId).subscribe({
      next: () => {
        this.voiding.set(false);
        this.notificationService.success('Invoice voided.');
        this.loadInvoice();
      },
      error: (error: HttpErrorResponse) => {
        this.voiding.set(false);
        this.notificationService.error(error.error?.detail ?? 'Could not void the invoice.');
      },
    });
  }

  protected startResendEmail(): void {
    this.pendingResendEmail.set(true);
  }

  protected cancelResendEmail(): void {
    this.pendingResendEmail.set(false);
  }

  protected confirmResendEmail(): void {
    this.pendingResendEmail.set(false);
    this.resendingEmail.set(true);

    this.invoicesService.resendEmail(this.invoiceId).subscribe({
      next: (response) => {
        this.resendingEmail.set(false);
        this.notificationService.success(`Invoice email queued to ${response.recipientEmail}.`);
        this.loadInvoice();
      },
      error: (error: HttpErrorResponse) => {
        this.resendingEmail.set(false);
        this.notificationService.error(error.error?.detail ?? 'Could not resend the invoice email.');
      },
    });
  }

  protected auditActionLabel(log: BillingAuditLog): string {
    return log.action.replaceAll('.', ' · ');
  }
}
