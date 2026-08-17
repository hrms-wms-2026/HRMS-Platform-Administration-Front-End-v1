import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { IntegrationCatalogService } from './integration-catalog.service';
import { environment } from '../../../../environments/environment';

describe('IntegrationCatalogService', () => {
  let service: IntegrationCatalogService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(IntegrationCatalogService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists integrations', () => {
    let result: unknown;
    service.list().subscribe((items) => (result = items));

    const req = httpMock.expectOne(`${environment.apiUrl}/system-config/integrations`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);

    const item = {
      integrationKey: 'github',
      displayName: 'GitHub',
      description: null,
      connectionScope: 'user',
      onevoAppProvider: 'github',
      logoUrl: null,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      linkedModuleKeys: ['work_management'],
    };
    req.flush([item]);

    expect(result).toEqual([item]);
  });

  it('links a module to an integration', () => {
    let completed = false;
    service.linkModule('github', 'work_management').subscribe(() => (completed = true));

    const req = httpMock.expectOne(
      `${environment.apiUrl}/system-config/integrations/github/modules/work_management`,
    );
    expect(req.request.method).toBe('POST');
    req.flush(null);

    expect(completed).toBe(true);
  });
});
