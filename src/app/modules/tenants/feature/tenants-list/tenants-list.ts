import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TenantsService } from '../../data/tenants.service';
import { TenantListItem } from '../../data/tenant.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { Loader } from '../../../../shared/ui/loader/loader';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Pagination } from '../../../../shared/ui/pagination/pagination';
import { Button } from '../../../../shared/ui/button/button';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  active: 'success',
  trial: 'warning',
  provisioning: 'neutral',
  suspended: 'danger',
  cancelled: 'neutral',
};

@Component({
  selector: 'app-tenants-list',
  imports: [RouterLink, StatusBadge, Loader, ErrorBanner, EmptyState, Pagination, DatePipe, Button],
  templateUrl: './tenants-list.html',
})
export class TenantsList implements OnInit {
  private readonly tenantsService = inject(TenantsService);
  protected readonly permissionStore = inject(PermissionStore);

  protected readonly pageSize = PAGE_SIZE;

  protected readonly canView = computed(() => this.permissionStore.hasPermission('platform.tenants.read'));
  protected readonly canManage = computed(() => this.permissionStore.hasPermission('platform.tenants.manage'));

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly tenants = signal<TenantListItem[]>([]);
  protected readonly total = signal(0);
  protected readonly search = signal('');
  protected readonly statusFilter = signal('');
  protected readonly currentPage = signal(1);

  private searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void {
    if (!this.canView()) {
      return;
    }
    this.loadTenants();
  }

  protected onSearchChange(value: string): void {
    this.search.set(value);
    this.currentPage.set(1);

    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => this.loadTenants(), SEARCH_DEBOUNCE_MS);
  }

  protected onStatusFilterChange(value: string): void {
    this.statusFilter.set(value);
    this.currentPage.set(1);
    this.loadTenants();
  }

  protected goToPage(page: number): void {
    this.currentPage.set(page);
    this.loadTenants();
  }

  protected toneFor(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
    return STATUS_TONE[status] ?? 'neutral';
  }

  protected loadTenants(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.tenantsService
      .list({
        search: this.search(),
        status: this.statusFilter(),
        page: this.currentPage(),
        pageSize: PAGE_SIZE,
      })
      .subscribe({
        next: (response) => {
          this.tenants.set(response.items);
          this.total.set(response.total);
          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set('Something went wrong. Please try again.');
          this.loading.set(false);
        },
      });
  }
}
