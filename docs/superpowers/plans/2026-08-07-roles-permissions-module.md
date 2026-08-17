# Roles & Permissions Module Implementation Plan (List, Detail, Permission Editing)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a working Roles & Permissions screen (role list, role detail with a module-grouped, editable permission checklist) to `platform-administration`, consuming the already-complete `PlatformAccessController` roles/permissions endpoints.

**Architecture:** Standard Angular feature module under `modules/roles/`, mirroring `modules/tenants/`'s `data/` + `feature/` split. Two routed components (`RolesList`, `RoleDetail`) backed by one `PlatformRolesService`.

**Tech Stack:** Angular 21 standalone components/signals, `HttpClient`, existing shared UI (`Button`, `StatusBadge`, `Loader`, `ErrorBanner`, `EmptyState`).

## Global Constraints

- Frontend only — `PlatformAccessController`'s roles/permissions endpoints already exist and are not modified.
- List/detail-view access requires `platform.roles.read`; editing permissions requires `platform.roles.manage` — mirrored client-side via `PermissionStore.hasPermission(...)`.
- Out of scope: creating a new role (no backend command exists), renaming/deleting a role (no backend support), tenant-side role/permission management (a different, unrelated system).
- All response property names are **camelCase** (no `JsonPropertyName` overrides on any of `PlatformRoleResponse`, `PlatformRoleDetailResponse`, `PlatformPermissionResponse`) — unlike the Tenants module's detail endpoint, no snake_case mapping is needed here.
- The update-permissions request body is camelCase: `{ permissions: string[] }` (the complete new set, not a delta).
- The backend enforces a lockout-prevention check server-side on save; the frontend does not replicate it — it surfaces whatever `error.detail` message comes back, using the same `err.error?.detail ?? '<fallback>'` pattern already established in `accept-invite.ts`.

---

### Task 1: Roles data layer (model + service + endpoints)

**Files:**
- Create: `src/app/modules/roles/data/platform-role.model.ts`
- Create: `src/app/modules/roles/data/platform-roles.service.ts`
- Test: `src/app/modules/roles/data/platform-roles.service.spec.ts`
- Modify: `src/app/core/config/api-endpoints.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `PlatformRole { id, name, description, isSystemRole, createdAt }`, `PlatformRoleDetail` (same fields + `permissions: string[]`), `PlatformPermission { code, moduleKey, description, isHighRisk }` — consumed by Tasks 2 and 3. `PlatformRolesService.listRoles(): Observable<PlatformRole[]>`, `getRoleById(id): Observable<PlatformRoleDetail>`, `listPermissions(): Observable<PlatformPermission[]>`, `updateRolePermissions(id, permissions: string[]): Observable<void>` — consumed by Tasks 2 and 3.

- [ ] **Step 1: Write the failing test**

Create `src/app/modules/roles/data/platform-roles.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PlatformRolesService } from './platform-roles.service';
import { environment } from '../../../../environments/environment';

describe('PlatformRolesService', () => {
  let service: PlatformRolesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PlatformRolesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists roles', () => {
    service.listRoles().subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/platform-access/roles`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush([]);
  });

  it('gets a role by id', () => {
    service.getRoleById('role-1').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/platform-access/roles/role-1`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush({
      id: 'role-1',
      name: 'Security Auditor',
      description: 'Read-only audit access',
      isSystemRole: false,
      createdAt: '2026-01-01T00:00:00Z',
      permissions: ['platform.audit.read'],
    });
  });

  it('lists the permission catalog', () => {
    service.listPermissions().subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/platform-access/permissions`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush([]);
  });

  it('sends the new permission set on update', () => {
    service.updateRolePermissions('role-1', ['platform.roles.read', 'platform.roles.manage']).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/platform-access/roles/role-1/permissions`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ permissions: ['platform.roles.read', 'platform.roles.manage'] });
    expect(req.request.withCredentials).toBe(true);
    req.flush(null);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- platform-roles.service`
Expected: FAIL — `Cannot find module './platform-roles.service'` (nothing created yet).

- [ ] **Step 3: Add the roles/permissions endpoints**

In `src/app/core/config/api-endpoints.ts`, add a `roles` key to the existing `API_ENDPOINTS` object (do not remove or touch the existing `platformRoles` key — that stays as-is for the invite-manager modal's unrelated `{ id, name }` summary usage):

```typescript
  roles: {
    list: '/platform-access/roles',
    byId: (id: string) => `/platform-access/roles/${id}`,
    permissions: '/platform-access/permissions',
    updatePermissions: (id: string) => `/platform-access/roles/${id}/permissions`,
  },
