# Invite Platform Manager (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "Invite Manager" button's "coming soon" stub with a real invite modal, show pending invites in the users list, and build the invited person's accept-invite experience.

**Architecture:** One new modal component under `modules/platform-users/feature/`, two new screens under `modules/auth/feature/` (mirroring `forgot-password`/`reset-password`'s reactive-forms + signals pattern), and small extensions to the existing `PlatformUser` model, `PlatformUsersService`, and `AuthService`.

**Tech Stack:** Angular 21 standalone components, `@ngrx/signals` (existing `PermissionStore` pattern, not needed for new state here), Reactive Forms, Jest.

## Global Constraints

- `platform_user_invite` acceptance ships in the same release as invite-sending — this
  plan's Task 3 (modal) and Task 5 (accept screens) are both required before the
  "Invite Manager" button can go live; do not ship Task 3 alone (backend spec release
  rule).
- Role selection in the invite modal is required — at least one checkbox, client-side
  validator (backend spec, "Role selection is required").
- No auto-login after accept — the confirmation screen links to `/auth/login`
  (backend spec, step 8).
- Reuse `app-button`, `app-status-badge`, `app-error-banner`, `app-loader`,
  `app-empty-state` as they exist today — no new shared UI primitives.

---

### Task 1: `PlatformUser` model, `API_ENDPOINTS`, `PlatformUsersService` extensions

**Files:**
- Modify: `src/app/modules/platform-users/data/platform-user.model.ts`
- Create: `src/app/modules/platform-users/data/platform-role-summary.model.ts`
- Modify: `src/app/core/config/api-endpoints.ts`
- Modify: `src/app/modules/platform-users/data/platform-users.service.ts`
- Test: `src/app/modules/platform-users/data/platform-users.service.spec.ts`

**Interfaces:**
- Produces: `PlatformUser.status: 'active' | 'inactive' | 'pending'` (replaces
  `isActive: boolean`), `PlatformRoleSummary { id: string; name: string }`,
  `PlatformUsersService.invite(email, fullName, roleIds): Observable<void>`,
  `.revokeInvite(platformUserId): Observable<void>`, `.listRoles(): Observable<PlatformRoleSummary[]>`
  — consumed by Tasks 3 and 4.

- [ ] **Step 1: Update the `PlatformUser` model**

```typescript
// src/app/modules/platform-users/data/platform-user.model.ts
export interface PlatformUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  lastLoginAt: string | null;
}
```

- [ ] **Step 2: Add the role summary model**

```typescript
// src/app/modules/platform-users/data/platform-role-summary.model.ts
export interface PlatformRoleSummary {
  id: string;
  name: string;
}
```

- [ ] **Step 3: Add the new endpoint paths**

In `api-endpoints.ts`, replace the `platformUsers` block:

```typescript
  platformUsers: {
    list: '/platform-access/users',
    invite: '/platform-access/users/invite',
    revokeInvite: (platformUserId: string) => `/platform-access/users/${platformUserId}/revoke-invite`,
  },
  platformRoles: {
    list: '/platform-access/roles',
  },
```

- [ ] **Step 4: Write the failing service tests**

```typescript
// src/app/modules/platform-users/data/platform-users.service.spec.ts (add to existing file, or create if it doesn't exist yet - check first)
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PlatformUsersService } from './platform-users.service';
import { environment } from '../../../../environments/environment';

describe('PlatformUsersService', () => {
  let service: PlatformUsersService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PlatformUsersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('invite posts email, fullName, and roleIds', () => {
    service.invite('new@example.com', 'New Manager', ['role-1', 'role-2']).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/platform-access/users/invite`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      email: 'new@example.com',
      fullName: 'New Manager',
      roleIds: ['role-1', 'role-2'],
    });
    req.flush(null);
  });

  it('revokeInvite posts to the user-scoped revoke-invite path', () => {
    service.revokeInvite('user-123').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/platform-access/users/user-123/revoke-invite`);
    expect(req.request.method).toBe('POST');
    req.flush(null);
  });

  it('listRoles fetches the roles list', () => {
    service.listRoles().subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/platform-access/roles`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 'role-1', name: 'Manager' }]);
  });
});
```

- [ ] **Step 5: Run the tests to verify they fail**

Run: `npm test -- platform-users.service`
Expected: FAIL — `invite`/`revokeInvite`/`listRoles` don't exist on `PlatformUsersService` yet.

- [ ] **Step 6: Implement the service methods**

```typescript
// src/app/modules/platform-users/data/platform-users.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import { PlatformUser } from './platform-user.model';
import { PlatformRoleSummary } from './platform-role-summary.model';

