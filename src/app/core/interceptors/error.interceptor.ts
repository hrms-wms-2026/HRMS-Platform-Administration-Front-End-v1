import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SessionService } from '../auth/session.service';
import { PermissionStore } from '../permissions/permission.store';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const sessionService = inject(SessionService);
  const permissionStore = inject(PermissionStore);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        sessionService.isAuthenticated()
      ) {
        sessionService.clearSession();
        permissionStore.clear();
        router.navigateByUrl('/auth/login');
      }

      return throwError(() => error);
    }),
  );
};