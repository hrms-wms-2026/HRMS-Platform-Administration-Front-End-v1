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
    ],
  },
];