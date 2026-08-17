import { Component, HostListener, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { PermissionStore } from '../../../core/permissions/permission.store';
import { MobileNavService } from '../mobile-nav.service';

export interface SidebarNavItem {
  label: string;
  route: string;
  icon: string;
  permission?: string;
  exact?: boolean;
}

export interface SidebarNavSection {
  label: string;
  indent: boolean;
  items: SidebarNavItem[];
}

const NAV_SECTIONS: SidebarNavSection[] = [
  {
    label: 'Platform',
    indent: false,
    items: [
      { label: 'Dashboard', route: '/', icon: 'dashboard', exact: true },
      { label: 'Tenants', route: '/tenants', icon: 'tenants', permission: 'platform.tenants.read' },
    ],
  },
  {
    label: 'Access Control',
    indent: true,
    items: [
      { label: 'Users', route: '/users', icon: 'users', permission: 'platform.accounts.read' },
      { label: 'Roles', route: '/roles', icon: 'roles', permission: 'platform.roles.read' },
    ],
  },
  {
    label: 'Subscription & Billing',
    indent: true,
    items: [
      {
        label: 'Subscription Plans',
        route: '/subscription-plans',
        icon: 'subscription-plans',
        permission: 'platform.subscriptions.read',
      },
      { label: 'Invoices', route: '/invoices', icon: 'invoices', permission: 'platform.subscriptions.read' },
    ],
  },
  {
    label: 'Template Management',
    indent: true,
    items: [
      {
        label: 'Configuration Templates',
        route: '/configuration-templates',
        icon: 'configuration-templates',
        permission: 'platform.templates.read',
      },
      {
        label: 'Role Templates',
        route: '/role-templates',
        icon: 'role-templates',
        permission: 'platform.templates.read',
      },
    ],
  },
  {
    label: 'System Config',
    indent: true,
    items: [
      {
        label: 'Providers',
        route: '/system-config/providers',
        icon: 'providers',
        permission: 'platform.system_config.read',
      },
      {
        label: 'Integration Catalog',
        route: '/system-config/integrations',
        icon: 'integration-catalog',
        permission: 'platform.system_config.read',
      },
      {
        label: 'Service Keys',
        route: '/system-config/service-keys',
        icon: 'service-keys',
        permission: 'platform.system_config.read',
      },
      {
        label: 'OAuth Apps',
        route: '/system-config/oauth-apps',
        icon: 'oauth-apps',
        permission: 'platform.system_config.read',
      },
      {
        label: 'Payment Gateways',
        route: '/system-config/payment-gateways',
        icon: 'payment-gateways',
        permission: 'platform.system_config.read',
      },
      {
        label: 'Tenant Integrations',
        route: '/system-config/tenant-integrations',
        icon: 'tenant-integrations',
        permission: 'platform.system_config.read',
      },
    ],
  },
  {
    label: 'Security & Compliance',
    indent: true,
    items: [
      { label: 'Audit Logs', route: '/audit-logs', icon: 'audit-logs', permission: 'platform.audit.read' },
      {
        label: 'Legal Documents',
        route: '/legal-documents',
        icon: 'legal-documents',
        permission: 'platform.compliance.read',
      },
    ],
  },
];

@Component({
  selector: 'app-sidebar',
  host: { class: 'block h-full min-h-0 shrink-0' },
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
})
export class Sidebar {
  private readonly permissionStore = inject(PermissionStore);
  protected readonly mobileNav = inject(MobileNavService);

  protected readonly sections = computed<SidebarNavSection[]>(() =>
    NAV_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter((item) => this.permissionStore.canAccess(item.permission)),
    })).filter((section) => section.items.length > 0),
  );

  protected onNavLinkClick(): void {
    this.mobileNav.close();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.mobileNav.open()) {
      this.mobileNav.close();
    }
  }
}
