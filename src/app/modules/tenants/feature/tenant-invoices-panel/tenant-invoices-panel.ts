import { Component, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { InvoicesService } from '../../../invoices/data/invoices.service';
import { InvoiceSummary, formatInvoiceAmount, invoiceStatusTone } from '../../../invoices/data/invoice.model';
import { TableSkeleton } from '../../../../shared/ui/table-skeleton/table-skeleton';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { Button } from '../../../../shared/ui/button/button';

const RECENT_INVOICE_LIMIT = 5;

@Component({
  selector: 'app-tenant-invoices-panel',
  imports: [
    RouterLink,
    DatePipe,
    TitleCasePipe,
    TableSkeleton,
    ErrorBanner,
    EmptyState,
    StatusBadge,
    Button,
  ],
  templateUrl: './tenant-invoices-panel.html',
})
export class TenantInvoicesPanel {
  private readonly invoicesService = inject(InvoicesService);

  readonly tenantId = input.required<string>();

  protected readonly invoiceStatusTone = invoiceStatusTone;
  protected readonly formatInvoiceAmount = formatInvoiceAmount;

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly invoices = signal<InvoiceSummary[]>([]);

  constructor() {
    effect(() => {
      const tenantId = this.tenantId();
      if (tenantId) {
        this.loadInvoices(tenantId);
      }
    });
  }

  protected loadInvoices(tenantId: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.invoicesService.listByTenant(tenantId).subscribe({
      next: (response) => {
        this.invoices.set(response.items.slice(0, RECENT_INVOICE_LIMIT));
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load tenant invoices.');
        this.invoices.set([]);
        this.loading.set(false);
      },
    });
  }
}
