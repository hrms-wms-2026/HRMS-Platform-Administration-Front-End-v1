import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, retry, tap, throwError, timer } from 'rxjs';
import { SessionService } from '../auth/session.service';
import { PermissionStore } from '../permissions/permission.store';
import { ErrorHandlerService } from '../services/error-handler.service';
import { NotificationService } from '../services/notification.service';
import { CircuitBreakerService } from '../services/circuit-breaker.service';
import { LoggerService } from '../services/logger.service';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const sessionService = inject(SessionService);
  const permissionStore = inject(PermissionStore);
  const errorHandler = inject(ErrorHandlerService);
  const notification = inject(NotificationService);
  const circuitBreaker = inject(CircuitBreakerService);
  const logger = inject(LoggerService);

  return next(req).pipe(
    retry({
      count: MAX_RETRIES,
      delay: (error: unknown, retryCount) => {
        if (
          !(error instanceof HttpErrorResponse) ||
          !errorHandler.isRetryable(error) ||
          !circuitBreaker.canRequest()
        ) {
          throw error;
        }
        return timer(RETRY_DELAY_MS * retryCount);
      },
    }),
    tap(() => circuitBreaker.recordSuccess()),
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      const category = errorHandler.categorize(error);

      if (errorHandler.isRetryable(error)) {
        circuitBreaker.recordFailure();
      }

      logger.error(`HTTP ${req.method} ${req.urlWithParams} failed`, {
        status: error.status,
        category,
      });

      if (category === 'session-expired' && sessionService.isAuthenticated()) {
        sessionService.clearSession();
        permissionStore.clear();
        router.navigateByUrl('/auth/login');
      } else if (category !== 'session-expired' && category !== 'validation') {
        notification.error(errorHandler.messageFor(category));
      }

      return throwError(() => error);
    }),
  );
};
