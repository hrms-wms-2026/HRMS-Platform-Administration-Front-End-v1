import {
  ApplicationConfig,
  Injector,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  inject,
  runInInjectionContext,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';

import { routes } from './app.routes';
import { SessionInitializerService } from './core/auth/session-initializer.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch()),
    provideAppInitializer(() => {
      const injector = inject(Injector);
      return runInInjectionContext(injector, () => {
        const initializer = inject(SessionInitializerService);
        return initializer.initialize();
      });
    }),
  ],
};