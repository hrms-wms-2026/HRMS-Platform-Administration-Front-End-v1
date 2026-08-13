import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { RoleTemplatesList } from './role-templates-list';
import { RoleTemplatesService } from '../../data/role-templates.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';

describe('RoleTemplatesList', () => {
  let roleTemplatesService: { list: jest.Mock };

  const sampleTemplate = {
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

  function setup(permissions: string[] = ['platform.templates.read', 'platform.templates.manage']) {
    roleTemplatesService = { list: jest.fn().mockReturnValue(of([sampleTemplate])) };

    TestBed.configureTestingModule({
      imports: [RoleTemplatesList],
      providers: [
        provideRouter([]),
        { provide: RoleTemplatesService, useValue: roleTemplatesService },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(RoleTemplatesList);
    const store = TestBed.inject(PermissionStore);
    store.setAuthorizationContext({
      userId: 'u1',
      email: 'admin@example.com',
      platformRole: 'Platform Super Admin',
      expiresAt: '',
      mfaRequired: false,
      permissions,
      scopes: {},
      entitlements: [],
    });
    return fixture;
  }

  it('does not call the API when unauthorized', () => {
    const fixture = setup([]);
    fixture.detectChanges();

    expect(roleTemplatesService.list).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('No permission to view page');
  });

  it('loads and displays templates when authorized', () => {
    const fixture = setup();
    fixture.detectChanges();

    expect(roleTemplatesService.list).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('HR Manager');
    expect(fixture.nativeElement.textContent).toContain('Role Templates');
  });
});
