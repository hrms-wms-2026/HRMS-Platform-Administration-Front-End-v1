import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { InvoicesService } from '../../data/invoices.service';
import {
  INVOICE_STATUS_OPTIONS,
  InvoiceSummary,
  formatInvoiceAmount,
  formatInvoicePeriod,
  invoiceStatusTone,
  shortTenantLabel,
} from '../../data/invoice.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { TableSkeleton } from '../../../../shared/ui/table-skeleton/table-skeleton';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { Button } from '../../../../shared/ui/button/button';
import { Pagination } from '../../../../shared/ui/pagination/pagination';

@Component({
  selector: 'app-invoices-list',
  imports: [
    RouterLink,
    DatePipe,
    TitleCasePipe,
    TableSkeleton,
    ErrorBanner,
    EmptyState,
    StatusBadge,
    Button,
    Pagination,
  ],
  templateUrl: './invoices-list.html',
})
export class InvoicesList implements OnInit {
  private readonly invoicesService = inject(InvoicesService);
  protected readonly permissionStore = inject(PermissionStore);

  protected readonly statusOptions = INVOICE_STATUS_OPTIONS;
  protected readonly invoiceStatusTone = invoiceStatusTone;
  protected readonly formatInvoiceAmount = formatInvoiceAmount;
  protected readonly formatInvoicePeriod = formatInvoicePeriod;
  protected readonly shortTenantLabel = shortTenantLabel;

  protected readonly canView = computed(() => this.permissionStore.hasPermission('platform.subscriptions.read'));

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly invoices = signal<InvoiceSummary[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly pageSize = signal(25);
  protected readonly statusFilter = signal('');
  protected readonly fromFilter = signal('');
  protected readonly toFilter = signal('');

  ngOnInit(): void {
    if (!this.canView()) {
      return;
    }
    this.loadInvoices();
  }

  protected loadInvoices(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.invoicesService
      .list({
        status: this.statusFilter() || undefined,
        from: this.fromFilter() ? new Date(this.fromFilter()).toISOString() : undefined,
        to: this.toFilter() ? new Date(this.toFilter()).toISOString() : undefined,
        page: this.page(),
        pageSize: this.pageSize(),
      })
      .subscribe({
        next: (response) => {
          this.invoices.set(response.items);
          this.total.set(response.total);
          this.page.set(response.page);
          this.pageSize.set(response.pageSize);
          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set('Something went wrong. Please try again.');
          this.loading.set(false);
        },
      });
  }

  protected onFilterChange(): void {
    this.page.set(1);
    this.loadInvoices();
  }

  protected clearFilters(): void {
    this.statusFilter.set('');
    this.fromFilter.set('');
    this.toFilter.set('');
    this.page.set(1);
    this.loadInvoices();
  }

  protected onPageChange(nextPage: number): void {
    this.page.set(nextPage);
    this.loadInvoices();
  }
}
