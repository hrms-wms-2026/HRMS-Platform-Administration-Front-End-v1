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

  it('gets a module by key', () => {
    let result: unknown;
    service.getById('core-hr').subscribe((module) => (result = module));

    const req = httpMock.expectOne(`${environment.apiUrl}/modules/catalog/core-hr`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);

    const detail = {
      moduleKey: 'core-hr',
      name: 'Core HR',
      pillar: 'Organization Administration',
      phase: '1',
      pricingUnit: 'per_employee',
      pricingReference: 'PR-CHR-STD',
      storageReference: 'ST-CHR-10',
      aiTokenReference: 'AI-CHR-1K',
      isAiEnabled: false,
      isStorageConsuming: true,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: null,
    };
    req.flush(detail);

    expect(result).toEqual(detail);
  });

  it('lists module features', () => {
    let result: unknown;
    service.listFeatures('core-hr').subscribe((features) => (result = features));

    const req = httpMock.expectOne(`${environment.apiUrl}/modules/catalog/core-hr/features`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);

    const feature = {
      featureKey: 'employee-profiles',
      name: 'Employee Profiles',
      description: 'Manage employee records.',
      isDefaultIncluded: true,
      isActive: true,
    };
    req.flush([feature]);

    expect(result).toEqual([feature]);
  });

  it('lists module permissions', () => {
    let result: unknown;
    service.listPermissions('core-hr').subscribe((permissions) => (result = permissions));

    const req = httpMock.expectOne(`${environment.apiUrl}/modules/catalog/core-hr/permissions`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);

    const permission = { permissionCode: 'core_hr.employees.read', isDefaultPermission: true };
    req.flush([permission]);

    expect(result).toEqual([permission]);
  });
});
