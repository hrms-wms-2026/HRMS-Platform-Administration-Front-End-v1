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
