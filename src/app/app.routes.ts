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
        loadComponent: () =>
          import('./modules/dashboard/feature/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'tenants',
        loadComponent: () =>
          import('./modules/tenants/feature/tenants-list/tenants-list').then((m) => m.TenantsList),
      },
      {
        path: 'tenants/new',
        loadComponent: () =>
          import('./modules/tenants/feature/tenant-wizard/tenant-wizard').then((m) => m.TenantWizard),
      },
      {
        path: 'tenants/:id',
        loadComponent: () =>
          import('./modules/tenants/feature/tenant-detail/tenant-detail').then((m) => m.TenantDetailComponent),
      },
      {
        path: 'roles',
        loadComponent: () =>
          import('./modules/roles/feature/roles-list/roles-list').then((m) => m.RolesList),
      },
      {
        path: 'roles/:id',
        loadComponent: () =>
          import('./modules/roles/feature/role-detail/role-detail').then((m) => m.RoleDetail),
      },
      {
        path: 'subscription-plans',
        loadComponent: () =>
          import('./modules/subscription-plans/feature/subscription-plans-list/subscription-plans-list').then(
            (m) => m.SubscriptionPlansList,
          ),
      },
      {
        path: 'subscription-plans/new',
        loadComponent: () =>
          import('./modules/subscription-plans/feature/subscription-plan-create/subscription-plan-create').then(
            (m) => m.SubscriptionPlanCreate,
          ),
      },
      {
        path: 'subscription-plans/:id',
        loadComponent: () =>
          import('./modules/subscription-plans/feature/subscription-plan-detail/subscription-plan-detail').then(
            (m) => m.SubscriptionPlanDetail,
          ),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./modules/platform-users/feature/platform-users-list/platform-users-list').then(
            (m) => m.PlatformUsersList,
          ),
      },
      {
        path: 'settings/mfa',
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
        loadComponent: () =>
          import('./modules/audit-logs/feature/audit-logs-list/audit-logs-list').then(
            (m) => m.AuditLogsList,
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