import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { SessionService } from '../../../../core/auth/session.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { TenantsService } from '../../../tenants/data/tenants.service';
import { InvoicesService } from '../../../invoices/data/invoices.service';
import { ServiceKeysService } from '../../../system-config/data/service-keys.service';
import { OAuthAppsService } from '../../../system-config/data/oauth-apps.service';
import { PaymentGatewaysService } from '../../../system-config/data/payment-gateways.service';
import { AuditLogsService } from '../../../audit-logs/data/audit-logs.service';
import { AuditLogEntry } from '../../../audit-logs/data/audit-log.model';
import { MetricCard } from '../../../../shared/ui/metric-card/metric-card';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Button } from '../../../../shared/ui/button/button';

const TENANTS_PERMISSION = 'platform.tenants.read';
const BILLING_PERMISSION = 'platform.subscriptions.read';
const SYSTEM_CONFIG_PERMISSION = 'platform.system_config.read';
const AUDIT_PERMISSION = 'platform.audit.read';

interface TenantMetrics {
  total: number;
  active: number;
  suspended: number;
}

interface BillingMetrics {
  open: number;
  paid: number;
  overdue: number;
}

interface SystemConfigMetrics {
  serviceKeysConfigured: number;
  serviceKeysActive: number;
  paymentGatewaysConfigured: number;
  paymentGatewaysActive: number;
  oauthAppsConfigured: number;
  oauthAppsActive: number;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe, MetricCard, Skeleton, ErrorBanner, EmptyState, Button],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  private readonly sessionService = inject(SessionService);
  protected readonly permissionStore = inject(PermissionStore);
  private readonly tenantsService = inject(TenantsService);
  private readonly invoicesService = inject(InvoicesService);
  private readonly serviceKeysService = inject(ServiceKeysService);
  private readonly oauthAppsService = inject(OAuthAppsService);
  private readonly paymentGatewaysService = inject(PaymentGatewaysService);
  private readonly auditLogsService = inject(AuditLogsService);

  protected readonly currentUser = this.sessionService.currentUser;

  protected readonly canViewTenants = computed(() => this.permissionStore.canAccess(TENANTS_PERMISSION));
  protected readonly canViewBilling = computed(() => this.permissionStore.canAccess(BILLING_PERMISSION));
  protected readonly canViewSystemConfig = computed(() =>
    this.permissionStore.canAccess(SYSTEM_CONFIG_PERMISSION),
  );
  protected readonly canViewAudit = computed(() => this.permissionStore.canAccess(AUDIT_PERMISSION));

  protected readonly tenantsLoading = signal(false);
  protected readonly tenantsError = signal<string | null>(null);
  protected readonly tenantsMetrics = signal<TenantMetrics | null>(null);

  protected readonly billingLoading = signal(false);
  protected readonly billingError = signal<string | null>(null);
  protected readonly billingMetrics = signal<BillingMetrics | null>(null);

  protected readonly systemConfigLoading = signal(false);
  protected readonly systemConfigError = signal<string | null>(null);
  protected readonly systemConfigMetrics = signal<SystemConfigMetrics | null>(null);

  protected readonly auditLoading = signal(false);
  protected readonly auditError = signal<string | null>(null);
  protected readonly auditLogs = signal<AuditLogEntry[] | null>(null);

  ngOnInit(): void {
    this.loadAll();
  }

  protected refresh(): void {
    this.loadAll();
  }

  private loadAll(): void {
    if (this.canViewTenants()) {
      this.loadTenants();
    }
    if (this.canViewBilling()) {
      this.loadBilling();
    }
    if (this.canViewSystemConfig()) {
      this.loadSystemConfig();
    }
    if (this.canViewAudit()) {
      this.loadAudit();
    }
  }

  protected loadTenants(): void {
    this.tenantsLoading.set(true);
    this.tenantsError.set(null);

    forkJoin({
      total: this.tenantsService.list({ search: '', status: '', page: 1, pageSize: 1 }),
      active: this.tenantsService.list({ search: '', status: 'active', page: 1, pageSize: 1 }),
      suspended: this.tenantsService.list({ search: '', status: 'suspended', page: 1, pageSize: 1 }),
    }).subscribe({
      next: ({ total, active, suspended }) => {
        this.tenantsMetrics.set({
          total: total.total,
          active: active.total,
          suspended: suspended.total,
        });
        this.tenantsLoading.set(false);
      },
      error: () => {
        this.tenantsError.set('Could not load tenant metrics.');
        this.tenantsLoading.set(false);
      },
    });
  }

  protected loadBilling(): void {
    this.billingLoading.set(true);
    this.billingError.set(null);

    forkJoin({
      open: this.invoicesService.list({ status: 'open', page: 1, pageSize: 100 }),
      paid: this.invoicesService.list({ status: 'paid', page: 1, pageSize: 1 }),
    }).subscribe({
      next: ({ open, paid }) => {
        const now = Date.now();
        const overdue = open.items.filter((invoice) => invoice.dueAt && new Date(invoice.dueAt).getTime() < now);

        this.billingMetrics.set({
          open: open.total,
          paid: paid.total,
          overdue: overdue.length,
        });
        this.billingLoading.set(false);
      },
      error: () => {
        this.billingError.set('Could not load billing metrics.');
        this.billingLoading.set(false);
      },
    });
  }

  protected loadSystemConfig(): void {
    this.systemConfigLoading.set(true);
    this.systemConfigError.set(null);

    forkJoin({
      serviceKeys: this.serviceKeysService.list(),
      paymentGateways: this.paymentGatewaysService.list(),
      oauthApps: this.oauthAppsService.list(),
    }).subscribe({
      next: ({ serviceKeys, paymentGateways, oauthApps }) => {
        this.systemConfigMetrics.set({
          serviceKeysConfigured: serviceKeys.length,
          serviceKeysActive: serviceKeys.filter((key) => key.isActive).length,
          paymentGatewaysConfigured: paymentGateways.length,
          paymentGatewaysActive: paymentGateways.filter((gateway) => gateway.isActive).length,
          oauthAppsConfigured: oauthApps.length,
          oauthAppsActive: oauthApps.filter((app) => app.isActive).length,
        });
        this.systemConfigLoading.set(false);
      },
      error: () => {
        this.systemConfigError.set('Could not load system configuration health.');
        this.systemConfigLoading.set(false);
      },
    });
  }

  protected loadAudit(): void {
    this.auditLoading.set(true);
    this.auditError.set(null);

    this.auditLogsService.list().subscribe({
      next: (entries) => {
        const sorted = [...entries].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        this.auditLogs.set(sorted);
        this.auditLoading.set(false);
      },
      error: () => {
        this.auditError.set('Security activity unavailable.');
        this.auditLoading.set(false);
      },
    });
  }
}
