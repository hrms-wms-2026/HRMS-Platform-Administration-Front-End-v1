import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TenantsService } from './tenants.service';
import { environment } from '../../../../environments/environment';

describe('TenantsService', () => {
  let service: TenantsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TenantsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists tenants with search, status, and pagination as query params', () => {
    service
      .list({ search: 'acme', status: 'active', page: 2, pageSize: 25 })
      .subscribe();

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${environment.apiUrl}/tenants` &&
        r.params.get('search') === 'acme' &&
        r.params.get('status') === 'active' &&
        r.params.get('page') === '2' &&
        r.params.get('page_size') === '25',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ items: [], total: 0, page: 2, pageSize: 25 });
  });

  it('omits empty search and status from the query params', () => {
    service.list({ search: '', status: '', page: 1, pageSize: 25 }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/tenants?page=1&page_size=25`);
    expect(req.request.params.has('search')).toBe(false);
    expect(req.request.params.has('status')).toBe(false);
    req.flush({ items: [], total: 0, page: 1, pageSize: 25 });
  });

  it('maps the snake_case detail response to a camelCase TenantDetail', () => {
    let result: unknown;
    service.getById('tenant-1').subscribe((detail) => (result = detail));

    const req = httpMock.expectOne(`${environment.apiUrl}/tenants/tenant-1`);
    expect(req.request.method).toBe('GET');
    req.flush({
      id: 'tenant-1',
      company_name: 'Acme Inc',
      slug: 'acme',
      industry_profile: 'technology',
      company_size_range: '11-50',
      status: 'active',
      subscription_plan_id: null,
      settings_json: null,
      legal_entity_name: 'Acme Legal LLC',
      registration_number: 'REG123',
      country: 'US',
      currency: 'USD',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: null,
    });

    expect(result).toEqual({
      id: 'tenant-1',
      companyName: 'Acme Inc',
      slug: 'acme',
      industryProfile: 'technology',
      companySizeRange: '11-50',
      status: 'active',
      subscriptionPlanId: null,
      settingsJson: null,
      legalEntityName: 'Acme Legal LLC',
      registrationNumber: 'REG123',
      country: 'US',
      currency: 'USD',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: null,
    });
  });

  it('sends the status change action and reason', () => {
    service.changeStatus('tenant-1', 'suspend', 'Non-payment').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/tenants/tenant-1/status`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ action: 'suspend', reason: 'Non-payment' });
    expect(req.request.withCredentials).toBe(true);
    req.flush(null);
  });
});
