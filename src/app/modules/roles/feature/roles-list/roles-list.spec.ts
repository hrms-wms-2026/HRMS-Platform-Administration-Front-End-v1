import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { RolesList } from './roles-list';
import { PlatformRolesService } from '../../data/platform-roles.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';

describe('RolesList', () => {
  let rolesService: { listRoles: jest.Mock };

  function setup(permissions: string[] = ['platform.roles.read']) {
    rolesService = { listRoles: jest.fn() };

    TestBed.configureTestingModule({
      imports: [RolesList],
      providers: [provideRouter([]), { provide: PlatformRolesService, useValue: rolesService }],
    }).compileComponents();

    const fixture = TestBed.createComponent(RolesList);
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

  it('does not call the API and shows the no-permission message when unauthorized', () => {
    const fixture = setup([]);
    fixture.detectChanges();

    expect(rolesService.listRoles).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('No permission to view page');
  });

  it('loads roles on init when authorized', () => {
    const fixture = setup();
    rolesService.listRoles.mockReturnValue(
      of([
        {
          id: 'r1',
          name: 'Platform Super Admin',
          description: 'Full access',
          isSystemRole: true,
          createdAt: '2026-01-01T00:00:00Z',
        },
      ]),
    );
    fixture.detectChanges();

    expect(rolesService.listRoles).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Platform Super Admin');
  });
});
