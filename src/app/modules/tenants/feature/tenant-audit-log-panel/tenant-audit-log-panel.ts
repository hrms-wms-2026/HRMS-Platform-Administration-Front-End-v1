import { Component, OnInit, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TenantAdminService } from '../../data/tenant-admin.service';
import { TenantAuditLogEntry } from '../../data/tenant-admin.model';
import { TableSkeleton } from '../../../../shared/ui/table-skeleton/table-skeleton';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Pagination } from '../../../../shared/ui/pagination/pagination';

const PAGE_SIZE = 25;

@Component({
  selector: 'app-tenant-audit-log-panel',
  imports: [DatePipe, TableSkeleton, ErrorBanner, EmptyState, Pagination],
  templateUrl: './tenant-audit-log-panel.html',
})
export class TenantAuditLogPanel implements OnInit {
  private readonly tenantAdminService = inject(TenantAdminService);

  readonly tenantId = input.required<string>();

  protected readonly pageSize = PAGE_SIZE;
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly entries = signal<TenantAuditLogEntry[]>([]);
  protected readonly total = signal(0);
  protected readonly currentPage = signal(1);

  ngOnInit(): void {
    this.loadEntries();
  }

  protected goToPage(page: number): void {
    this.currentPage.set(page);
    this.loadEntries();
  }

  protected loadEntries(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.tenantAdminService.listAuditLog(this.tenantId(), this.currentPage(), PAGE_SIZE).subscribe({
      next: (response) => {
        this.entries.set(response.items);
        this.total.set(response.totalCount);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load the audit log.');
        this.loading.set(false);
      },
    });
  }
}