```

- [ ] **Step 4: Write the model**

Create `src/app/modules/roles/data/platform-role.model.ts`:

```typescript
export interface PlatformRole {
  id: string;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  createdAt: string;
}

export interface PlatformRoleDetail extends PlatformRole {
  permissions: string[];
}

export interface PlatformPermission {
  code: string;
  moduleKey: string;
  description: string;
  isHighRisk: boolean;
}
```

- [ ] **Step 5: Write the implementation**

Create `src/app/modules/roles/data/platform-roles.service.ts`:

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import { PlatformPermission, PlatformRole, PlatformRoleDetail } from './platform-role.model';

@Injectable({ providedIn: 'root' })
export class PlatformRolesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  listRoles(): Observable<PlatformRole[]> {
    return this.http.get<PlatformRole[]>(`${this.baseUrl}${API_ENDPOINTS.roles.list}`, {
      withCredentials: true,
    });
  }

  getRoleById(id: string): Observable<PlatformRoleDetail> {
    return this.http.get<PlatformRoleDetail>(`${this.baseUrl}${API_ENDPOINTS.roles.byId(id)}`, {
      withCredentials: true,
    });
  }

  listPermissions(): Observable<PlatformPermission[]> {
    return this.http.get<PlatformPermission[]>(`${this.baseUrl}${API_ENDPOINTS.roles.permissions}`, {
      withCredentials: true,
    });
  }

  updateRolePermissions(id: string, permissions: string[]): Observable<void> {
    return this.http.put<void>(
      `${this.baseUrl}${API_ENDPOINTS.roles.updatePermissions(id)}`,
      { permissions },
      { withCredentials: true },
    );
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- platform-roles.service`
Expected: PASS — all 4 tests green.

- [ ] **Step 7: Commit**

```bash
git add src/app/modules/roles/data/platform-role.model.ts src/app/modules/roles/data/platform-roles.service.ts src/app/modules/roles/data/platform-roles.service.spec.ts src/app/core/config/api-endpoints.ts
git commit -m "feat: add Roles & Permissions data layer (model, service, endpoints)"
```

---

### Task 2: RolesList component, route, and sidebar entry

**Files:**
- Create: `src/app/modules/roles/feature/roles-list/roles-list.ts`
- Create: `src/app/modules/roles/feature/roles-list/roles-list.html`
- Test: `src/app/modules/roles/feature/roles-list/roles-list.spec.ts`
- Modify: `src/app/app.routes.ts`
- Modify: `src/app/layouts/main-layout/sidebar/sidebar.html`
- Modify: `src/app/layouts/main-layout/sidebar/sidebar.spec.ts`

**Interfaces:**
- Consumes: `PlatformRolesService.listRoles()` from Task 1, `PermissionStore.hasPermission(code)` (existing), shared UI `StatusBadge`, `Loader`, `ErrorBanner`, `EmptyState` (existing, same imports as `TenantsList`).
- Produces: route `/roles` rendering `RolesList`; a real (non-"Coming soon") sidebar item that navigates there. Task 3 relies on `RolesList` rows linking to `/roles/{id}`.

- [ ] **Step 1: Write the failing test**

Create `src/app/modules/roles/feature/roles-list/roles-list.spec.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- roles-list`
Expected: FAIL — `Cannot find module './roles-list'`.

- [ ] **Step 3: Write the implementation**

Create `src/app/modules/roles/feature/roles-list/roles-list.ts`:

```typescript
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PlatformRolesService } from '../../data/platform-roles.service';
import { PlatformRole } from '../../data/platform-role.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { Loader } from '../../../../shared/ui/loader/loader';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';

@Component({
  selector: 'app-roles-list',
  imports: [RouterLink, StatusBadge, Loader, ErrorBanner, EmptyState, DatePipe],
  templateUrl: './roles-list.html',
})
export class RolesList implements OnInit {
  private readonly rolesService = inject(PlatformRolesService);
  protected readonly permissionStore = inject(PermissionStore);

  protected readonly canView = computed(() => this.permissionStore.hasPermission('platform.roles.read'));

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly roles = signal<PlatformRole[]>([]);

  ngOnInit(): void {
    if (!this.canView()) {
      return;
    }
    this.loadRoles();
  }

  protected loadRoles(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.rolesService.listRoles().subscribe({
      next: (roles) => {
        this.roles.set(roles);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Something went wrong. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
```

