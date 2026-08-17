import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layouts/main-layout/main-layout').then((m) => m.MainLayout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        data: { breadcrumb: { section: 'Platform', page: 'Dashboard' } },
        loadComponent: () =>
          import('./modules/dashboard/feature/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'tenants',
        canActivate: [permissionGuard],
        data: {
          breadcrumb: { section: 'Platform', page: 'Tenants' },
          permission: 'platform.tenants.read',
        },
        loadComponent: () =>
          import('./modules/tenants/feature/tenants-list/tenants-list').then((m) => m.TenantsList),
      },
      {
        path: 'tenants/new',
        canActivate: [permissionGuard],
        data: {
          breadcrumb: {
            section: 'Platform',
            parent: { label: 'Tenants', route: '/tenants' },
            page: 'New Tenant',
          },
          permission: 'platform.tenants.manage',
        },
        loadComponent: () =>
          import('./modules/tenants/feature/tenant-wizard/tenant-wizard').then((m) => m.TenantWizard),
      },
      {
        path: 'tenants/:id',
        canActivate: [permissionGuard],
        data: {
          breadcrumb: {
            section: 'Platform',
            parent: { label: 'Tenants', route: '/tenants' },
            page: 'Tenant Details',
          },
          permission: 'platform.tenants.read',
        },
        loadComponent: () =>
          import('./modules/tenants/feature/tenant-detail/tenant-detail').then((m) => m.TenantDetailComponent),
      },
      {
        path: 'roles',
        canActivate: [permissionGuard],
        data: {
          breadcrumb: { section: 'Access Control', page: 'Roles' },
          permission: 'platform.roles.read',
        },
        loadComponent: () =>
          import('./modules/roles/feature/roles-list/roles-list').then((m) => m.RolesList),
      },
      {
        path: 'roles/:id',
        canActivate: [permissionGuard],
        data: {
          breadcrumb: {
            section: 'Access Control',
            parent: { label: 'Roles', route: '/roles' },
            page: 'Role Details',
          },
          permission: 'platform.roles.read',
        },
        loadComponent: () =>
          import('./modules/roles/feature/role-detail/role-detail').then((m) => m.RoleDetail),
      },
      {
        path: 'subscription-plans',
        canActivate: [permissionGuard],
        data: {
          breadcrumb: { section: 'Subscription & Billing', page: 'Subscription Plans' },
          permission: 'platform.subscriptions.read',
        },
        loadComponent: () =>
          import('./modules/subscription-plans/feature/subscription-plans-list/subscription-plans-list').then(
            (m) => m.SubscriptionPlansList,
          ),
      },
      {
        path: 'subscription-plans/new',
        canActivate: [permissionGuard],
        data: {
          breadcrumb: {
            section: 'Subscription & Billing',
            parent: { label: 'Subscription Plans', route: '/subscription-plans' },
            page: 'New Plan',
          },
          permission: 'platform.subscriptions.manage',
        },
        loadComponent: () =>
          import('./modules/subscription-plans/feature/subscription-plan-create/subscription-plan-create').then(
            (m) => m.SubscriptionPlanCreate,
          ),
      },
      {
        path: 'subscription-plans/:id',
        canActivate: [permissionGuard],
        data: {
          breadcrumb: {
            section: 'Subscription & Billing',
            parent: { label: 'Subscription Plans', route: '/subscription-plans' },
            page: 'Plan Details',
          },
          permission: 'platform.subscriptions.read',
        },
        loadComponent: () =>
          import('./modules/subscription-plans/feature/subscription-plan-detail/subscription-plan-detail').then(
            (m) => m.SubscriptionPlanDetail,
          ),
      },
      {
        path: 'invoices',
        canActivate: [permissionGuard],
        data: {
          breadcrumb: { section: 'Subscription & Billing', page: 'Invoices' },
          permission: 'platform.subscriptions.read',
        },
        loadComponent: () =>
          import('./modules/invoices/feature/invoices-list/invoices-list').then((m) => m.InvoicesList),
      },
      {
        path: 'module-catalog',
        canActivate: [permissionGuard],
        data: {
          breadcrumb: { section: 'Subscription & Billing', page: 'Module Catalog' },
          permission: 'platform.module_catalog.read',
        },
        loadComponent: () =>
          import('./modules/module-catalog/feature/module-catalog-list/module-catalog-list').then(
            (m) => m.ModuleCatalogList,
          ),
      },
      {
        path: 'module-catalog/:moduleKey',
        canActivate: [permissionGuard],
        data: {
          breadcrumb: {
            section: 'Subscription & Billing',
            parent: { label: 'Module Catalog', route: '/module-catalog' },
            page: 'Module Details',
          },
          permission: 'platform.module_catalog.read',
        },
        loadComponent: () =>
          import('./modules/module-catalog/feature/module-catalog-detail/module-catalog-detail').then(
            (m) => m.ModuleCatalogDetail,
          ),
      },
      {
        path: 'invoices/:id',
        canActivate: [permissionGuard],
        data: {
          breadcrumb: {
            section: 'Subscription & Billing',
            parent: { label: 'Invoices', route: '/invoices' },
            page: 'Invoice Details',
          },
          permission: 'platform.subscriptions.read',
        },
        loadComponent: () =>
          import('./modules/invoices/feature/invoice-detail/invoice-detail').then((m) => m.InvoiceDetail),
      },
      {
        path: 'configuration-templates',
        canActivate: [permissionGuard],
        data: {
          breadcrumb: { section: 'Template Management', page: 'Configuration Templates' },
          permission: 'platform.templates.read',
        },
        loadComponent: () =>
          import('./modules/configuration-templates/feature/configuration-templates-list/configuration-templates-list').then(
            (m) => m.ConfigurationTemplatesList,
          ),
      },
      {
        path: 'configuration-templates/new',
        canActivate: [permissionGuard],
        data: {
          breadcrumb: {
            section: 'Template Management',
            parent: { label: 'Configuration Templates', route: '/configuration-templates' },
            page: 'New Template',
          },
          permission: 'platform.templates.manage',
        },
        loadComponent: () =>
          import('./modules/configuration-templates/feature/configuration-template-create/configuration-template-create').then(
            (m) => m.ConfigurationTemplateCreate,
          ),
      },
      {
        path: 'configuration-templates/:id',
        canActivate: [permissionGuard],
        data: {
          breadcrumb: {
            section: 'Template Management',
            parent: { label: 'Configuration Templates', route: '/configuration-templates' },
            page: 'Template Details',
          },
          permission: 'platform.templates.read',
        },
        loadComponent: () =>
          import('./modules/configuration-templates/feature/configuration-template-detail/configuration-template-detail').then(
            (m) => m.ConfigurationTemplateDetail,
          ),
      },
      {
        path: 'role-templates',
        canActivate: [permissionGuard],
        data: {
          breadcrumb: { section: 'Template Management', page: 'Role Templates' },
          permission: 'platform.templates.read',
        },
        loadComponent: () =>
          import('./modules/role-templates/feature/role-templates-list/role-templates-list').then(
            (m) => m.RoleTemplatesList,
          ),
      },
      {
        path: 'role-templates/new',
        canActivate: [permissionGuard],
        data: {
          breadcrumb: {
            section: 'Template Management',
            parent: { label: 'Role Templates', route: '/role-templates' },
            page: 'New Template',
          },
          permission: 'platform.templates.manage',
        },
        loadComponent: () =>
          import('./modules/role-templates/feature/role-template-create/role-template-create').then(
            (m) => m.RoleTemplateCreate,
          ),
      },
      {
        path: 'role-templates/:id',
        canActivate: [permissionGuard],
        data: {
          breadcrumb: {
            section: 'Template Management',
            parent: { label: 'Role Templates', route: '/role-templates' },
            page: 'Template Details',
          },
          permission: 'platform.templates.read',
        },
        loadComponent: () =>
          import('./modules/role-templates/feature/role-template-detail/role-template-detail').then(
            (m) => m.RoleTemplateDetail,
          ),
      },
      {
        path: 'users',
        canActivate: [permissionGuard],
        data: {
          breadcrumb: { section: 'Access Control', page: 'Users' },
          permission: 'platform.accounts.read',
        },
        loadComponent: () =>
          import('./modules/platform-users/feature/platform-users-list/platform-users-list').then(
            (m) => m.PlatformUsersList,
          ),
      },
      {
        path: 'settings/mfa',
        data: { breadcrumb: { page: 'Two-Factor Authentication' } },
        loadComponent: () =>
          import('./modules/auth/feature/mfa-setup/mfa-setup').then((m) => m.MfaSetup),
      },
      {
        path: 'access-denied',
        loadComponent: () =>
          import('./modules/shared/feature/access-denied/access-denied').then(
            (m) => m.AccessDenied,
          ),
      },
      {
        path: 'audit-logs',
        canActivate: [permissionGuard],
        data: {
          breadcrumb: { section: 'Security & Compliance', page: 'Audit Logs' },
          permission: 'platform.audit.read',
        },
        loadComponent: () =>
          import('./modules/audit-logs/feature/audit-logs-list/audit-logs-list').then(
            (m) => m.AuditLogsList,
          ),
      },
      {
        path: 'legal-documents',
        canActivate: [permissionGuard],
        data: {
          breadcrumb: { section: 'Security & Compliance', page: 'Legal Documents' },
          permission: 'platform.compliance.read',
        },
        loadComponent: () =>
          import('./modules/legal-compliance/feature/legal-documents-list/legal-documents-list').then(
            (m) => m.LegalDocumentsList,
          ),
      },
      {
        path: 'legal-documents/new',
        canActivate: [permissionGuard],
        data: {
          breadcrumb: {
            section: 'Security & Compliance',
            parent: { label: 'Legal Documents', route: '/legal-documents' },
            page: 'New Document',
          },
          permission: 'platform.compliance.manage',
        },
        loadComponent: () =>
          import('./modules/legal-compliance/feature/legal-document-create/legal-document-create').then(
            (m) => m.LegalDocumentCreate,
          ),
      },
      {
        path: 'legal-documents/:id',
        canActivate: [permissionGuard],
        data: {
          breadcrumb: {
            section: 'Security & Compliance',
            parent: { label: 'Legal Documents', route: '/legal-documents' },
            page: 'Document Details',
          },
          permission: 'platform.compliance.read',
        },
        loadComponent: () =>
          import('./modules/legal-compliance/feature/legal-document-detail/legal-document-detail').then(
            (m) => m.LegalDocumentDetail,
          ),
      },
      {
        path: 'system-config/oauth-apps',
        canActivate: [permissionGuard],
        data: {
          breadcrumb: { section: 'Platform Configuration', page: 'OAuth Apps' },
          permission: 'platform.system_config.read',
        },
        loadComponent: () =>
          import('./modules/system-config/feature/oauth-apps-list/oauth-apps-list').then(
            (m) => m.OAuthAppsList,
          ),
      },
      {
        path: 'system-config/service-keys',
        canActivate: [permissionGuard],
        data: {
          breadcrumb: { section: 'Platform Configuration', page: 'Service Keys' },
          permission: 'platform.system_config.read',
        },
        loadComponent: () =>
          import('./modules/system-config/feature/service-keys-list/service-keys-list').then(
            (m) => m.ServiceKeysList,
          ),
      },
      {
        path: 'system-config/providers',
        canActivate: [permissionGuard],
        data: {
          breadcrumb: { section: 'Platform Configuration', page: 'Providers Overview' },
          permission: 'platform.system_config.read',
        },
        loadComponent: () =>
          import('./modules/system-config/feature/providers-overview/providers-overview').then(
            (m) => m.ProvidersOverview,
          ),
      },
      {
        path: 'system-config/integrations',
        canActivate: [permissionGuard],
        data: {
          breadcrumb: { section: 'Platform Configuration', page: 'Integration Catalog' },
          permission: 'platform.system_config.read',
        },
        loadComponent: () =>
          import('./modules/system-config/feature/integration-catalog-list/integration-catalog-list').then(
            (m) => m.IntegrationCatalogList,
          ),
      },
      {
        path: 'system-config/payment-gateways',
        canActivate: [permissionGuard],
        data: {
          breadcrumb: { section: 'Platform Configuration', page: 'Payment Gateways' },
          permission: 'platform.system_config.read',
        },
        loadComponent: () =>
          import('./modules/system-config/feature/payment-gateways-list/payment-gateways-list').then(
            (m) => m.PaymentGatewaysList,
          ),
      },
      {
        path: 'system-config/tenant-integrations',
        canActivate: [permissionGuard],
        data: {
          breadcrumb: { section: 'Platform Configuration', page: 'Tenant Integrations' },
          permission: 'platform.system_config.read',
        },
        loadComponent: () =>
          import('./modules/system-config/feature/tenant-integrations-list/tenant-integrations-list').then(
            (m) => m.TenantIntegrationsList,
          ),
      },
      {
        path: 'support/announcements',
        canActivate: [permissionGuard],
        data: {
          breadcrumb: { section: 'Support', page: 'Announcements' },
          permission: 'platform.support.read',
        },
        loadComponent: () =>
          import('./modules/support/feature/announcements-list/announcements-list').then(
            (m) => m.AnnouncementsList,
          ),
      },
      {
        path: 'support/announcements/new',
        canActivate: [permissionGuard],
        data: {
          breadcrumb: {
            section: 'Support',
            parent: { label: 'Announcements', route: '/support/announcements' },
            page: 'New Announcement',
          },
          permission: 'platform.support.manage',
        },
        loadComponent: () =>
          import('./modules/support/feature/announcement-create/announcement-create').then(
            (m) => m.AnnouncementCreate,
          ),
      },
      {
        path: 'support/tickets',
        canActivate: [permissionGuard],
        data: {
          breadcrumb: { section: 'Support', page: 'Support Tickets' },
          permission: 'platform.support.read',
        },
        loadComponent: () =>
          import('./modules/support/feature/support-tickets-list/support-tickets-list').then(
            (m) => m.SupportTicketsList,
          ),
      },
      {
        path: 'support/tickets/new',
        canActivate: [permissionGuard],
        data: {
          breadcrumb: {
            section: 'Support',
            parent: { label: 'Support Tickets', route: '/support/tickets' },
            page: 'New Ticket',
          },
          permission: 'platform.support.manage',
        },
        loadComponent: () =>
          import('./modules/support/feature/support-ticket-create/support-ticket-create').then(
            (m) => m.SupportTicketCreate,
          ),
      },
      {
        path: 'support/tickets/:id',
        canActivate: [permissionGuard],
        data: {
          breadcrumb: {
            section: 'Support',
            parent: { label: 'Support Tickets', route: '/support/tickets' },
            page: 'Ticket Details',
          },
          permission: 'platform.support.read',
        },
        loadComponent: () =>
          import('./modules/support/feature/support-ticket-detail/support-ticket-detail').then(
            (m) => m.SupportTicketDetail,
          ),
      },
    ],
  },
  {
    path: 'auth',
    loadComponent: () =>
      import('./layouts/auth-layout/auth-layout').then((m) => m.AuthLayout),
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./modules/auth/feature/login/login').then((m) => m.Login),
      },
      {
        path: 'mfa-verify',
        loadComponent: () =>
          import('./modules/auth/feature/mfa-verify/mfa-verify').then((m) => m.MfaVerify),
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./modules/auth/feature/forgot-password/forgot-password').then(
            (m) => m.ForgotPassword,
          ),
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./modules/auth/feature/reset-password/reset-password').then(
            (m) => m.ResetPassword,
          ),
      },
      {
        path: 'accept-invite',
        loadComponent: () =>
          import('./modules/auth/feature/accept-invite/accept-invite').then(
            (m) => m.AcceptInvite,
          ),
      },
    ],
  },
];