@Injectable({ providedIn: 'root' })
export class PlatformUsersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  list(): Observable<PlatformUser[]> {
    return this.http.get<PlatformUser[]>(`${this.baseUrl}${API_ENDPOINTS.platformUsers.list}`, {
      withCredentials: true,
    });
  }

  invite(email: string, fullName: string, roleIds: string[]): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}${API_ENDPOINTS.platformUsers.invite}`,
      { email, fullName, roleIds },
      { withCredentials: true },
    );
  }

  revokeInvite(platformUserId: string): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}${API_ENDPOINTS.platformUsers.revokeInvite(platformUserId)}`,
      {},
      { withCredentials: true },
    );
  }

  listRoles(): Observable<PlatformRoleSummary[]> {
    return this.http.get<PlatformRoleSummary[]>(`${this.baseUrl}${API_ENDPOINTS.platformRoles.list}`, {
      withCredentials: true,
    });
  }
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm test -- platform-users.service`
Expected: PASS, 3/3 (plus any pre-existing tests in that file, if it already existed).

- [ ] **Step 8: Fix the now-broken `platform-users-list` references to `isActive`**

Run: `npm run build` and fix every compile error in
`platform-users-list.ts`/`.html` that references `.isActive` — this is a mechanical
rename to `.status === 'active'` (or similar) for now; the real UI treatment for the
three-state status (including the "pending" badge) is Task 4, not this step. For this
step, just get the build green with the minimal change: replace
`user.isActive ? 'Active' : 'Inactive'` with
`user.status === 'active' ? 'Active' : 'Inactive'` and the matching `tone` expression,
and fix `statusFilter`'s `matchesStatus` computed logic in `platform-users-list.ts` to
compare against `user.status` instead of `user.isActive`.

- [ ] **Step 9: Commit**

```bash
git add src/app/modules/platform-users/data/ src/app/core/config/api-endpoints.ts src/app/modules/platform-users/feature/platform-users-list/
git commit -m "feat: extend PlatformUser model and PlatformUsersService for invites"
```

---

### Task 2: `AuthService.acceptInvite`

**Files:**
- Modify: `src/app/core/config/api-endpoints.ts`
- Modify: `src/app/core/auth/auth.service.ts`
- Test: `src/app/core/auth/auth.service.spec.ts`

**Interfaces:**
- Produces: `AuthService.acceptInvite(token: string, password: string): Observable<void>`
  — consumed by Task 5.

- [ ] **Step 1: Add the endpoint path**

In `api-endpoints.ts`, add to the `auth` block:

```typescript
    acceptInvite: '/auth/accept-invite',
```

- [ ] **Step 2: Write the failing test**

Add to `auth.service.spec.ts` (follow whatever `resetPassword`'s existing test in that
file already does — same shape, new method):

```typescript
  it('acceptInvite posts token and password', () => {
    service.acceptInvite('raw-token', 'NewPassword1!').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/accept-invite`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ token: 'raw-token', password: 'NewPassword1!' });
    req.flush(null);
  });
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npm test -- auth.service`
Expected: FAIL — `acceptInvite` doesn't exist on `AuthService`.

- [ ] **Step 4: Implement the method**

In `auth.service.ts`, add after `resetPassword`:

```typescript
  acceptInvite(token: string, password: string): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}${API_ENDPOINTS.auth.acceptInvite}`,
      { token, password },
      { withCredentials: true },
    );
  }
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- auth.service`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/core/config/api-endpoints.ts src/app/core/auth/auth.service.ts src/app/core/auth/auth.service.spec.ts
git commit -m "feat: add AuthService.acceptInvite"
```

---

