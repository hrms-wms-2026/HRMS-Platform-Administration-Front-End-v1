import { HttpInterceptorFn } from '@angular/common/http';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const XSRF_COOKIE_NAME = 'admin_csrf';
const XSRF_HEADER_NAME = 'X-CSRF-Token';

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
  if (!MUTATING_METHODS.has(req.method)) {
    return next(req);
  }

  const token = readCookie(XSRF_COOKIE_NAME);
  if (!token) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { [XSRF_HEADER_NAME]: token } }));
};