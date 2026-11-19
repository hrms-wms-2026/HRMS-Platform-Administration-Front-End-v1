import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ModuleCatalogDetail } from './module-catalog-detail';
import { ModuleCatalogService } from '../../data/module-catalog.service';

describe('ModuleCatalogDetail', () => {
  let moduleCatalogService: { getById: jest.Mock; listFeatures: jest.Mock; listPermissions: jest.Mock };

  const moduleDetail = {
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

  function setup() {
    moduleCatalogService = {
      getById: jest.fn().mockReturnValue(of(moduleDetail)),
      listFeatures: jest.fn().mockReturnValue(of([])),
      listPermissions: jest.fn().mockReturnValue(of([])),
    };

    TestBed.configureTestingModule({
      imports: [ModuleCatalogDetail],
      providers: [
        { provide: ModuleCatalogService, useValue: moduleCatalogService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ moduleKey: 'core-hr' }) } },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ModuleCatalogDetail);
    fixture.detectChanges();
    return fixture;
  }

  it('loads module detail, features, and permissions in parallel', () => {
    const fixture = setup();

    expect(moduleCatalogService.getById).toHaveBeenCalledWith('core-hr');
    expect(moduleCatalogService.listFeatures).toHaveBeenCalledWith('core-hr');
    expect(moduleCatalogService.listPermissions).toHaveBeenCalledWith('core-hr');
    expect(fixture.nativeElement.textContent).toContain('Core HR');
  });

  it('renders features and permissions once loaded', () => {
    moduleCatalogService = {
      getById: jest.fn().mockReturnValue(of(moduleDetail)),
      listFeatures: jest.fn().mockReturnValue(
        of([
          {
            featureKey: 'employee-profiles',
            name: 'Employee Profiles',
            description: 'Manage employee records.',
            isDefaultIncluded: true,
            isActive: true,
          },
        ]),
      ),
      listPermissions: jest.fn().mockReturnValue(
        of([{ permissionCode: 'core_hr.employees.read', isDefaultPermission: true }]),
      ),
    };

    TestBed.configureTestingModule({
      imports: [ModuleCatalogDetail],
      providers: [
        { provide: ModuleCatalogService, useValue: moduleCatalogService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ moduleKey: 'core-hr' }) } },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ModuleCatalogDetail);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Employee Profiles');
    expect(fixture.nativeElement.textContent).toContain('core_hr.employees.read');
  });

  it('shows an error banner when loading fails', () => {
    moduleCatalogService = {
      getById: jest.fn().mockReturnValue(throwError(() => new Error('not found'))),
      listFeatures: jest.fn().mockReturnValue(of([])),
      listPermissions: jest.fn().mockReturnValue(of([])),
    };

    TestBed.configureTestingModule({
      imports: [ModuleCatalogDetail],
      providers: [
        { provide: ModuleCatalogService, useValue: moduleCatalogService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ moduleKey: 'core-hr' }) } },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ModuleCatalogDetail);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Something went wrong. Please try again.');
  });
});