### Task 3: Invite Manager modal

**Files:**
- Create: `src/app/modules/platform-users/feature/invite-manager-modal/invite-manager-modal.ts`
- Create: `src/app/modules/platform-users/feature/invite-manager-modal/invite-manager-modal.html`
- Create: `src/app/modules/platform-users/feature/invite-manager-modal/invite-manager-modal.css`
- Test: `src/app/modules/platform-users/feature/invite-manager-modal/invite-manager-modal.spec.ts`

**Interfaces:**
- Consumes: `PlatformUsersService.invite`/`.listRoles` (Task 1), `Button` (existing),
  `PlatformRoleSummary` (Task 1).
- Produces: `InviteManagerModal` component with `invited = output<void>()` and
  `closed = output<void>()` — consumed by Task 4.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/app/modules/platform-users/feature/invite-manager-modal/invite-manager-modal.spec.ts
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { InviteManagerModal } from './invite-manager-modal';
import { PlatformUsersService } from '../../data/platform-users.service';

describe('InviteManagerModal', () => {
  let usersService: { invite: jest.Mock; listRoles: jest.Mock };

  beforeEach(async () => {
    usersService = {
      invite: jest.fn(),
      listRoles: jest.fn().mockReturnValue(of([
        { id: 'role-1', name: 'Manager' },
        { id: 'role-2', name: 'Support' },
      ])),
    };

    await TestBed.configureTestingModule({
      imports: [InviteManagerModal],
      providers: [{ provide: PlatformUsersService, useValue: usersService }],
    }).compileComponents();
  });

  function createComponent() {
    const fixture = TestBed.createComponent(InviteManagerModal);
    fixture.detectChanges();
    return fixture;
  }

  it('loads roles on init', () => {
    createComponent();
    expect(usersService.listRoles).toHaveBeenCalled();
  });

  it('is invalid with no email, no full name, or no role selected', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    expect(component['inviteFormInvalid']).toBe(true);

    component['inviteForm'].patchValue({ email: 'new@example.com', fullName: 'New Manager' });
    expect(component['inviteFormInvalid']).toBe(true); // form fields valid, but no role selected yet

    component['toggleRole']('role-1');
    expect(component['inviteFormInvalid']).toBe(false);
  });

  it('submits with the selected roles and emits invited on success', () => {
    usersService.invite.mockReturnValue(of(undefined));
    const fixture = createComponent();
    const component = fixture.componentInstance;
    let invitedEmitted = false;
    component.invited.subscribe(() => (invitedEmitted = true));

    component['inviteForm'].patchValue({ email: 'new@example.com', fullName: 'New Manager' });
    component['toggleRole']('role-1');
    component.submit();

    expect(usersService.invite).toHaveBeenCalledWith('new@example.com', 'New Manager', ['role-1']);
    expect(invitedEmitted).toBe(true);
  });

  it('shows an inline error and does not emit invited on failure', () => {
    usersService.invite.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    const fixture = createComponent();
    const component = fixture.componentInstance;
    let invitedEmitted = false;
    component.invited.subscribe(() => (invitedEmitted = true));

    component['inviteForm'].patchValue({ email: 'existing@example.com', fullName: 'New Manager' });
    component['toggleRole']('role-1');
    component.submit();

    expect(component['errorMessage']()).toBeTruthy();
    expect(invitedEmitted).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- invite-manager-modal`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Write the component**

```typescript
// src/app/modules/platform-users/feature/invite-manager-modal/invite-manager-modal.ts
import { Component, OnInit, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PlatformUsersService } from '../../data/platform-users.service';
import { PlatformRoleSummary } from '../../data/platform-role-summary.model';
import { Button } from '../../../../shared/ui/button/button';

@Component({
  selector: 'app-invite-manager-modal',
  imports: [ReactiveFormsModule, Button],
  templateUrl: './invite-manager-modal.html',
  styleUrl: './invite-manager-modal.css',
})
export class InviteManagerModal implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly usersService = inject(PlatformUsersService);

  readonly invited = output<void>();
  readonly closed = output<void>();

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly roles = signal<PlatformRoleSummary[]>([]);
  protected readonly selectedRoleIds = signal<string[]>([]);

  protected readonly inviteForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    fullName: ['', Validators.required],
  });

  ngOnInit(): void {
    this.usersService.listRoles().subscribe({
      next: (roles) => this.roles.set(roles),
      error: () => this.errorMessage.set('Could not load roles. Please retry.'),
    });
  }

  protected toggleRole(roleId: string): void {
    this.selectedRoleIds.update((ids) =>
      ids.includes(roleId) ? ids.filter((id) => id !== roleId) : [...ids, roleId],
    );
  }

  protected get inviteFormInvalid(): boolean {
    return this.inviteForm.invalid || this.selectedRoleIds().length === 0;
  }

  submit(): void {
    if (this.inviteFormInvalid) {
      this.inviteForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    const { email, fullName } = this.inviteForm.getRawValue();

    this.usersService.invite(email, fullName, this.selectedRoleIds()).subscribe({
      next: () => {
        this.loading.set(false);
        this.invited.emit();
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Could not send the invitation. The email may already be in use.');
      },
    });
  }

  cancel(): void {
    this.closed.emit();
  }
}
```

- [ ] **Step 4: Write the template**

```html
<!-- src/app/modules/platform-users/feature/invite-manager-modal/invite-manager-modal.html -->
<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
  <div class="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
    <h2 class="text-lg font-semibold text-slate-900">Invite Platform Manager</h2>

    <form class="mt-6 flex flex-col gap-4" [formGroup]="inviteForm" (ngSubmit)="submit()" novalidate>
      @if (errorMessage()) {
        <div
          class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          role="alert"
        >
          {{ errorMessage() }}
        </div>
      }

      <div>
        <label for="invite-fullName" class="text-sm font-medium text-slate-700">Full name</label>
        <input
          id="invite-fullName"
          type="text"
          formControlName="fullName"
          class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
        />
      </div>

      <div>
        <label for="invite-email" class="text-sm font-medium text-slate-700">Email address</label>
        <input
          id="invite-email"
          type="email"
          formControlName="email"
          class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
        />
      </div>

      <fieldset>
        <legend class="text-sm font-medium text-slate-700">Assign roles</legend>
        <div class="mt-2 flex flex-col gap-2">
          @for (role of roles(); track role.id) {
            <label class="flex select-none items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                [checked]="selectedRoleIds().includes(role.id)"
                (change)="toggleRole(role.id)"
                class="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600/30"
              />
              {{ role.name }}
            </label>
          }
        </div>
      </fieldset>

      <div class="mt-2 flex justify-end gap-3">
        <button
          type="button"
          (click)="cancel()"
          class="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          Cancel
        </button>
        <app-button type="submit" label="Send Invitation" loadingText="Sending…" [loading]="loading()" [disabled]="inviteFormInvalid" />
      </div>
    </form>
  </div>
</div>
```

- [ ] **Step 5: Write the (empty) CSS file**

```css
/* src/app/modules/platform-users/feature/invite-manager-modal/invite-manager-modal.css */
/* Styling is handled with Tailwind utility classes in invite-manager-modal.html */
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test -- invite-manager-modal`
Expected: PASS, 4/4.

- [ ] **Step 7: Commit**

```bash
git add src/app/modules/platform-users/feature/invite-manager-modal/
git commit -m "feat: add InviteManagerModal component"
```

---

### Task 4: Wire the modal into `platform-users-list`, add pending state + revoke

**Files:**
- Modify: `src/app/modules/platform-users/feature/platform-users-list/platform-users-list.ts`
- Modify: `src/app/modules/platform-users/feature/platform-users-list/platform-users-list.html`
- Modify: `src/app/modules/platform-users/feature/platform-users-list/platform-users-list.spec.ts`

**Interfaces:**
- Consumes: `InviteManagerModal` (Task 3), `PlatformUsersService.revokeInvite` (Task 1).

- [ ] **Step 1: Write the failing tests**

Add to `platform-users-list.spec.ts` (mirror whatever mocking pattern the existing
tests in that file already use for `usersService`/`notificationService`):

```typescript
  it('opens the invite modal when Invite Manager is clicked', () => {
    const fixture = createComponent(); // however the existing tests in this file construct it
    const component = fixture.componentInstance;

    component.onInviteManagerClicked();

    expect(component['showInviteModal']()).toBe(true);
  });

  it('reloads users when the modal emits invited', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    const loadUsersSpy = jest.spyOn(component, 'loadUsers');

    component.onInviteManagerClicked();
    component['onInviteSuccess']();

    expect(component['showInviteModal']()).toBe(false);
    expect(loadUsersSpy).toHaveBeenCalled();
  });

  it('revokes a pending invite', () => {
    usersService.revokeInvite.mockReturnValue(of(undefined));
    const fixture = createComponent();
    const component = fixture.componentInstance;
    const loadUsersSpy = jest.spyOn(component, 'loadUsers');

    component['revokeInvite']('user-id-1');

    expect(usersService.revokeInvite).toHaveBeenCalledWith('user-id-1');
    expect(loadUsersSpy).toHaveBeenCalled();
  });
