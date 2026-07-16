import { Injectable, inject } from '@angular/core';
import { catchError, firstValueFrom, of } from 'rxjs';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';

@Injectable({ providedIn: 'root' })
export class SessionInitializerService {
  private readonly authService = inject(AuthService);
  private readonly sessionService = inject(SessionService);

  async initialize(): Promise<void> {
    const context = await firstValueFrom(
      this.authService.loadContext().pipe(catchError(() => of(null))),
    );

    if (context) {
      this.sessionService.setSession(context);
    }
  }
}