import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { csrfInterceptor } from './csrf.interceptor';
import { CsrfTokenService } from '../auth/csrf-token.service';

describe('csrfInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let csrfTokenService: CsrfTokenService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([csrfInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    csrfTokenService = TestBed.inject(CsrfTokenService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('attaches X-CSRF-Token on POST when a token is present', () => {
    csrfTokenService.set('raw-csrf-token');

    http.post('/admin/v1/tenants', {}).subscribe();

    const req = httpMock.expectOne('/admin/v1/tenants');
    expect(req.request.headers.get('X-CSRF-Token')).toBe('raw-csrf-token');
    req.flush(null);
  });

  it('attaches X-CSRF-Token on PUT/PATCH/DELETE too', () => {
    csrfTokenService.set('raw-csrf-token');

    http.put('/admin/v1/tenants/1', {}).subscribe();
    http.patch('/admin/v1/tenants/1', {}).subscribe();
    http.delete('/admin/v1/tenants/1').subscribe();

    for (const req of httpMock.match('/admin/v1/tenants/1')) {
      expect(req.request.headers.get('X-CSRF-Token')).toBe('raw-csrf-token');
      req.flush(null);
    }
  });

  it('does not attach the header on GET requests', () => {
    csrfTokenService.set('raw-csrf-token');

    http.get('/admin/v1/tenants').subscribe();

    const req = httpMock.expectOne('/admin/v1/tenants');
    expect(req.request.headers.has('X-CSRF-Token')).toBe(false);
    req.flush(null);
  });

  it('sends no X-CSRF-Token header when no token is stored', () => {
    csrfTokenService.set(null);

    http.post('/admin/v1/tenants', {}).subscribe();

    const req = httpMock.expectOne('/admin/v1/tenants');
    expect(req.request.headers.has('X-CSRF-Token')).toBe(false);
    req.flush(null);
  });
});
