import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AuditLogsService } from '../../data/audit-logs.service';
import { AuditLogEntry } from '../../data/audit-log.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { Loader } from '../../../../shared/ui/loader/loader';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';

@Component({
  selector: 'app-audit-logs-list',
  imports: [Loader, ErrorBanner, EmptyState, DatePipe],
  templateUrl: './audit-logs-list.html',
})
export class AuditLogsList implements OnInit {
  private readonly auditLogsService = inject(AuditLogsService);
  protected readonly permissionStore = inject(PermissionStore);

  protected readonly canView = computed(() => this.permissionStore.hasPermission('platform.audit.read'));

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly events = signal<AuditLogEntry[]>([]);

  ngOnInit(): void {
    if (!this.canView()) {
      return;
    }
    this.loadEvents();
  }

  protected loadEvents(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.auditLogsService.list().subscribe({
      next: (events) => {
        this.events.set(events);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Something went wrong. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
