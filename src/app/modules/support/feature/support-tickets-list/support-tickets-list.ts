import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SupportTicketsService } from '../../data/support-tickets.service';
import {
  SUPPORT_TICKET_PRIORITY_OPTIONS,
  SUPPORT_TICKET_STATUS_OPTIONS,
  SupportTicketSummary,
  shortTicketId,
  supportTicketPriorityTone,
  supportTicketStatusTone,
} from '../../data/support-ticket.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { Loader } from '../../../../shared/ui/loader/loader';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Pagination } from '../../../../shared/ui/pagination/pagination';
import { Button } from '../../../../shared/ui/button/button';

const PAGE_SIZE = 25;

@Component({
  selector: 'app-support-tickets-list',
  imports: [RouterLink, StatusBadge, Loader, ErrorBanner, EmptyState, Pagination, DatePipe, Button],
  templateUrl: './support-tickets-list.html',
})
export class SupportTicketsList implements OnInit {
  private readonly ticketsService = inject(SupportTicketsService);
  protected readonly permissionStore = inject(PermissionStore);

  protected readonly pageSize = PAGE_SIZE;
  protected readonly statusOptions = SUPPORT_TICKET_STATUS_OPTIONS;
  protected readonly priorityOptions = SUPPORT_TICKET_PRIORITY_OPTIONS;

  protected readonly canView = computed(() => this.permissionStore.hasPermission('platform.support.read'));
  protected readonly canManage = computed(() => this.permissionStore.hasPermission('platform.support.manage'));

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly tickets = signal<SupportTicketSummary[]>([]);
  protected readonly total = signal(0);
  protected readonly statusFilter = signal('');
  protected readonly priorityFilter = signal('');
  protected readonly currentPage = signal(1);

  protected readonly statusTone = supportTicketStatusTone;
  protected readonly priorityTone = supportTicketPriorityTone;
  protected readonly shortId = shortTicketId;

  ngOnInit(): void {
    if (!this.canView()) {
      return;
    }
    this.loadTickets();
  }

  protected onStatusFilterChange(value: string): void {
    this.statusFilter.set(value);
    this.currentPage.set(1);
    this.loadTickets();
  }

  protected onPriorityFilterChange(value: string): void {
    this.priorityFilter.set(value);
    this.currentPage.set(1);
    this.loadTickets();
  }

  protected goToPage(page: number): void {
    this.currentPage.set(page);
    this.loadTickets();
  }

  protected loadTickets(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.ticketsService
      .list({
        status: this.statusFilter(),
        priority: this.priorityFilter(),
        page: this.currentPage(),
        pageSize: PAGE_SIZE,
      })
      .subscribe({
        next: (response) => {
          this.tickets.set(response.items);
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