Create `src/app/modules/roles/feature/roles-list/roles-list.html`:

```html
@if (!canView()) {
  <div class="rounded-2xl bg-white p-8 shadow-sm">
    <p class="text-sm font-medium text-red-700">No permission to view page</p>
  </div>
} @else {
  <div class="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm">
    <div>
      <h1 class="text-xl font-semibold text-slate-900">Roles & Permissions</h1>
      <p class="mt-1 text-sm text-slate-500">Manage platform roles and what each one can access</p>
    </div>

    @if (loading()) {
      <app-loader label="Loading…" />
    } @else if (errorMessage(); as message) {
      <app-error-banner [message]="message" (retry)="loadRoles()" />
    } @else if (roles().length === 0) {
      <app-empty-state title="No roles yet" />
    } @else {
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="border-b border-slate-200 text-xs font-medium uppercase text-slate-500">
            <th class="py-2 pr-4">Name</th>
            <th class="py-2 pr-4">Description</th>
            <th class="py-2 pr-4">Type</th>
            <th class="py-2 pr-4">Created</th>
          </tr>
        </thead>
        <tbody>
          @for (role of roles(); track role.id) {
            <tr
              [routerLink]="['/roles', role.id]"
              class="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
            >
              <td class="py-3 pr-4 font-medium text-slate-900">{{ role.name }}</td>
              <td class="py-3 pr-4 text-slate-600">{{ role.description || '—' }}</td>
              <td class="py-3 pr-4">
                @if (role.isSystemRole) {
                  <app-status-badge label="System" tone="neutral" />
                }
              </td>
              <td class="py-3 pr-4 text-slate-600">{{ role.createdAt | date: 'mediumDate' }}</td>
            </tr>
          }
        </tbody>
      </table>
    }
  </div>
}
```

- [ ] **Step 4: Register the route**

In `src/app/app.routes.ts`, add a new child route inside the existing guarded `MainLayout` route's `children` array (after the `tenants/:id` entry, before `users`):

```typescript
      {
        path: 'roles',
        loadComponent: () =>
          import('./modules/roles/feature/roles-list/roles-list').then((m) => m.RolesList),
      },
```

- [ ] **Step 5: Enable the sidebar entry**

In `src/app/layouts/main-layout/sidebar/sidebar.html`, replace the disabled "Roles & Permissions" `<span>` block with a real link, keeping its existing shield icon unchanged:

```html
  <a
    routerLink="/roles"
    routerLinkActive="bg-indigo-50 text-indigo-700 font-semibold"
    data-sidebar-item
    class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
  >
    <svg class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z"></path>
    </svg>
    Roles &amp; Permissions
  </a>
```

(This replaces the `<span data-sidebar-item ...>...Roles &amp; Permissions</span>` block — same icon path, now a real `<a>` instead of a disabled `<span>`.)

- [ ] **Step 6: Update the sidebar test**

In `src/app/layouts/main-layout/sidebar/sidebar.spec.ts`, replace the existing two tests (`'renders Dashboard, Tenants, and Users as real navigable links'` and `'renders Roles & Permissions, Audit Logs, and Settings as non-navigable'`) with:

```typescript
  it('renders Dashboard, Tenants, Users, and Roles & Permissions as real navigable links', () => {
    const fixture = setup();
    const links = fixture.debugElement.queryAll(By.css('a'));
    const hrefs = links.map((link) => link.nativeElement.getAttribute('href'));

    expect(hrefs).toContain('/');
    expect(hrefs).toContain('/tenants');
    expect(hrefs).toContain('/users');
    expect(hrefs).toContain('/roles');
  });

  it('renders Audit Logs and Settings as non-navigable', () => {
    const fixture = setup();
    const disabledLabels = ['Audit Logs', 'Settings'];

    for (const label of disabledLabels) {
      const item = fixture.debugElement
        .queryAll(By.css('[data-sidebar-item]'))
        .find((el) => el.nativeElement.textContent.includes(label));

      expect(item).toBeTruthy();
      expect(item!.nativeElement.querySelector('a')).toBeNull();
    }
  });
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test -- roles-list sidebar`
Expected: PASS — all `RolesList` tests and all `Sidebar` tests green.

