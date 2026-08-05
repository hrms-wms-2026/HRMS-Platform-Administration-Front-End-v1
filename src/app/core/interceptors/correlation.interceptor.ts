import { HttpInterceptorFn } from '@angular/common/http';

export const correlationInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req.clone({ setHeaders: { 'X-Correlation-Id': crypto.randomUUID() } }));
};