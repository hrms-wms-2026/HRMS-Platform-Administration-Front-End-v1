import { Injectable, signal } from '@angular/core';
import { AuthContext } from './auth-context.model';
import { CurrentUser } from './current-user.model';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly _currentUser = signal<CurrentUser | null>(null);
  private readonly _isAuthenticated = signal(false);

  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = this._isAuthenticated.asReadonly();

  setSession(context: AuthContext): void {
    this._currentUser.set({
      id: context.userId,
      email: context.email,
      platformRole: context.platformRole,
    });
    this._isAuthenticated.set(true);
  }

  clearSession(): void {
    this._currentUser.set(null);
    this._isAuthenticated.set(false);
  }
}