import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ConfigurationTemplatesService } from './configuration-templates.service';
import { environment } from '../../../../environments/environment';

describe('ConfigurationTemplatesService', () => {
  let service: ConfigurationTemplatesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ConfigurationTemplatesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  const template = {
    id: 'tpl-1',
    templateKey: 'starter_config',
    templateType: 'configuration',
    name: 'Starter Configuration',
    description: null,
    version: 1,
    moduleKeys: ['core_hr'],
    industryProfileTag: 'technology',
    payloadJson: { flags: { strict_compliance: true } },
    isSystem: false,
    isActive: true,
    createdById: 'user-1',
    createdAt: '2026-08-01T00:00:00+00:00',
    updatedAt: null,
  };

  it('lists configuration templates with query params', () => {
    let result: unknown;
    service
      .list({ templateType: 'configuration', activeOnly: true, industryTag: 'technology', page: 2, pageSize: 25 })
      .subscribe((r) => (result = r));

    const req = httpMock.expectOne(
      `${environment.apiUrl}/configuration-templates?page=2&page_size=25&type=configuration&active_only=true&industry_tag=technology`,
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ items: [template], totalCount: 1, page: 2, pageSize: 25 });

    expect(result).toEqual({ items: [template], totalCount: 1, page: 2, pageSize: 25 });
  });

  it('gets a configuration template detail by id', () => {
    service.getById('tpl-1').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/configuration-templates/tpl-1`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ template, applyHistory: [] });
  });

  it('creates a configuration template', () => {
    const request = {
      templateKey: 'starter_config',
      templateType: 'configuration',
      name: 'Starter Configuration',
      description: null,
      moduleKeys: ['core_hr'],
      industryProfileTag: null,
      payloadJson: {},
      isSystem: false,
    };

    let result: unknown;
    service.create(request).subscribe((t) => (result = t));

    const req = httpMock.expectOne(`${environment.apiUrl}/configuration-templates`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    expect(req.request.withCredentials).toBe(true);
    req.flush(template);

    expect(result).toEqual(template);
  });

  it('updates a configuration template', () => {
    const request = { name: 'Renamed', payloadJson: { flags: {} } };

    let result: unknown;
    service.update('tpl-1', request).subscribe((t) => (result = t));

    const req = httpMock.expectOne(`${environment.apiUrl}/configuration-templates/tpl-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(request);
    expect(req.request.withCredentials).toBe(true);
    req.flush(template);

    expect(result).toEqual(template);
  });

  it('deactivates a configuration template', () => {
    service.deactivate('tpl-1').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/configuration-templates/tpl-1`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.withCredentials).toBe(true);
    req.flush(template);
  });

  it('clones a configuration template', () => {
    service.clone('tpl-1').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/configuration-templates/tpl-1/clone`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    req.flush(template);
  });

  it('applies a configuration template to a tenant', () => {
    const result = { applicationId: 'app-1', appliedVersion: 1, warnings: ['Execution deferred'] };

    let received: unknown;
    service.applyToTenant('tenant-1', 'tpl-1', false).subscribe((r) => (received = r));

    const req = httpMock.expectOne(
      `${environment.apiUrl}/tenants/tenant-1/configuration-templates/tpl-1/apply`,
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ forceUpdate: false });
    expect(req.request.withCredentials).toBe(true);
    req.flush(result);

    expect(received).toEqual(result);
  });
});