```

(`usersService` in this file's existing mock setup needs a `revokeInvite: jest.fn()`
added alongside whatever it already mocks — check the `beforeEach` block for the
existing shape and extend it rather than replacing it.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- platform-users-list`
Expected: FAIL — `showInviteModal`, `onInviteSuccess`, `revokeInvite` don't exist yet.

- [ ] **Step 3: Update the component**

In `platform-users-list.ts`, add the import for `InviteManagerModal`, add it to the
`imports` array, add these members, and replace `onInviteManagerClicked`:

```typescript
  protected readonly showInviteModal = signal(false);

  protected onInviteManagerClicked(): void {
    this.showInviteModal.set(true);
  }

  protected onInviteModalClosed(): void {
    this.showInviteModal.set(false);
  }

  protected onInviteSuccess(): void {
    this.showInviteModal.set(false);
    this.notificationService.success('Invitation sent.');
    this.loadUsers();
  }

  protected revokeInvite(userId: string): void {
    this.usersService.revokeInvite(userId).subscribe({
      next: () => {
        this.notificationService.success('Invitation revoked.');
        this.loadUsers();
      },
      error: () => this.notificationService.error('Could not revoke the invitation.'),
    });
  }
```

(Remove the old `onInviteManagerClicked` body that called
`this.notificationService.info('Invite Manager is coming soon.')` — replaced by the
version above. `revokeInvite`'s parameter is `user.id` — the backend plan's
`POST /admin/v1/platform-access/users/{platformUserId}/revoke-invite` is keyed by
`PlatformUser.Id`, exactly what every row in this list already has, so no extra field
is needed on the list response for this.)

