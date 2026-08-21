import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { CsrfTokenService } from './csrf-token.service';
import { environment } from '../../../environments/environment';

describe('AuthService - password recovery', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('forgotPassword posts the email with credentials to the forgot-password endpoint', () => {
    service.forgotPassword('admin@onexso.test').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/forgot-password`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.body).toEqual({ email: 'admin@onexso.test' });
    req.flush(null);
  });

  it('resetPassword posts the token and new password with credentials to the reset-password endpoint', () => {
    service.resetPassword('raw-token', 'NewPassphrase123').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/reset-password`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.body).toEqual({ token: 'raw-token', newPassword: 'NewPassphrase123' });
    req.flush(null);
  });

  it('acceptInvite posts token and password', () => {
    service.acceptInvite('raw-token', 'NewPassword1!').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/accept-invite`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ token: 'raw-token', password: 'NewPassword1!' });
    req.flush(null);
  });
});

describe('AuthService - CSRF token capture', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let csrfTokenService: CsrfTokenService;

  const sessionResponse = {
    platform_user_id: 'u1',
    email: 'admin@example.com',
    platform_role: 'Platform Super Admin',
    expires_at: '2026-01-01T00:00:00Z',
    mfa_required: false,
    permissions: [],
    csrf_token: 'raw-csrf-token',
  };

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    csrfTokenService = TestBed.inject(CsrfTokenService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('login() stores the csrf_token from the response', () => {
    service.login({ email: 'admin@example.com', password: 'pw' }).subscribe();

    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(sessionResponse);

    expect(csrfTokenService.get()).toBe('raw-csrf-token');
  });

  it('loadContext() (GET /me) refreshes the stored csrf_token', () => {
    service.loadContext().subscribe();

    httpMock
      .expectOne(`${environment.apiUrl}/auth/me`)
      .flush({ ...sessionResponse, csrf_token: 'refreshed-token' });

    expect(csrfTokenService.get()).toBe('refreshed-token');
  });

  it('verifyMfa() stores the csrf_token once MFA completes', () => {
    service.verifyMfa('123456').subscribe();

    httpMock.expectOne(`${environment.apiUrl}/auth/mfa/verify`).flush(sessionResponse);

    expect(csrfTokenService.get()).toBe('raw-csrf-token');
  });

  it('logout() clears the stored csrf_token', () => {
    csrfTokenService.set('raw-csrf-token');

    service.logout().subscribe();

    httpMock.expectOne(`${environment.apiUrl}/auth/logout`).flush(null);

    expect(csrfTokenService.get()).toBeNull();
  });
});
