import { Component, computed, inject, signal } from '@angular/core';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { AdminActionsLog } from '../admin-actions-log/admin-actions-log';
import { AuditLogsList } from '../audit-logs-list/audit-logs-list';

export type AuditLogsTab = 'admin-actions' | 'sign-in-events';

/** Audit Logs screen: privileged admin actions (F-07) and sign-in events, one tab each. */
@Component({
  selector: 'app-audit-logs-page',
  imports: [AdminActionsLog, AuditLogsList],
  templateUrl: './audit-logs-page.html',
})
export class AuditLogsPage {
  private readonly permissionStore = inject(PermissionStore);

  protected readonly canView = computed(() => this.permissionStore.hasPermission('platform.audit.read'));
  protected readonly activeTab = signal<AuditLogsTab>('admin-actions');

  protected readonly tabs: { id: AuditLogsTab; label: string }[] = [
    { id: 'admin-actions', label: 'Admin Actions' },
    { id: 'sign-in-events', label: 'Sign-in Events' },
  ];

  protected selectTab(tab: AuditLogsTab): void {
    this.activeTab.set(tab);
  }

  protected tabClass(tab: AuditLogsTab): string {
    return this.activeTab() === tab
      ? 'border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300'
      : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200';
  }
}