- [ ] **Step 8: Run the full frontend test suite**

Run: `npm test`
Expected: PASS — no regressions.

- [ ] **Step 9: Commit**

```bash
git add src/app/modules/roles/feature/roles-list/ src/app/app.routes.ts src/app/layouts/main-layout/sidebar/sidebar.html src/app/layouts/main-layout/sidebar/sidebar.spec.ts
git commit -m "feat: add Roles list screen, route, and sidebar entry"
```

---

### Task 3: RoleDetail with module-grouped, editable permission checklist

**Files:**
- Create: `src/app/modules/roles/feature/role-detail/role-detail.ts`
- Create: `src/app/modules/roles/feature/role-detail/role-detail.html`
- Test: `src/app/modules/roles/feature/role-detail/role-detail.spec.ts`
- Modify: `src/app/app.routes.ts`

**Interfaces:**
- Consumes: `PlatformRolesService.getRoleById(id)` / `listPermissions()` / `updateRolePermissions(id, permissions)` from Task 1, `PermissionStore.hasPermission(code)`, `NotificationService` (existing), `RolesList`'s row links (`/roles/{id}`, from Task 2).
- Produces: route `/roles/:id` — nothing else depends on this component.

- [ ] **Step 1: Write the failing test**

Create `src/app/modules/roles/feature/role-detail/role-detail.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { RoleDetail } from './role-detail';
import { PlatformRolesService } from '../../data/platform-roles.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';

describe('RoleDetail', () => {
  let rolesService: {
    getRoleById: jest.Mock;
    listPermissions: jest.Mock;
    updateRolePermissions: jest.Mock;
  };
  let notificationService: { success: jest.Mock; error: jest.Mock };

  const roleDetail = {
    id: 'role-1',
    name: 'Security Auditor',
    description: 'Read-only audit access',
    isSystemRole: false,
    createdAt: '2026-01-01T00:00:00Z',
    permissions: ['platform.audit.read'],
  };

  const catalog = [
    {
      code: 'platform.audit.read',
      moduleKey: 'audit-console',
      description: 'Query the audit log',
      isHighRisk: false,
    },
    {
      code: 'platform.audit.export',
      moduleKey: 'audit-console',
      description: 'Export audit data',
      isHighRisk: false,
    },
    {
      code: 'platform.accounts.manage',
      moduleKey: 'platform-users',
      description: 'Manage platform users',
      isHighRisk: true,
    },
  ];

  function setup(permissions: string[] = ['platform.roles.read', 'platform.roles.manage']) {
    rolesService = {
      getRoleById: jest.fn().mockReturnValue(of(roleDetail)),
      listPermissions: jest.fn().mockReturnValue(of(catalog)),
      updateRolePermissions: jest.fn(),
    };
    notificationService = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [RoleDetail],
      providers: [
        { provide: PlatformRolesService, useValue: rolesService },
        { provide: NotificationService, useValue: notificationService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'role-1' }) } },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(RoleDetail);
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
    fixture.detectChanges();
    return fixture;
  }

  it('loads the role and permission catalog, grouped by module', () => {
    const fixture = setup();
    const component = fixture.componentInstance;

    expect(rolesService.getRoleById).toHaveBeenCalledWith('role-1');
    expect(rolesService.listPermissions).toHaveBeenCalled();
    expect(component['groups']()).toEqual([
      { moduleKey: 'audit-console', permissions: [catalog[0], catalog[1]] },
      { moduleKey: 'platform-users', permissions: [catalog[2]] },
    ]);
  });

  it("starts with the checkboxes matching the role's current permissions", () => {
    const fixture = setup();
    const component = fixture.componentInstance;

    expect(component['checkedCodes']().has('platform.audit.read')).toBe(true);
    expect(component['checkedCodes']().has('platform.audit.export')).toBe(false);
  });

  it('tracks unsaved changes as checkboxes are toggled', () => {
    const fixture = setup();
    const component = fixture.componentInstance;

    expect(component['hasChanges']()).toBe(false);
    component['toggle']('platform.audit.export');
    expect(component['hasChanges']()).toBe(true);
    component['toggle']('platform.audit.export');
    expect(component['hasChanges']()).toBe(false);
  });

  it('reports canManage as false when the user lacks manage permission', () => {
    const fixture = setup(['platform.roles.read']);
    const component = fixture.componentInstance;

    expect(component['canManage']()).toBe(false);
  });

  it('saves the checked codes and reloads on success', () => {
    const fixture = setup();
    rolesService.updateRolePermissions.mockReturnValue(of(undefined));
    const component = fixture.componentInstance;

    component['toggle']('platform.audit.export');
    component['save']();

    expect(rolesService.updateRolePermissions).toHaveBeenCalledWith('role-1', [
      'platform.audit.read',
      'platform.audit.export',
    ]);
    expect(notificationService.success).toHaveBeenCalledWith('Role permissions updated.');
    expect(rolesService.getRoleById).toHaveBeenCalledTimes(2);
  });

  it('shows the backend error detail message when save fails', () => {
    const fixture = setup();
    rolesService.updateRolePermissions.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { detail: 'Cannot remove the last active admin.' },
          }),
      ),
    );
    const component = fixture.componentInstance;

    component['save']();

    expect(notificationService.error).toHaveBeenCalledWith('Cannot remove the last active admin.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- role-detail`
