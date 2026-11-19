import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { RoleTemplatesService } from './role-templates.service';
import { environment } from '../../../../environments/environment';

describe('RoleTemplatesService', () => {
  let service: RoleTemplatesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RoleTemplatesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists role templates', () => {
    let result: unknown;
    service.list().subscribe((items) => (result = items));

    const req = httpMock.expectOne(`${environment.apiUrl}/role-templates`);
    expect(req.request.method).toBe('GET');

    const template = {
      id: 'template-1',
      name: 'HR Manager',
      description: 'Default HR manager role',
      moduleKeys: ['core_hr'],
      permissionCodes: ['employees.read'],
      isSystem: false,
      version: 1,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: null,
    };
    req.flush([template]);

    expect(result).toEqual([template]);
  });

  it('updates a role template', () => {
    let result: unknown;
    service
      .update('template-1', {
        name: 'HR Manager',
        moduleKeys: ['core_hr'],
        permissionCodes: ['employees.read'],
        isActive: true,
      })
      .subscribe((item) => (result = item));

    const req = httpMock.expectOne(`${environment.apiUrl}/role-templates/template-1`);
    expect(req.request.method).toBe('PATCH');
    req.flush({
      id: 'template-1',
      name: 'HR Manager',
      description: null,
      moduleKeys: ['core_hr'],
      permissionCodes: ['employees.read'],
      isSystem: false,
      version: 2,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    });

    expect(result).toBeTruthy();
  });
});
