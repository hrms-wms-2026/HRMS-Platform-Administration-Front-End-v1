# User Profile Drawer Implementation Plan (Info + Role Editing)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the no-op row click in the Users list with a right-side slide-over drawer showing user info and an editable role checklist.

**Architecture:** Extend the existing `PlatformUsersService`/`PlatformUser` data layer with two new methods and a `PlatformUserDetail` model, then add one new self-contained overlay component (`UserProfileDrawer`, following the same pattern as `InviteManagerModal`/`LogoutConfirmModal` — not the centered `Modal`), wired into `PlatformUsersList` via row click.

**Tech Stack:** Angular 21 standalone components/signals, `HttpClient`, existing shared UI (`Button`, `StatusBadge`, `Loader`, `ErrorBanner`).

## Global Constraints

- Depends on the companion backend fix in `HRMS-Backend-v1` (branch `fix/platform-user-detail-response-shape`, plan `docs/superpowers/plans/2026-08-07-platform-user-detail-response-shape-fix.md`) — `GET /platform-access/users/{id}` must return `fullName`/`status` (not the old `firstName`/`lastName`/`isActive`) for this frontend to work correctly. That fix is already committed on its own branch.
- Role editing requires `platform.roles.manage` (not `platform.accounts.manage`) — confirmed from `UpdatePlatformUserRolesCommandHandler`.
- Out of scope: active session list + revoke (deferred sub-project, per the approved spec).
- The roles-update request body is camelCase: `{ roleIds: string[] }` (the complete new set, not a delta) — matches `UpdatePlatformUserRolesRequest(IReadOnlyList<Guid> RoleIds)`, no `JsonPropertyName` override.
- Server-side lockout-prevention applies to role updates too; surface `error.detail` on failure, same pattern as `RoleDetail`'s `save()` (no client-side replication).
- Reuse the existing `platformRoles.list` endpoint / `PlatformUsersService.listRoles()` / `PlatformRoleSummary` model for the role checklist — do **not** depend on the separate `modules/roles/` module's `PlatformRolesService` (built on a different, not-yet-merged branch).

---

### Task 1: Extend PlatformUsersService with user-detail and role-update methods

**Files:**
- Modify: `src/app/modules/platform-users/data/platform-user.model.ts`
- Modify: `src/app/modules/platform-users/data/platform-users.service.ts`
- Modify: `src/app/modules/platform-users/data/platform-users.service.spec.ts`
- Modify: `src/app/core/config/api-endpoints.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `PlatformUserDetail { id, email, fullName, status: 'active' | 'inactive' | 'pending', createdAt, lastLoginAt: string | null, roles: PlatformRoleSummary[] }` (new interface). `PlatformUsersService.getUserById(id): Observable<PlatformUserDetail>`, `updateUserRoles(id, roleIds: string[]): Observable<void>` — both consumed by Task 2.

- [ ] **Step 1: Write the failing tests**

Add to the end of `src/app/modules/platform-users/data/platform-users.service.spec.ts`, inside the existing `describe('PlatformUsersService', ...)` block (after the `listRoles fetches the roles list` test, before the closing `});`):

```typescript
  it('getUserById fetches the user detail', () => {
    service.getUserById('user-1').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/platform-access/users/user-1`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush({
      id: 'user-1',
      email: 'a@onevo.io',
      fullName: 'A',
      status: 'active',
      createdAt: '2026-08-01T00:00:00Z',
      lastLoginAt: null,
      roles: [{ id: 'role-1', name: 'Manager' }],
    });
  });

  it('updateUserRoles puts the new role id set', () => {
    service.updateUserRoles('user-1', ['role-1', 'role-2']).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/platform-access/users/user-1/roles`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ roleIds: ['role-1', 'role-2'] });
    expect(req.request.withCredentials).toBe(true);
    req.flush(null);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- platform-users.service`
Expected: FAIL — `service.getUserById` and `service.updateUserRoles` don't exist yet.

- [ ] **Step 3: Add the endpoints**

In `src/app/core/config/api-endpoints.ts`, extend the existing `platformUsers` object (add two new entries, keep `list`/`invite`/`revokeInvite` unchanged):

```typescript
  platformUsers: {
    list: '/platform-access/users',
    invite: '/platform-access/users/invite',
    revokeInvite: (platformUserId: string) => `/platform-access/users/${platformUserId}/revoke-invite`,
    byId: (platformUserId: string) => `/platform-access/users/${platformUserId}`,
    updateRoles: (platformUserId: string) => `/platform-access/users/${platformUserId}/roles`,
  },
