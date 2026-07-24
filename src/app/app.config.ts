import {
  ApplicationConfig,
  Injector,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  inject,
  runInInjectionContext,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { SessionInitializerService } from './core/auth/session-initializer.service';
import { correlationInterceptor } from './core/interceptors/correlation.interceptor';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { csrfInterceptor } from './core/interceptors/csrf.interceptor';
import { loggingInterceptor } from './core/interceptors/logging.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(
      withFetch(),
      withInterceptors([
        correlationInterceptor,
        authInterceptor,
        csrfInterceptor,
        loggingInterceptor,
        errorInterceptor,
      ]),
    ),
    provideAppInitializer(() => {
      const injector = inject(Injector);
      return runInInjectionContext(injector, () => {
        const initializer = inject(SessionInitializerService);
        return initializer.initialize();
      });
    }),
  ],
};