Expected: FAIL — `Cannot find module './role-detail'`.

- [ ] **Step 3: Write the implementation**

Create `src/app/modules/roles/feature/role-detail/role-detail.ts`:

```typescript
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { PlatformRolesService } from '../../data/platform-roles.service';
import { PlatformPermission, PlatformRoleDetail } from '../../data/platform-role.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';
import { Button } from '../../../../shared/ui/button/button';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { Loader } from '../../../../shared/ui/loader/loader';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';

interface PermissionGroup {
  moduleKey: string;
  permissions: PlatformPermission[];
}

@Component({
  selector: 'app-role-detail',
  imports: [Button, StatusBadge, Loader, ErrorBanner],
  templateUrl: './role-detail.html',
})
export class RoleDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly rolesService = inject(PlatformRolesService);
  private readonly notificationService = inject(NotificationService);
  protected readonly permissionStore = inject(PermissionStore);

  private readonly roleId = this.route.snapshot.paramMap.get('id')!;

  protected readonly canManage = computed(() => this.permissionStore.hasPermission('platform.roles.manage'));

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly role = signal<PlatformRoleDetail | null>(null);
  protected readonly allPermissions = signal<PlatformPermission[]>([]);
  protected readonly checkedCodes = signal<Set<string>>(new Set());

  protected readonly groups = computed<PermissionGroup[]>(() => {
    const byModule = new Map<string, PlatformPermission[]>();
    for (const permission of this.allPermissions()) {
      const list = byModule.get(permission.moduleKey) ?? [];
      list.push(permission);
      byModule.set(permission.moduleKey, list);
    }
    return Array.from(byModule.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([moduleKey, permissions]) => ({ moduleKey, permissions }));
  });

  protected readonly hasChanges = computed(() => {
    const original = new Set(this.role()?.permissions ?? []);
    const current = this.checkedCodes();
    if (original.size !== current.size) {
      return true;
    }
    for (const code of original) {
      if (!current.has(code)) {
        return true;
      }
    }
    return false;
  });

  ngOnInit(): void {
    this.loadRole();
  }

  protected loadRole(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.rolesService.getRoleById(this.roleId).subscribe({
      next: (role) => {
        this.role.set(role);
        this.checkedCodes.set(new Set(role.permissions));
        this.loadPermissionCatalog();
      },
      error: () => {
        this.errorMessage.set('Something went wrong. Please try again.');
        this.loading.set(false);
      },
    });
  }

  private loadPermissionCatalog(): void {
    this.rolesService.listPermissions().subscribe({
      next: (permissions) => {
        this.allPermissions.set(permissions);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Something went wrong. Please try again.');
        this.loading.set(false);
      },
    });
  }

  protected toggle(code: string): void {
    const next = new Set(this.checkedCodes());
    if (next.has(code)) {
      next.delete(code);
    } else {
      next.add(code);
    }
    this.checkedCodes.set(next);
  }

  protected save(): void {
    this.saving.set(true);

    this.rolesService.updateRolePermissions(this.roleId, Array.from(this.checkedCodes())).subscribe({
      next: () => {
        this.saving.set(false);
        this.notificationService.success('Role permissions updated.');
        this.loadRole();
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.notificationService.error(error.error?.detail ?? 'Could not update the role permissions.');
      },
    });
  }
}
```