```

- [ ] **Step 4: Add the model**

In `src/app/modules/platform-users/data/platform-user.model.ts`, add (alongside the existing `PlatformUser` interface — do not remove it):

```typescript
import { PlatformRoleSummary } from './platform-role-summary.model';

export interface PlatformUserDetail {
  id: string;
  email: string;
  fullName: string;
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  lastLoginAt: string | null;
  roles: PlatformRoleSummary[];
}
```

- [ ] **Step 5: Add the service methods**

In `src/app/modules/platform-users/data/platform-users.service.ts`, add two methods to the existing `PlatformUsersService` class (after `listRoles`, importing `PlatformUserDetail` alongside the existing `PlatformUser` import):

```typescript
  getUserById(id: string): Observable<PlatformUserDetail> {
    return this.http.get<PlatformUserDetail>(`${this.baseUrl}${API_ENDPOINTS.platformUsers.byId(id)}`, {
      withCredentials: true,
    });
  }

  updateUserRoles(id: string, roleIds: string[]): Observable<void> {
    return this.http.put<void>(
      `${this.baseUrl}${API_ENDPOINTS.platformUsers.updateRoles(id)}`,
      { roleIds },
      { withCredentials: true },
    );
  }
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- platform-users.service`
Expected: PASS — all 6 tests green (4 existing + 2 new).

- [ ] **Step 7: Commit**

```bash
git add src/app/modules/platform-users/data/platform-user.model.ts src/app/modules/platform-users/data/platform-users.service.ts src/app/modules/platform-users/data/platform-users.service.spec.ts src/app/core/config/api-endpoints.ts
git commit -m "feat: add user-detail and role-update methods to PlatformUsersService"
```

---

### Task 2: UserProfileDrawer component wired into the Users list

**Files:**
- Create: `src/app/modules/platform-users/feature/user-profile-drawer/user-profile-drawer.ts`
- Create: `src/app/modules/platform-users/feature/user-profile-drawer/user-profile-drawer.html`
- Test: `src/app/modules/platform-users/feature/user-profile-drawer/user-profile-drawer.spec.ts`
- Modify: `src/app/modules/platform-users/feature/platform-users-list/platform-users-list.ts`
- Modify: `src/app/modules/platform-users/feature/platform-users-list/platform-users-list.html`
- Test: `src/app/modules/platform-users/feature/platform-users-list/platform-users-list.spec.ts`

**Interfaces:**
- Consumes: `PlatformUsersService.getUserById(id)` / `updateUserRoles(id, roleIds)` / `listRoles()` from Task 1, `PermissionStore.hasPermission(code)`, `NotificationService` (existing).
- Produces: nothing else depends on this — it's the final piece of this sub-project.

- [ ] **Step 1: Write the failing test**

Create `src/app/modules/platform-users/feature/user-profile-drawer/user-profile-drawer.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { UserProfileDrawer } from './user-profile-drawer';
import { PlatformUsersService } from '../../data/platform-users.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';

