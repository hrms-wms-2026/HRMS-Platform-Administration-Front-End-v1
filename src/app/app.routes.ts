import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layouts/main-layout/main-layout').then((m) => m.MainLayout),
    children: [
      // authenticated business routes
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
    ],
  },
];
