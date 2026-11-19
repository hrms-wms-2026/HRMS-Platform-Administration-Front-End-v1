import { Component, OnInit, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { TenantAdminService } from '../../data/tenant-admin.service';
import { TenantSession } from '../../data/tenant-admin.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { TableSkeleton } from '../../../../shared/ui/table-skeleton/table-skeleton';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Button } from '../../../../shared/ui/button/button';
import { ConfirmationDialog } from '../../../../shared/ui/confirmation-dialog/confirmation-dialog';

@Component({
  selector: 'app-tenant-sessions-panel',
  imports: [DatePipe, TableSkeleton, ErrorBanner, EmptyState, Button, ConfirmationDialog],
  templateUrl: './tenant-sessions-panel.html',
})
export class TenantSessionsPanel implements OnInit {
  private readonly tenantAdminService = inject(TenantAdminService);
  private readonly notificationService = inject(NotificationService);

  readonly tenantId = input.required<string>();
  readonly canManage = input(false);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly sessions = signal<TenantSession[]>([]);
  protected readonly pendingRevoke = signal<TenantSession | null>(null);
  protected readonly revokingId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadSessions();
  }

  protected loadSessions(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.tenantAdminService.listSessions(this.tenantId()).subscribe({
      next: (sessions) => {
        this.sessions.set(sessions);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load live sessions.');
        this.loading.set(false);
      },
    });
  }

  protected startRevoke(session: TenantSession): void {
    this.pendingRevoke.set(session);
  }

  protected cancelRevoke(): void {
    this.pendingRevoke.set(null);
  }

  protected confirmRevoke(): void {
    const session = this.pendingRevoke();
    if (!session) {
      return;
    }
    this.pendingRevoke.set(null);
    this.revokingId.set(session.id);

    this.tenantAdminService.revokeSession(this.tenantId(), session.id).subscribe({
      next: () => {
        this.revokingId.set(null);
        this.notificationService.success('Session revoked.');
        this.sessions.update((current) => current.filter((s) => s.id !== session.id));
      },
      error: (error: HttpErrorResponse) => {
        this.revokingId.set(null);
        this.notificationService.error(error.error?.detail ?? 'Could not revoke the session.');
      },
    });
  }
}
