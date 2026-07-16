import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../config/api-endpoints';
import { AuthContext } from './auth-context.model';

export interface LoginRequest {
  email: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  login(request: LoginRequest): Observable<AuthContext> {
    return this.http.post<AuthContext>(API_ENDPOINTS.auth.login, request, {
      withCredentials: true,
    });
  }

  loadContext(): Observable<AuthContext> {
    return this.http.get<AuthContext>(API_ENDPOINTS.auth.context, {
      withCredentials: true,
    });
  }

  refresh(): Observable<void> {
    return this.http.post<void>(API_ENDPOINTS.auth.refresh, {}, { withCredentials: true });
  }

  logout(): Observable<void> {
    return this.http.post<void>(API_ENDPOINTS.auth.logout, {}, { withCredentials: true });
  }
}