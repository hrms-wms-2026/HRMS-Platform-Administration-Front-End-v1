import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

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
        data: { breadcrumb: { section: 'Platform', page: 'Tenants' } },
        loadComponent: () =>
          import('./modules/tenants/feature/tenants-list/tenants-list').then((m) => m.TenantsList),
      },
      {
        path: 'tenants/new',
        data: {
          breadcrumb: {
            section: 'Platform',
            parent: { label: 'Tenants', route: '/tenants' },
            page: 'New Tenant',
          },
        },
        loadComponent: () =>
          import('./modules/tenants/feature/tenant-wizard/tenant-wizard').then((m) => m.TenantWizard),
      },
      {
        path: 'tenants/:id',
        data: {
          breadcrumb: {
            section: 'Platform',
            parent: { label: 'Tenants', route: '/tenants' },
            page: 'Tenant Details',
          },
        },
        loadComponent: () =>
          import('./modules/tenants/feature/tenant-detail/tenant-detail').then((m) => m.TenantDetailComponent),
      },
      {
        path: 'roles',
        data: { breadcrumb: { section: 'Access Control', page: 'Roles' } },
        loadComponent: () =>
          import('./modules/roles/feature/roles-list/roles-list').then((m) => m.RolesList),
      },
      {
        path: 'roles/:id',
        data: {
          breadcrumb: {
            section: 'Access Control',
            parent: { label: 'Roles', route: '/roles' },
            page: 'Role Details',
          },
        },
        loadComponent: () =>
          import('./modules/roles/feature/role-detail/role-detail').then((m) => m.RoleDetail),
      },
      {
        path: 'subscription-plans',
        data: { breadcrumb: { section: 'Subscription & Billing', page: 'Subscription Plans' } },
        loadComponent: () =>
          import('./modules/subscription-plans/feature/subscription-plans-list/subscription-plans-list').then(
            (m) => m.SubscriptionPlansList,
          ),
      },
      {
        path: 'subscription-plans/new',
        data: {
          breadcrumb: {
            section: 'Subscription & Billing',
            parent: { label: 'Subscription Plans', route: '/subscription-plans' },
            page: 'New Plan',
          },
        },
        loadComponent: () =>
          import('./modules/subscription-plans/feature/subscription-plan-create/subscription-plan-create').then(
            (m) => m.SubscriptionPlanCreate,
          ),
      },
      {
        path: 'subscription-plans/:id',
        data: {
          breadcrumb: {
            section: 'Subscription & Billing',
            parent: { label: 'Subscription Plans', route: '/subscription-plans' },
            page: 'Plan Details',
          },
        },
        loadComponent: () =>
          import('./modules/subscription-plans/feature/subscription-plan-detail/subscription-plan-detail').then(
            (m) => m.SubscriptionPlanDetail,
          ),
      },
      {
        path: 'users',
        data: { breadcrumb: { section: 'Access Control', page: 'Users' } },
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
        data: { breadcrumb: { section: 'Security & Compliance', page: 'Audit Logs' } },
        loadComponent: () =>
          import('./modules/audit-logs/feature/audit-logs-list/audit-logs-list').then(
            (m) => m.AuditLogsList,
          ),
      },
      {
        path: 'system-config/oauth-apps',
        data: { breadcrumb: { section: 'Platform Configuration', page: 'OAuth Apps' } },
        loadComponent: () =>
          import('./modules/system-config/feature/oauth-apps-list/oauth-apps-list').then(
            (m) => m.OAuthAppsList,
          ),
      },
      {
        path: 'system-config/service-keys',
        data: { breadcrumb: { section: 'Platform Configuration', page: 'Service Keys' } },
        loadComponent: () =>
          import('./modules/system-config/feature/service-keys-list/service-keys-list').then(
            (m) => m.ServiceKeysList,
          ),
      },
      {
        path: 'system-config/providers',
        data: { breadcrumb: { section: 'Platform Configuration', page: 'Providers Overview' } },
        loadComponent: () =>
          import('./modules/system-config/feature/providers-overview/providers-overview').then(
            (m) => m.ProvidersOverview,
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
