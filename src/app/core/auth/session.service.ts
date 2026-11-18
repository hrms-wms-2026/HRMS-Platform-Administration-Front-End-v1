import { Injectable, signal } from '@angular/core';
import { AuthContext } from './auth-context.model';
import { CurrentUser } from './current-user.model';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly _currentUser = signal<CurrentUser | null>(null);
  private readonly _isAuthenticated = signal(false);
  private readonly _mfaEnrollmentRequired = signal(false);

  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = this._isAuthenticated.asReadonly();
  /** F-02: the signed-in admin must enroll MFA before using the console. */
  readonly mfaEnrollmentRequired = this._mfaEnrollmentRequired.asReadonly();

  setSession(context: AuthContext): void {
    this._currentUser.set({
      id: context.userId,
      email: context.email,
      platformRole: context.platformRole,
    });
    this._isAuthenticated.set(true);
    this._mfaEnrollmentRequired.set(context.mfaEnrollmentRequired);
  }

  clearSession(): void {
    this._currentUser.set(null);
    this._isAuthenticated.set(false);
    this._mfaEnrollmentRequired.set(false);
  }
}