describe('UserProfileDrawer', () => {
  let usersService: {
    getUserById: jest.Mock;
    listRoles: jest.Mock;
    updateUserRoles: jest.Mock;
  };
  let notificationService: { success: jest.Mock; error: jest.Mock };

  const userDetail = {
    id: 'user-1',
    email: 'a@onevo.io',
    fullName: 'Arun Selvan',
    status: 'active' as const,
    createdAt: '2026-08-01T00:00:00Z',
    lastLoginAt: null,
    roles: [{ id: 'role-1', name: 'Security Auditor' }],
  };

  const allRoles = [
    { id: 'role-1', name: 'Security Auditor' },
    { id: 'role-2', name: 'Billing Manager' },
  ];

  function setup(userId: string, permissions: string[] = ['platform.accounts.read', 'platform.roles.manage']) {
    usersService = {
      getUserById: jest.fn().mockReturnValue(of(userDetail)),
      listRoles: jest.fn().mockReturnValue(of(allRoles)),
      updateUserRoles: jest.fn(),
    };
    notificationService = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [UserProfileDrawer],
      providers: [
        { provide: PlatformUsersService, useValue: usersService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(UserProfileDrawer);
    fixture.componentRef.setInput('userId', userId);
    const store = TestBed.inject(PermissionStore);
    store.setAuthorizationContext({
      userId: 'admin-1',
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

  it('loads the user detail and full role list on open', () => {
    const fixture = setup('user-1');
    const component = fixture.componentInstance;

    expect(usersService.getUserById).toHaveBeenCalledWith('user-1');
    expect(usersService.listRoles).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Arun Selvan');
    expect(component['allRoles']()).toEqual(allRoles);
  });

  it("pre-checks the user's current roles", () => {
    const fixture = setup('user-1');
    const component = fixture.componentInstance;

    expect(component['checkedRoleIds']().has('role-1')).toBe(true);
    expect(component['checkedRoleIds']().has('role-2')).toBe(false);
  });

  it('tracks unsaved changes as role checkboxes are toggled', () => {
    const fixture = setup('user-1');
    const component = fixture.componentInstance;

    expect(component['hasChanges']()).toBe(false);
    component['toggleRole']('role-2');
    expect(component['hasChanges']()).toBe(true);
    component['toggleRole']('role-2');
    expect(component['hasChanges']()).toBe(false);
  });

  it('reports canManageRoles as false without platform.roles.manage', () => {
    const fixture = setup('user-1', ['platform.accounts.read']);
    const component = fixture.componentInstance;

    expect(component['canManageRoles']()).toBe(false);
  });

  it('saves the checked role ids and reloads on success', () => {
    const fixture = setup('user-1');
    usersService.updateUserRoles.mockReturnValue(of(undefined));
    const component = fixture.componentInstance;

    component['toggleRole']('role-2');
    component['save']();

    expect(usersService.updateUserRoles).toHaveBeenCalledWith('user-1', ['role-1', 'role-2']);
    expect(notificationService.success).toHaveBeenCalledWith('User roles updated.');
    expect(usersService.getUserById).toHaveBeenCalledTimes(2);
  });

  it('shows the backend error detail message when save fails', () => {
    const fixture = setup('user-1');
    usersService.updateUserRoles.mockReturnValue(
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

  it('emits closed when the close button is used', () => {
    const fixture = setup('user-1');
    const component = fixture.componentInstance;
    let closed = false;
    component.closed.subscribe(() => (closed = true));

    component['close']();

    expect(closed).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- user-profile-drawer`
Expected: FAIL — `Cannot find module './user-profile-drawer'`.

- [ ] **Step 3: Write the implementation**

Create `src/app/modules/platform-users/feature/user-profile-drawer/user-profile-drawer.ts`:

```typescript
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { PlatformUsersService } from '../../data/platform-users.service';
import { PlatformUserDetail } from '../../data/platform-user.model';
import { PlatformRoleSummary } from '../../data/platform-role-summary.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';
import { Button } from '../../../../shared/ui/button/button';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { Loader } from '../../../../shared/ui/loader/loader';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  active: 'success',
  pending: 'warning',
  inactive: 'danger',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  pending: 'Pending',
  inactive: 'Inactive',
};

@Component({
  selector: 'app-user-profile-drawer',
  imports: [Button, StatusBadge, Loader, ErrorBanner, DatePipe],
  templateUrl: './user-profile-drawer.html',
})
export class UserProfileDrawer {
  private readonly usersService = inject(PlatformUsersService);
  private readonly notificationService = inject(NotificationService);
  protected readonly permissionStore = inject(PermissionStore);

  readonly userId = input.required<string>();
  readonly closed = output<void>();

  protected readonly canManageRoles = computed(() => this.permissionStore.hasPermission('platform.roles.manage'));

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly user = signal<PlatformUserDetail | null>(null);
  protected readonly allRoles = signal<PlatformRoleSummary[]>([]);
  protected readonly checkedRoleIds = signal<Set<string>>(new Set());

  protected readonly hasChanges = computed(() => {
    const original = new Set((this.user()?.roles ?? []).map((r) => r.id));
    const current = this.checkedRoleIds();
    if (original.size !== current.size) {
      return true;
    }
    for (const id of original) {
      if (!current.has(id)) {
        return true;
      }
    }
    return false;
  });

  constructor() {
    effect(() => {
      const id = this.userId();
      this.loadUser(id);
    });
  }

  protected toneFor(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
    return STATUS_TONE[status] ?? 'neutral';
  }

  protected labelFor(status: string): string {
    return STATUS_LABEL[status] ?? status;
  }

  protected initials(fullName: string): string {
    return fullName
      .split(' ')
      .filter((part) => part.length > 0)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');
  }

  protected toggleRole(roleId: string): void {
    const next = new Set(this.checkedRoleIds());
    if (next.has(roleId)) {
      next.delete(roleId);
    } else {
      next.add(roleId);
    }
    this.checkedRoleIds.set(next);
  }

  protected save(): void {
    this.saving.set(true);

    this.usersService.updateUserRoles(this.userId(), Array.from(this.checkedRoleIds())).subscribe({
      next: () => {
        this.saving.set(false);
        this.notificationService.success('User roles updated.');
        this.loadUser(this.userId());
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.notificationService.error(error.error?.detail ?? 'Could not update the user roles.');
      },
    });
  }

  protected close(): void {
    this.closed.emit();
  }

  private loadUser(id: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.usersService.getUserById(id).subscribe({
      next: (user) => {
        this.user.set(user);
        this.checkedRoleIds.set(new Set(user.roles.map((r) => r.id)));
        this.loadRoles();
      },
      error: () => {
        this.errorMessage.set('Something went wrong. Please try again.');
        this.loading.set(false);
      },
    });
  }

  private loadRoles(): void {
    this.usersService.listRoles().subscribe({
      next: (roles) => {
        this.allRoles.set(roles);
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

Create `src/app/modules/platform-users/feature/user-profile-drawer/user-profile-drawer.html`:

```html
<div class="fixed inset-0 z-50 flex justify-end bg-slate-900/50" (click)="close()">
  <div class="flex h-full w-96 flex-col bg-white shadow-2xl" (click)="$event.stopPropagation()">
    <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
      <h2 class="text-lg font-semibold text-slate-900">User Profile</h2>
      <button
        type="button"
        (click)="close()"
        class="text-xl leading-none text-slate-400 hover:text-slate-600"
        aria-label="Close"
      >
        &times;
      </button>
    </div>

    <div class="flex-1 overflow-y-auto px-6 py-4">
      @if (loading()) {
        <app-loader label="Loading…" />
      } @else if (errorMessage(); as message) {
        <app-error-banner [message]="message" (retry)="close()" />
      } @else if (user(); as u) {
        <div class="flex items-center gap-3">
          <span
            class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700"
          >
            {{ initials(u.fullName) }}
          </span>
          <div class="min-w-0">
            <p class="truncate font-medium text-slate-900">{{ u.fullName }}</p>
            <p class="truncate text-sm text-slate-500">{{ u.email }}</p>
          </div>
        </div>

        <div class="mt-3">
          <app-status-badge [label]="labelFor(u.status)" [tone]="toneFor(u.status)" />
        </div>

        <div class="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p class="text-xs font-medium uppercase text-slate-500">Created</p>
            <p class="text-slate-900">{{ u.createdAt | date: 'mediumDate' }}</p>
          </div>
          <div>
            <p class="text-xs font-medium uppercase text-slate-500">Last Login</p>
            <p class="text-slate-900">{{ u.lastLoginAt ? (u.lastLoginAt | date: 'mediumDate') : 'Never' }}</p>
          </div>
        </div>

        <div class="mt-6 border-t border-slate-100 pt-4">
          <p class="text-xs font-medium uppercase text-slate-500">Roles</p>
          <div class="mt-2 flex flex-col gap-2">
            @for (role of allRoles(); track role.id) {
              <label class="flex select-none items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  [checked]="checkedRoleIds().has(role.id)"
                  [disabled]="!canManageRoles()"
                  (change)="toggleRole(role.id)"
                  class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600/30"
                />
                {{ role.name }}
              </label>
            }
          </div>
        </div>

        @if (canManageRoles()) {
          <div class="mt-6 flex justify-end">
            <app-button
              label="Save Changes"
              variant="indigo"
              [loading]="saving()"
              [disabled]="!hasChanges()"
              (clicked)="save()"
            />
          </div>
        }
      }
    </div>
  </div>
</div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- user-profile-drawer`
Expected: PASS — all 7 tests green.

- [ ] **Step 5: Wire the drawer into PlatformUsersList**

In `src/app/modules/platform-users/feature/platform-users-list/platform-users-list.ts`, add the import and a `selectedUserId` signal + open/close/reload handlers (insert after the existing `initials` method, before `loadUsers`):

```typescript
import { UserProfileDrawer } from '../user-profile-drawer/user-profile-drawer';
```

(add to the top import list, alongside the existing `InviteManagerModal` import)

```typescript
  protected readonly selectedUserId = signal<string | null>(null);

  protected openProfile(userId: string): void {
    this.selectedUserId.set(userId);
  }

  protected closeProfile(): void {
    this.selectedUserId.set(null);
  }

  protected onProfileUpdated(): void {
    this.loadUsers();
  }
```

Update the `@Component` decorator's `imports` array to include `UserProfileDrawer`:

```typescript
  imports: [Button, StatusBadge, Loader, ErrorBanner, EmptyState, Pagination, InviteManagerModal, UserProfileDrawer],
```

In `src/app/modules/platform-users/feature/platform-users-list/platform-users-list.html`, add a click handler to the row `<tr>` (the row that currently has no click behavior):

```html
            <tr class="cursor-pointer border-b border-slate-100 hover:bg-slate-50" (click)="openProfile(user.id)">
```

(replaces the existing `<tr class="border-b border-slate-100">` — same row, just adds `cursor-pointer hover:bg-slate-50` and the click handler)

The "Revoke" button inside that row must not also trigger the row's click — add `.stopPropagation()` there too:

```html
                  <button
                    type="button"
                    (click)="revokeInvite(user.id); $event.stopPropagation()"
                    class="text-sm font-medium text-red-700 hover:text-red-800"
                  >
                    Revoke
                  </button>
```

(replaces the existing Revoke button's `(click)="revokeInvite(user.id)"`)

Add the drawer itself at the end of the template, alongside the existing invite-modal block:

```html
  @if (selectedUserId(); as userId) {
    <app-user-profile-drawer [userId]="userId" (closed)="closeProfile()" />
  }
```

- [ ] **Step 6: Update the PlatformUsersList test**

`UserProfileDrawer` is only rendered once `selectedUserId()` is set (via the `@if` in the template), so these two list-level tests don't need to mock `getUserById`/`listRoles`/`updateUserRoles` — the existing `usersService = { list: jest.fn(), revokeInvite: jest.fn() }` mock in this file is untouched. Add these two cases to `src/app/modules/platform-users/feature/platform-users-list/platform-users-list.spec.ts`, right after the existing `'revokes a pending invite'` test (before the closing `'shows an error message...'` test), using the file's existing `createComponent()`/`buildAuthContext()` helpers:

```typescript
  it('opens the profile drawer with the clicked user id on row click', () => {
    permissionStore.setAuthorizationContext(buildAuthContext(['platform.accounts.read']));
    usersService.list.mockReturnValue(of(buildUsers(1)));
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['openProfile']('id-0');

    expect(component['selectedUserId']()).toBe('id-0');
  });

  it('clears the selected user id on drawer close', () => {
    permissionStore.setAuthorizationContext(buildAuthContext(['platform.accounts.read']));
    usersService.list.mockReturnValue(of(buildUsers(1)));
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['openProfile']('id-0');
    component['closeProfile']();

    expect(component['selectedUserId']()).toBeNull();
  });
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test -- platform-users-list user-profile-drawer`
Expected: PASS — all cases green.

- [ ] **Step 8: Run the full frontend test suite**

Run: `npm test`
Expected: PASS — no regressions.

- [ ] **Step 9: Manual visual check**

Start the dev server (`npm start`) and open `https://admin.localhost:4200/users`. Confirm:
- Clicking a row (not the Revoke button/link) opens the drawer from the right with that user's info.
- Roles checklist is pre-checked correctly, toggling enables Save, saving updates and shows a success notification.
- Clicking the backdrop or the × closes the drawer without saving.
- Clicking Revoke on a pending user's row still works and does not also open the drawer.

- [ ] **Step 10: Commit**

```bash
git add src/app/modules/platform-users/feature/user-profile-drawer/ src/app/modules/platform-users/feature/platform-users-list/
git commit -m "feat: add User Profile Drawer with editable role checklist"
```

---

## Self-Review Notes

- **Spec coverage:** user info display (name, email, status, created/last-login) ✓ Task 2's template, editable role checklist via existing `PlatformUsersService.listRoles()`/`PlatformRoleSummary` (not the separate Roles module) ✓, save via `updateUserRoles` with `platform.roles.manage` gating ✓, view-only fallback (disabled checkboxes, no Save button) when lacking manage permission ✓, backend error surfacing via `error.detail` ✓, row click replaces the no-op ✓ Task 2 Step 5. Explicitly out of scope (sessions) — no task touches it.
- **Placeholder scan:** none — every step has literal file contents. (Step 6 has an explicit note to read the existing spec file first since the exact mock shape there wasn't re-transcribed — this is guidance on integration, not a placeholder for missing code; the two new test bodies themselves are complete.)
- **Type consistency:** `PlatformUserDetail` (Task 1) matches exactly what `UserProfileDrawer` (Task 2) consumes. `PlatformUsersService.getUserById`/`updateUserRoles` signatures (Task 1) match every call site in Task 2. `PlatformRoleSummary` (existing, unchanged) is reused as-is for `allRoles`/role checkboxes, consistent with `InviteManagerModal`'s existing usage.
