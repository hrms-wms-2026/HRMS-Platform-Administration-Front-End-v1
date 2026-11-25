import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RateLimitsService } from './rate-limits.service';
import { rateLimitErrorMessage } from './rate-limit.model';
import { environment } from '../../../../environments/environment';

describe('RateLimitsService', () => {
  let service: RateLimitsService;
  let httpMock: HttpTestingController;
  const api = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(RateLimitsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists the global limits with credentials', () => {
    service.listGlobal().subscribe();
    const req = httpMock.expectOne(`${api}/system-config/rate-limits`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush([]);
  });

  it('reads a plan and a tenant', () => {
    service.getPlan('p1').subscribe();
    service.getTenant('t1').subscribe();
    const plan = httpMock.expectOne(`${api}/subscription-plans/p1/rate-limits`);
    const tenant = httpMock.expectOne(`${api}/tenants/t1/rate-limits`);
    expect(plan.request.withCredentials).toBe(true);
    expect(tenant.request.withCredentials).toBe(true);
    plan.flush({ subscriptionPlanId: 'p1', limits: [] });
    tenant.flush({ tenantId: 't1', limits: [] });
  });

  it('pages the change history with only the filters given', () => {
    service.listChanges({ scope: 'global', page: 2, pageSize: 10 }).subscribe();
    const req = httpMock.expectOne((r) => r.url === `${api}/system-config/rate-limits/changes`);
    expect(req.request.params.get('scope')).toBe('global');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('pageSize')).toBe('10');
    expect(req.request.params.has('tenantId')).toBe(false);
    expect(req.request.withCredentials).toBe(true);
    req.flush({ items: [], pageNumber: 2, pageSize: 10, totalCount: 0 });
  });

  it.each([
    [{ scope: 'global' } as const, '/system-config/rate-limits/SignedIn'],
    [{ scope: 'plan', planId: 'p1' } as const, '/subscription-plans/p1/rate-limits/SignedIn'],
    [{ scope: 'tenant', tenantId: 't1' } as const, '/tenants/t1/rate-limits/SignedIn'],
  ])('saves with PUT to the right URL for %o', (target, path) => {
    const body = { perMinute: 600, burst: 100, reason: 'Import week', rowVersion: 'AAAA' };
    service.set(target, 'SignedIn', body).subscribe();
    const req = httpMock.expectOne(`${api}${path}`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    expect(req.request.withCredentials).toBe(true);
    req.flush({});
  });

  it('removes with DELETE and sends the reason and row version in the body', () => {
    service.remove({ scope: 'tenant', tenantId: 't1' }, 'TrayDevice', 'Back to plan', 'BBBB').subscribe();
    const req = httpMock.expectOne(`${api}/tenants/t1/rate-limits/TrayDevice`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toEqual({ reason: 'Back to plan', rowVersion: 'BBBB' });
    expect(req.request.withCredentials).toBe(true);
    req.flush({});
  });
});

describe('rateLimitErrorMessage', () => {
  it('explains a 409 as a change by someone else', () => {
    expect(rateLimitErrorMessage(new HttpErrorResponse({ status: 409 }), 'x')).toContain('Someone else changed');
  });

  it('uses the problem detail, then the first field error, then the fallback', () => {
    expect(rateLimitErrorMessage(new HttpErrorResponse({ status: 422, error: { detail: 'Too high.' } }), 'x')).toBe('Too high.');
    expect(
      rateLimitErrorMessage(new HttpErrorResponse({ status: 400, error: { errors: { PerMinute: ['Must be a multiple of 60.'] } } }), 'x'),
    ).toBe('Must be a multiple of 60.');
    expect(rateLimitErrorMessage(new HttpErrorResponse({ status: 500 }), 'fallback')).toBe('fallback');
  });
});