Create `src/app/modules/roles/feature/role-detail/role-detail.html`:

```html
@if (loading()) {
  <app-loader label="Loading…" />
} @else if (errorMessage(); as message) {
  <app-error-banner [message]="message" (retry)="loadRole()" />
} @else if (role(); as r) {
  <div class="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold text-slate-900">{{ r.name }}</h1>
        <p class="mt-1 text-sm text-slate-500">{{ r.description || 'No description' }}</p>
      </div>
      @if (r.isSystemRole) {
        <app-status-badge label="System Role" tone="neutral" />
      }
    </div>

    <div class="flex flex-col gap-6 border-t border-slate-100 pt-4">
      @for (group of groups(); track group.moduleKey) {
        <div>
          <h2 class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{{ group.moduleKey }}</h2>
          <div class="flex flex-col gap-2">
            @for (permission of group.permissions; track permission.code) {
              <label class="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  [checked]="checkedCodes().has(permission.code)"
                  [disabled]="!canManage()"
                  (change)="toggle(permission.code)"
                  class="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600/30"
                />
                <span class="flex flex-col">
                  <span class="flex items-center gap-2 font-medium text-slate-900">
                    {{ permission.code }}
                    @if (permission.isHighRisk) {
                      <span class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                        High risk
                      </span>
                    }
                  </span>
                  <span class="text-slate-500">{{ permission.description }}</span>
                </span>
              </label>
            }
          </div>
        </div>
      }
    </div>

    @if (canManage()) {
      <div class="flex justify-end border-t border-slate-100 pt-4">
        <app-button
          label="Save Changes"
          variant="indigo"
          [loading]="saving()"
          [disabled]="!hasChanges()"
          (clicked)="save()"
        />
      </div>
    }
  </div>
}
```

- [ ] **Step 4: Register the route**

In `src/app/app.routes.ts`, add another child route right after the `roles` entry added in Task 2:

```typescript
      {
        path: 'roles/:id',
        loadComponent: () =>
          import('./modules/roles/feature/role-detail/role-detail').then((m) => m.RoleDetail),
      },
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- role-detail`
Expected: PASS — all 6 tests green.

- [ ] **Step 6: Run the full frontend test suite**

Run: `npm test`
Expected: PASS — no regressions.

- [ ] **Step 7: Manual visual check**

Start the dev server (`npm start`) and open `https://admin.localhost:4200/roles`. Confirm:
- The Roles & Permissions sidebar link is active/highlighted, no longer "Coming soon".
- The list loads and shows existing roles (e.g. "Platform Super Admin", "Security Auditor").
- Clicking a row navigates to `/roles/{id}` and shows the permission checklist grouped by module, with high-risk badges on the 6 flagged codes.
- Toggling a checkbox enables "Save Changes"; saving updates the role and shows a success notification.

- [ ] **Step 8: Commit**

```bash
git add src/app/modules/roles/feature/role-detail/ src/app/app.routes.ts
git commit -m "feat: add Role detail screen with editable permission checklist"
```

---

## Self-Review Notes

- **Spec coverage:** role list (read-only) ✓ Task 2, role detail with module-grouped editable checklist ✓ Task 3, high-risk badges ✓ Task 3's template, save/reload flow ✓ Task 3, sidebar entry enabled ✓ Task 2, `platform.roles.read`/`platform.roles.manage` gating ✓ both list and detail, server error surfacing (no client-side lockout replication) ✓ Task 3's `save()` using the existing `error.detail` pattern from `accept-invite.ts`. Explicitly out of scope (create/rename/delete role, tenant-side roles) — no task touches any of that.
- **Placeholder scan:** none — every step has literal file contents.
- **Type consistency:** `PlatformRole`/`PlatformRoleDetail`/`PlatformPermission` (Task 1) are the exact types `RolesList` (Task 2) and `RoleDetail` (Task 3) consume. `PlatformRolesService`'s 4 method signatures (Task 1) match every call site in Tasks 2 and 3. `PermissionGroup` (defined only in Task 3, used only there) doesn't leak elsewhere.
