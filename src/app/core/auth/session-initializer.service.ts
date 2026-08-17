import { Injectable, inject } from '@angular/core';
import { catchError, firstValueFrom, of, timeout } from 'rxjs';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { PermissionStore } from '../permissions/permission.store';

const SESSION_BOOTSTRAP_TIMEOUT_MS = 3000;

@Injectable({ providedIn: 'root' })
export class SessionInitializerService {
  private readonly authService = inject(AuthService);
  private readonly sessionService = inject(SessionService);
  private readonly permissionStore = inject(PermissionStore);

  async initialize(): Promise<void> {
    const context = await firstValueFrom(
      this.authService.loadContext().pipe(
        timeout(SESSION_BOOTSTRAP_TIMEOUT_MS),
        catchError(() => of(null)),
      ),
    );

    if (context) {
      this.sessionService.setSession(context);
      this.permissionStore.setAuthorizationContext(context);
    }
  }
}