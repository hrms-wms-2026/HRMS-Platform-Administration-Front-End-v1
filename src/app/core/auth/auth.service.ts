import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_ENDPOINTS } from '../config/api-endpoints';
import { AuthContext } from './auth-context.model';
import { environment } from '../../../environments/environment';
import { SessionService } from './session.service';

export interface LoginRequest {
  email: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private readonly sessionService = inject(SessionService);
  private readonly baseUrl = environment.apiUrl;

  login(request: LoginRequest): Observable<AuthContext> {
    return this.http.post<AuthContext>(`${this.baseUrl}${API_ENDPOINTS.auth.login}`, request, {
      withCredentials: true,
    });
  }

  loadContext(): Observable<AuthContext> {
    return this.http.get<AuthContext>(`${this.baseUrl}${API_ENDPOINTS.auth.context}`, {
      withCredentials: true,
    });
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
      .pipe(tap(() => this.sessionService.clearSession()));
  }
}