- [ ] **Step 4: Update the template**

Add the modal at the end of the `@else` block's root `<div>` (after the closing
`</table>`/`app-pagination` content, still inside the outer container), the invite
button click already wired to `onInviteManagerClicked`:

```html
      @if (showInviteModal()) {
        <app-invite-manager-modal (invited)="onInviteSuccess()" (closed)="onInviteModalClosed()" />
      }
```

Update the status-badge cell to show a distinct pending state:

```html
              <td class="py-3 pr-4">
                @if (user.status === 'pending') {
                  <app-status-badge label="Pending" tone="warning" />
                } @else {
                  <app-status-badge
                    [label]="user.status === 'active' ? 'Active' : 'Inactive'"
                    [tone]="user.status === 'active' ? 'success' : 'danger'"
                  />
                }
              </td>
```

Add a revoke action cell for pending rows (add a new `<th>Actions</th>` to the header
row and a matching `<td>` per row):

```html
              <td class="py-3 pr-4">
                @if (user.status === 'pending') {
                  <button
                    type="button"
                    (click)="revokeInvite(user.id)"
                    class="text-sm font-medium text-red-700 hover:text-red-800"
                  >
                    Revoke
                  </button>
                }
              </td>
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- platform-users-list`
Expected: PASS.

- [ ] **Step 6: Manual smoke check**

Run `npm start`, sign in, navigate to `/users`, click "Invite Manager", fill the form,
select a role, submit. Expected: modal closes, success toast, new row appears with a
"Pending" badge and a "Revoke" action.

