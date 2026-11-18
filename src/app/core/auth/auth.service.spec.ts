import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
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

describe('AuthService - session mapping (F-02 mandatory MFA)', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const wire = {
    platform_user_id: 'u1',
    email: 'admin@onexso.test',
    platform_role: 'Platform Super Admin',
    expires_at: '2026-12-01T00:00:00Z',
    mfa_required: false,
    permissions: ['platform.tenants.read'],
  };

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

  it('maps mfa_enrollment_required from the login response', () => {
    let enrollmentRequired: boolean | undefined;
    service.login({ email: 'admin@onexso.test', password: 'x' }).subscribe((context) => {
      enrollmentRequired = context.mfaEnrollmentRequired;
    });

    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush({ ...wire, mfa_enrollment_required: true });

    expect(enrollmentRequired).toBe(true);
  });

  it('treats a missing mfa_enrollment_required field as false', () => {
    let enrollmentRequired: boolean | undefined;
    service.loadContext().subscribe((context) => {
      enrollmentRequired = context.mfaEnrollmentRequired;
    });

    httpMock.expectOne(`${environment.apiUrl}/auth/me`).flush(wire);

    expect(enrollmentRequired).toBe(false);
  });
});
