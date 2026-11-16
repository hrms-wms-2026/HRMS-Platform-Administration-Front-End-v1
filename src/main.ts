import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { environment } from './environments/environment';

// Local dev serves this app on every *.<root> host; on a non-admin host every admin call is
// refused, so move to the admin host before anything starts (see buildAdminHostRedirectUrl).
if (environment.adminHostRedirectUrl) {
  window.location.replace(environment.adminHostRedirectUrl);
} else {
  bootstrapApplication(App, appConfig)
    .catch((err) => console.error(err));
}