- [ ] **Step 7: Commit**

```bash
git add src/app/modules/platform-users/feature/platform-users-list/
git commit -m "feat: wire InviteManagerModal into platform-users-list"
```

---

### Task 5: Accept-invite screens

**Files:**
- Create: `src/app/modules/auth/feature/accept-invite/accept-invite.ts`
- Create: `src/app/modules/auth/feature/accept-invite/accept-invite.html`
- Create: `src/app/modules/auth/feature/accept-invite/accept-invite.css`
- Test: `src/app/modules/auth/feature/accept-invite/accept-invite.spec.ts`
- Modify: `src/app/app.routes.ts`

**Interfaces:**
- Consumes: `AuthService.acceptInvite` (Task 2), `Button` (existing).

- [ ] **Step 1: Write the failing tests**

```typescript
// src/app/modules/auth/feature/accept-invite/accept-invite.spec.ts
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AcceptInvite } from './accept-invite';
import { AuthService } from '../../../../core/auth/auth.service';

describe('AcceptInvite', () => {
  let authService: { acceptInvite: jest.Mock };
  let router: { navigate: jest.Mock; navigateByUrl: jest.Mock };

  function setup(token: string | null) {
    authService = { acceptInvite: jest.fn() };
    router = { navigate: jest.fn(), navigateByUrl: jest.fn() };

    TestBed.configureTestingModule({
      imports: [AcceptInvite],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap(token ? { token } : {}) },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AcceptInvite);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the not-found view when there is no token in the URL', () => {
    const fixture = setup(null);
    expect(fixture.componentInstance['view']()).toBe('invalid');
  });

  it('submits the token and password, showing success on completion', () => {
    authService.acceptInvite.mockReturnValue(of(undefined));
    const fixture = setup('raw-token');
    const component = fixture.componentInstance;
    component['acceptInviteForm'].setValue({ password: 'NewPassword1!', confirmPassword: 'NewPassword1!' });

    component.submit();

    expect(authService.acceptInvite).toHaveBeenCalledWith('raw-token', 'NewPassword1!');
    expect(component['view']()).toBe('success');
  });

  it('shows the specific backend error message on failure', () => {
    authService.acceptInvite.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { detail: 'This invitation has expired.' } })),
    );
    const fixture = setup('raw-token');
    const component = fixture.componentInstance;
    component['acceptInviteForm'].setValue({ password: 'NewPassword1!', confirmPassword: 'NewPassword1!' });

    component.submit();

    expect(component['view']()).toBe('error');
    expect(component['errorMessage']()).toBe('This invitation has expired.');
  });

  it('navigates to login when Sign in is clicked', () => {
    const fixture = setup('raw-token');
    fixture.componentInstance.continueToSignIn();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/auth/login');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- accept-invite`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Write the component**

```typescript
// src/app/modules/auth/feature/accept-invite/accept-invite.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { Button } from '../../../../shared/ui/button/button';

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return password === confirmPassword ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-accept-invite',
  imports: [ReactiveFormsModule, Button],
  templateUrl: './accept-invite.html',
  styleUrl: './accept-invite.css',
})
export class AcceptInvite implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly view = signal<'form' | 'success' | 'error' | 'invalid'>('form');
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  private token = '';

  protected readonly acceptInviteForm = this.formBuilder.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(64)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatchValidator },
  );

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });

    if (!token) {
      this.view.set('invalid');
      return;
    }
    this.token = token;
  }

  submit(): void {
    if (this.acceptInviteForm.invalid) {
      this.acceptInviteForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const { password } = this.acceptInviteForm.getRawValue();

    this.authService.acceptInvite(this.token, password).subscribe({
      next: () => {
        this.loading.set(false);
        this.view.set('success');
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.detail ?? 'This invitation link is invalid.');
        this.view.set('error');
      },
    });
  }

  continueToSignIn(): void {
    this.router.navigateByUrl('/auth/login');
  }
}
```

- [ ] **Step 4: Write the template**

