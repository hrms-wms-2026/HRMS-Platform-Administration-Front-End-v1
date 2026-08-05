import { HttpEventType, HttpInterceptorFn } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export const loggingInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.enableDebugLogs) {
    return next(req);
  }

  const startedAt = performance.now();

  return next(req).pipe(
    tap({
      next: (event) => {
        if (event.type === HttpEventType.Response) {
          const durationMs = Math.round(performance.now() - startedAt);
          console.debug(`[HTTP] ${req.method} ${req.urlWithParams} → ${event.status} (${durationMs}ms)`);
        }
      },
      error: (error) => {
        const durationMs = Math.round(performance.now() - startedAt);
        console.debug(`[HTTP] ${req.method} ${req.urlWithParams} → FAILED (${durationMs}ms)`, error);
      },
    }),
  );
};