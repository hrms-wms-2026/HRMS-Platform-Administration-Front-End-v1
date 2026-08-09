import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ModuleCatalogService } from './module-catalog.service';
import { environment } from '../../../../environments/environment';

describe('ModuleCatalogService', () => {
  let service: ModuleCatalogService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ModuleCatalogService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists the module catalog', () => {
    let result: unknown;
    service.list().subscribe((modules) => (result = modules));

    const req = httpMock.expectOne(`${environment.apiUrl}/modules/catalog`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);

    const module = {
      moduleKey: 'core-hr',
      name: 'Core HR',
      pillar: 'Organization Administration',
      phase: '1',
      pricingUnit: 'per_employee',
      isActive: true,
    };
    req.flush([module]);

    expect(result).toEqual([module]);
  });
});