```html
<!-- src/app/modules/auth/feature/accept-invite/accept-invite.html -->
<div class="w-full max-w-md rounded-2xl bg-white p-10 shadow-2xl">
  @switch (view()) {
    @case ('form') {
      <div class="mb-8 text-center">
        <p class="text-3xl font-extrabold tracking-tight text-blue-700">ONEXSO</p>
        <p class="mt-1 text-sm font-medium text-slate-500">Set your password</p>
      </div>

      <form class="flex flex-col gap-5" [formGroup]="acceptInviteForm" (ngSubmit)="submit()" novalidate>
        <div>
          <label for="password" class="sr-only">Password</label>
          <input
            id="password"
            type="password"
            formControlName="password"
            placeholder="New password"
            class="w-full rounded-lg border border-slate-300 py-3 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
          />
        </div>
        <div>
          <label for="confirmPassword" class="sr-only">Confirm password</label>
          <input
            id="confirmPassword"
            type="password"
            formControlName="confirmPassword"
            placeholder="Confirm password"
            class="w-full rounded-lg border border-slate-300 py-3 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
          />
        </div>
        <app-button type="submit" label="Activate account" loadingText="Activating…" [loading]="loading()" [fullWidth]="true" />
      </form>
    }
    @case ('success') {
      <div class="text-center">
        <h1 class="text-xl font-semibold text-slate-900">Access activated</h1>
        <p class="mt-2 text-sm text-slate-500">Your account is ready. Sign in with your new password.</p>
        <app-button label="Sign in" (clicked)="continueToSignIn()" [fullWidth]="true" />
      </div>
    }
    @case ('error') {
      <div class="text-center">
        <h1 class="text-xl font-semibold text-slate-900">Invitation problem</h1>
        <p class="mt-2 text-sm text-red-700">{{ errorMessage() }}</p>
        <app-button label="Go to sign in" (clicked)="continueToSignIn()" [fullWidth]="true" />
      </div>
    }
    @case ('invalid') {
      <div class="text-center">
        <h1 class="text-xl font-semibold text-slate-900">Invitation not found</h1>
        <p class="mt-2 text-sm text-slate-500">This invitation link is missing or invalid.</p>
        <app-button label="Go to sign in" (clicked)="continueToSignIn()" [fullWidth]="true" />
      </div>
    }
  }
</div>
```

- [ ] **Step 5: Write the (empty) CSS file**

```css
/* src/app/modules/auth/feature/accept-invite/accept-invite.css */
/* Styling is handled with Tailwind utility classes in accept-invite.html */
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test -- accept-invite`
Expected: PASS, 4/4.

- [ ] **Step 7: Register the route**

In `app.routes.ts`, add to the `'auth'` path's `children` array, alongside
`reset-password`:

```typescript
      {
        path: 'accept-invite',
        loadComponent: () =>
          import('./modules/auth/feature/accept-invite/accept-invite').then((m) => m.AcceptInvite),
      },
```

- [ ] **Step 8: Verify the build**

Run: `npm run build`
Expected: 0 errors, `accept-invite` appears as its own lazy chunk.

- [ ] **Step 9: Commit**

```bash
git add src/app/modules/auth/feature/accept-invite/ src/app/app.routes.ts
git commit -m "feat: add accept-invite screens and route"
```

---

## Self-Review Notes

- **Spec coverage:** model/service extensions (Task 1), `AuthService.acceptInvite`
  (Task 2), invite modal (Task 3), list wiring + pending state + revoke (Task 4),
  accept-invite screens + route (Task 5) — every section of the frontend spec has a
  task.
- **Cross-plan consistency:** `revokeInvite` is keyed by `PlatformUser.Id` end to
  end — `API_ENDPOINTS.platformUsers.revokeInvite`, `PlatformUsersService.revokeInvite`,
  and `platform-users-list.ts`'s `revokeInvite(user.id)` call site all agree with the
  backend plan's `POST /admin/v1/platform-access/users/{platformUserId}/revoke-invite`.
- **Type consistency:** `InviteManagerModal`'s `invited`/`closed` outputs match how
  Task 4 binds to them in the template; `AcceptInvite`'s `view` signal states
  (`form`/`success`/`error`/`invalid`) match what the test file and template both
  switch on.
