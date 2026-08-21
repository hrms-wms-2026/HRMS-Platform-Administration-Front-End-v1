import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'admin_csrf_token';

/**
 * Holds the admin CSRF token client-side (sessionStorage + in-memory signal), not a cookie.
 * Chrome rejects any cookie whose Domain attribute involves "localhost" (treats it as a public
 * suffix), so the admin SPA (admin.localhost) can never read a cookie set by the API on a
 * different host via document.cookie - the token has to travel in the JSON body of
 * login/mfa-verify/me instead. sessionStorage survives page reloads within the same tab; a fresh
 * tab has none until its own /me call supplies one.
 */
@Injectable({ providedIn: 'root' })
export class CsrfTokenService {
  private readonly token = signal<string | null>(sessionStorage.getItem(STORAGE_KEY));

  get(): string | null {
    return this.token();
  }

  set(value: string | null): void {
    this.token.set(value || null);
    if (value) {
      sessionStorage.setItem(STORAGE_KEY, value);
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }
}
