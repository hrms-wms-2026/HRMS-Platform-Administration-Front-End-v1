import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { CsrfTokenService } from '../auth/csrf-token.service';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const XSRF_HEADER_NAME = 'X-CSRF-Token';

export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
  if (!MUTATING_METHODS.has(req.method)) {
    return next(req);
  }

  const token = inject(CsrfTokenService).get();
  if (!token) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { [XSRF_HEADER_NAME]: token } }));
};
