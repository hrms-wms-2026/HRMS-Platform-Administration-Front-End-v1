import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { API_ENDPOINTS } from '../config/api-endpoints';
import { AuthContext } from './auth-context.model';
import { MfaSetupResponse } from './mfa-setup-response.model';
import { SessionService } from './session.service';
import { PermissionStore } from '../permissions/permission.store';
import { environment } from '../../../environments/environment';

export interface LoginRequest {
  email: string;
  password: string;
}

/** Wire shape returned by admin/v1/auth/login, /me, and /mfa/verify. */
interface AdminSessionResponse {
  platform_user_id: string;
  email: string;
  platform_role: string;
  expires_at: string;
  mfa_required: boolean;
  permissions?: string[];
}

function toAuthContext(response: AdminSessionResponse): AuthContext {
  return {
    userId: response.platform_user_id,
    email: response.email,
    platformRole: response.platform_role,
    expiresAt: response.expires_at,
    mfaRequired: response.mfa_required,
    permissions: response.permissions ?? [],
    scopes: {},
    entitlements: [],
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private readonly sessionService = inject(SessionService);
  private readonly permissionStore = inject(PermissionStore);
  private readonly baseUrl = environment.apiUrl;

  login(request: LoginRequest): Observable<AuthContext> {
    return this.http
      .post<AdminSessionResponse>(`${this.baseUrl}${API_ENDPOINTS.auth.login}`, request, {
        withCredentials: true,
      })
      .pipe(map(toAuthContext));
  }

  loadContext(): Observable<AuthContext> {
    return this.http
      .get<AdminSessionResponse>(`${this.baseUrl}${API_ENDPOINTS.auth.context}`, {
        withCredentials: true,
      })
      .pipe(map(toAuthContext));
  }

  refresh(): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}${API_ENDPOINTS.auth.refresh}`,
      {},
      { withCredentials: true },
    );
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}${API_ENDPOINTS.auth.logout}`, {}, { withCredentials: true })
      .pipe(
        tap(() => {
          this.sessionService.clearSession();
          this.permissionStore.clear();
        }),
      );
  }

  enableMfa(): Observable<MfaSetupResponse> {
    return this.http.post<MfaSetupResponse>(
      `${this.baseUrl}${API_ENDPOINTS.auth.mfaEnable}`,
      {},
      { withCredentials: true },
    );
  }

  confirmMfaSetup(code: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(
      `${this.baseUrl}${API_ENDPOINTS.auth.mfaConfirmSetup}`,
      { code },
      { withCredentials: true },
    );
  }

  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}${API_ENDPOINTS.auth.forgotPassword}`,
      { email },
      { withCredentials: true },
    );
  }

  resetPassword(token: string, newPassword: string): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}${API_ENDPOINTS.auth.resetPassword}`,
      { token, newPassword },
      { withCredentials: true },
    );
  }

  verifyMfa(code: string): Observable<AuthContext> {
    return this.http
      .post<AdminSessionResponse>(
        `${this.baseUrl}${API_ENDPOINTS.auth.mfaVerify}`,
        { code },
        { withCredentials: true },
      )
      .pipe(map(toAuthContext));
  }
}