# System Config: Platform Service Keys Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Service Keys management screen (list, verify, activate/deactivate, edit name, create, rotate key) wired to the already-merged backend `system-config` endpoints.

**Architecture:** Pure frontend addition — thin data layer (7 API methods) + a flat list page (Roles module pattern, no detail page) + two small self-contained modal components (Add, Rotate), each following the existing `InviteManagerModal`/`LogoutConfirmModal` hand-rolled-overlay convention (not the shared `<app-modal>` wrapper, to match how every other form-modal in this codebase is built).

**Tech Stack:** Angular 21 (signals, reactive forms), Jest + `HttpTestingController`.

## Global Constraints

- No backend work — all endpoints under `admin/v1/system-config/service-keys*` already exist and are merged to `development`.
- Permission gating: `platform.system_config.read` (view), `platform.system_config.manage` (all mutating actions — create/update/rotate/verify/activate/deactivate).
- No dummy data — the API key input is write-only (sent on Create/Rotate, never displayed, never pre-filled, never logged); the provider dropdown in Add Service Key is populated from the real `GET /admin/v1/system-config/service-key-providers` endpoint, not a hardcoded list.
- Repo root: `C:\Users\User\OneDrive\Desktop\onexso\platform-administration`. Branch: `feature/system-config-service-keys` (already created off up-to-date `origin/development`, spec already committed there).

---

### Task 1: Service keys data layer

**Files:**
- Create: `src/app/modules/system-config/data/service-key.model.ts`
- Create: `src/app/modules/system-config/data/service-keys.service.ts`
- Create: `src/app/modules/system-config/data/service-keys.service.spec.ts`
- Modify: `src/app/core/config/api-endpoints.ts`

**Interfaces:**
- Produces: `ServiceKey`, `ServiceKeyProviderOption`, `ServiceKeyVerificationResult` interfaces; `ServiceKeysService` with `list()`, `listProviders()`, `create()`, `updateDisplayName()`, `rotateKey()`, `verify()`, `setActive()`. Task 2/3/4 consume all of these.

- [ ] **Step 1: Create `service-key.model.ts`**

```typescript
export interface ServiceKey {
  id: string;
  serviceKey: string;
  displayName: string;
  isActive: boolean;
  lastVerifiedAt: string | null;
  updatedById: string;
  updatedAt: string;
}

export interface ServiceKeyProviderOption {
  providerKey: string;
  displayName: string;
  configured: boolean;
  isActive: boolean;
}

export interface ServiceKeyVerificationResult {
  success: boolean;
  checkedAt: string;
  message: string;
}
```

- [ ] **Step 2: Extend `api-endpoints.ts`**

Find the `auditLogs` block and add a new `systemConfig` block right after it:

```typescript
  auditLogs: {
    list: '/platform-access/auth-events',
  },
  systemConfig: {
    serviceKeys: {
      list: '/system-config/service-keys',
      providers: '/system-config/service-key-providers',
      create: '/system-config/service-keys',
      update: (serviceKey: string) => `/system-config/service-keys/${serviceKey}`,
      rotateKey: (serviceKey: string) => `/system-config/service-keys/${serviceKey}/rotate-key`,
      verify: (serviceKey: string) => `/system-config/service-keys/${serviceKey}/verify`,
      activate: (serviceKey: string) => `/system-config/service-keys/${serviceKey}/activate`,
      deactivate: (serviceKey: string) => `/system-config/service-keys/${serviceKey}/deactivate`,
    },
  },
```

(If `auditLogs` isn't present yet on this fresh branch, add `systemConfig` as its own new top-level key at the end of `API_ENDPOINTS` instead, right before the closing `} as const;`.)

- [ ] **Step 3: Create `service-keys.service.ts`**

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import { ServiceKey, ServiceKeyProviderOption, ServiceKeyVerificationResult } from './service-key.model';

@Injectable({ providedIn: 'root' })
export class ServiceKeysService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  list(): Observable<ServiceKey[]> {
    return this.http.get<ServiceKey[]>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.serviceKeys.list}`,
      { withCredentials: true },
    );
  }

  listProviders(): Observable<ServiceKeyProviderOption[]> {
    return this.http.get<ServiceKeyProviderOption[]>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.serviceKeys.providers}`,
      { withCredentials: true },
    );
  }

  create(serviceKey: string, displayName: string, apiKey: string): Observable<ServiceKey> {
    return this.http.post<ServiceKey>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.serviceKeys.create}`,
      { serviceKey, displayName, apiKey },
      { withCredentials: true },
    );
  }

  updateDisplayName(serviceKey: string, displayName: string): Observable<ServiceKey> {
    return this.http.put<ServiceKey>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.serviceKeys.update(serviceKey)}`,
      { displayName },
      { withCredentials: true },
    );
  }

  rotateKey(serviceKey: string, apiKey: string): Observable<ServiceKey> {
    return this.http.post<ServiceKey>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.serviceKeys.rotateKey(serviceKey)}`,
      { apiKey },
      { withCredentials: true },
    );
  }

  verify(serviceKey: string): Observable<ServiceKeyVerificationResult> {
    return this.http.post<ServiceKeyVerificationResult>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.serviceKeys.verify(serviceKey)}`,
      {},
      { withCredentials: true },
    );
  }

  setActive(serviceKey: string, active: boolean): Observable<ServiceKey> {
    const url = active
      ? API_ENDPOINTS.systemConfig.serviceKeys.activate(serviceKey)
      : API_ENDPOINTS.systemConfig.serviceKeys.deactivate(serviceKey);
    return this.http.post<ServiceKey>(`${this.baseUrl}${url}`, {}, { withCredentials: true });
  }
}
```

- [ ] **Step 4: Create `service-keys.service.spec.ts`**

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ServiceKeysService } from './service-keys.service';
import { environment } from '../../../../environments/environment';

describe('ServiceKeysService', () => {
  let service: ServiceKeysService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ServiceKeysService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists service keys', () => {
    let result: unknown;
    service.list().subscribe((keys) => (result = keys));

    const req = httpMock.expectOne(`${environment.apiUrl}/system-config/service-keys`);
    expect(req.request.method).toBe('GET');
    const key = {
      id: 'k1',
      serviceKey: 'resend',
      displayName: 'Resend',
      isActive: true,
      lastVerifiedAt: null,
      updatedById: 'u1',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    req.flush([key]);
    expect(result).toEqual([key]);
  });

  it('lists provider options', () => {
    let result: unknown;
    service.listProviders().subscribe((options) => (result = options));

    const req = httpMock.expectOne(`${environment.apiUrl}/system-config/service-key-providers`);
    expect(req.request.method).toBe('GET');
    const option = { providerKey: 'resend', displayName: 'Resend', configured: false, isActive: true };
    req.flush([option]);
    expect(result).toEqual([option]);
  });

  it('creates a service key', () => {
    service.create('resend', 'Resend', 'secret-key').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/system-config/service-keys`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      serviceKey: 'resend',
      displayName: 'Resend',
      apiKey: 'secret-key',
    });
    req.flush({});
  });

  it('updates the display name', () => {
    service.updateDisplayName('resend', 'Resend Prod').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/system-config/service-keys/resend`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ displayName: 'Resend Prod' });
    req.flush({});
  });

  it('rotates the key', () => {
    service.rotateKey('resend', 'new-secret').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/system-config/service-keys/resend/rotate-key`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ apiKey: 'new-secret' });
    req.flush({});
  });

  it('verifies the saved key', () => {
    let result: unknown;
    service.verify('resend').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${environment.apiUrl}/system-config/service-keys/resend/verify`);
    expect(req.request.method).toBe('POST');
    const verification = { success: true, checkedAt: '2026-01-01T00:00:00Z', message: 'OK' };
    req.flush(verification);
    expect(result).toEqual(verification);
  });

  it('activates a service key', () => {
    service.setActive('resend', true).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/system-config/service-keys/resend/activate`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('deactivates a service key', () => {
    service.setActive('resend', false).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/system-config/service-keys/resend/deactivate`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });
});
```

- [ ] **Step 5: Run the spec**

Run: `npx jest service-keys.service.spec`
Expected: PASS (8 tests)

- [ ] **Step 6: Commit**

```bash
git add src/app/modules/system-config/data src/app/core/config/api-endpoints.ts
git commit -m "feat: add system config service keys data layer"
```

---

### Task 2: Service keys list page + route + sidebar

**Files:**
- Create: `src/app/modules/system-config/feature/service-keys-list/service-keys-list.ts`
- Create: `src/app/modules/system-config/feature/service-keys-list/service-keys-list.html`
- Create: `src/app/modules/system-config/feature/service-keys-list/service-keys-list.spec.ts`
- Modify: `src/app/app.routes.ts`
- Modify: `src/app/layouts/main-layout/sidebar/sidebar.html`

**Interfaces:**
- Consumes: `ServiceKeysService`/`ServiceKey` (Task 1), `PermissionStore.hasPermission()`, `NotificationService.success()/error()`.
- Produces: `ServiceKeysList` component with `protected loadKeys(): void` and `protected readonly keys = signal<ServiceKey[]>([])`. Task 3/4 (modals) are hosted by this component and call `loadKeys()` after a successful mutation.

- [ ] **Step 1: Write `service-keys-list.ts`**

```typescript
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ServiceKeysService } from '../../data/service-keys.service';
import { ServiceKey } from '../../data/service-key.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';
import { Button } from '../../../../shared/ui/button/button';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { Loader } from '../../../../shared/ui/loader/loader';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';

@Component({
  selector: 'app-service-keys-list',
  imports: [Button, StatusBadge, Loader, ErrorBanner, EmptyState, DatePipe],
  templateUrl: './service-keys-list.html',
})
export class ServiceKeysList implements OnInit {
  private readonly serviceKeysService = inject(ServiceKeysService);
  private readonly notificationService = inject(NotificationService);
  protected readonly permissionStore = inject(PermissionStore);

  protected readonly canView = computed(() => this.permissionStore.hasPermission('platform.system_config.read'));
  protected readonly canManage = computed(() =>
    this.permissionStore.hasPermission('platform.system_config.manage'),
  );

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly keys = signal<ServiceKey[]>([]);
  protected readonly verifyingKey = signal<string | null>(null);
  protected readonly editingKey = signal<string | null>(null);
  protected readonly editingName = signal('');
  protected readonly showAddModal = signal(false);
  protected readonly rotatingKey = signal<string | null>(null);

  ngOnInit(): void {
    if (!this.canView()) {
      return;
    }
    this.loadKeys();
  }

  protected loadKeys(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.serviceKeysService.list().subscribe({
      next: (keys) => {
        this.keys.set(keys);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Something went wrong. Please try again.');
        this.loading.set(false);
      },
    });
  }

  protected verifyKey(serviceKey: string): void {
    this.verifyingKey.set(serviceKey);
    this.serviceKeysService.verify(serviceKey).subscribe({
      next: (result) => {
        this.verifyingKey.set(null);
        if (result.success) {
          this.notificationService.success(result.message);
        } else {
          this.notificationService.error(result.message);
        }
        this.loadKeys();
      },
      error: () => {
        this.verifyingKey.set(null);
        this.notificationService.error('Could not verify the service key.');
      },
    });
  }

  protected toggleActive(key: ServiceKey): void {
    this.serviceKeysService.setActive(key.serviceKey, !key.isActive).subscribe({
      next: () => {
        this.notificationService.success(key.isActive ? 'Service key deactivated.' : 'Service key activated.');
        this.loadKeys();
      },
      error: (error) => {
        this.notificationService.error(error.error?.detail ?? 'Could not update the service key.');
      },
    });
  }

  protected startEditName(key: ServiceKey): void {
    this.editingKey.set(key.serviceKey);
    this.editingName.set(key.displayName);
  }

  protected cancelEditName(): void {
    this.editingKey.set(null);
  }

  protected saveEditName(serviceKey: string): void {
    const displayName = this.editingName().trim();
    if (!displayName) {
      this.editingKey.set(null);
      return;
    }

    this.serviceKeysService.updateDisplayName(serviceKey, displayName).subscribe({
      next: () => {
        this.editingKey.set(null);
        this.notificationService.success('Display name updated.');
        this.loadKeys();
      },
      error: (error) => {
        this.editingKey.set(null);
        this.notificationService.error(error.error?.detail ?? 'Could not update the display name.');
      },
    });
  }

  protected openAddModal(): void {
    this.showAddModal.set(true);
  }

  protected onAddModalClosed(): void {
    this.showAddModal.set(false);
  }

  protected onServiceKeyCreated(): void {
    this.showAddModal.set(false);
    this.notificationService.success('Service key created.');
    this.loadKeys();
  }

  protected openRotateModal(serviceKey: string): void {
    this.rotatingKey.set(serviceKey);
  }

  protected onRotateModalClosed(): void {
    this.rotatingKey.set(null);
  }

  protected onKeyRotated(): void {
    this.rotatingKey.set(null);
    this.notificationService.success('Service key rotated.');
    this.loadKeys();
  }
}
```

- [ ] **Step 2: Write `service-keys-list.html`**

```html
@if (!canView()) {
  <div class="rounded-2xl bg-white p-8 shadow-sm">
    <p class="text-sm font-medium text-red-700">No permission to view page</p>
  </div>
} @else {
  <div class="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold text-slate-900">Service Keys</h1>
        <p class="mt-1 text-sm text-slate-500">Platform-owned API credentials for third-party services</p>
      </div>
      @if (canManage()) {
        <app-button label="Add Service Key" (clicked)="openAddModal()" />
      }
    </div>

    @if (loading()) {
      <app-loader label="Loading…" />
    } @else if (errorMessage(); as message) {
      <app-error-banner [message]="message" (retry)="loadKeys()" />
    } @else if (keys().length === 0) {
      <app-empty-state title="No service keys configured yet" />
    } @else {
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="border-b border-slate-200 text-xs font-medium uppercase text-slate-500">
            <th class="py-2 pr-4">Service Key</th>
            <th class="py-2 pr-4">Display Name</th>
            <th class="py-2 pr-4">Status</th>
            <th class="py-2 pr-4">Last Verified</th>
            @if (canManage()) {
              <th class="py-2 pr-4">Actions</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (key of keys(); track key.serviceKey) {
            <tr class="border-b border-slate-100">
              <td class="py-3 pr-4 font-medium text-slate-900">{{ key.serviceKey }}</td>
              <td class="py-3 pr-4 text-slate-600">
                @if (editingKey() === key.serviceKey) {
                  <input
                    type="text"
                    [value]="editingName()"
                    (input)="editingName.set($any($event.target).value)"
                    (keydown.enter)="saveEditName(key.serviceKey)"
                    (blur)="saveEditName(key.serviceKey)"
                    class="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                  />
                } @else {
                  <button
                    type="button"
                    (click)="canManage() && startEditName(key)"
                    class="text-left hover:underline"
                  >
                    {{ key.displayName }}
                  </button>
                }
              </td>
              <td class="py-3 pr-4">
                <app-status-badge
                  [label]="key.isActive ? 'Active' : 'Inactive'"
                  [tone]="key.isActive ? 'success' : 'neutral'"
                />
              </td>
              <td class="py-3 pr-4 text-slate-600">{{ key.lastVerifiedAt ? (key.lastVerifiedAt | date: 'medium') : '—' }}</td>
              @if (canManage()) {
                <td class="py-3 pr-4">
                  <div class="flex gap-2">
                    <app-button
                      label="Verify"
                      variant="secondary"
                      [loading]="verifyingKey() === key.serviceKey"
                      (clicked)="verifyKey(key.serviceKey)"
                    />
                    <app-button
                      [label]="key.isActive ? 'Deactivate' : 'Activate'"
                      variant="secondary"
                      (clicked)="toggleActive(key)"
                    />
                    <app-button label="Rotate Key" variant="secondary" (clicked)="openRotateModal(key.serviceKey)" />
                  </div>
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    }
  </div>
}
```

- [ ] **Step 3: Write `service-keys-list.spec.ts`**

```typescript
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ServiceKeysList } from './service-keys-list';
import { ServiceKeysService } from '../../data/service-keys.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';

describe('ServiceKeysList', () => {
  let serviceKeysService: {
    list: jest.Mock;
    verify: jest.Mock;
    setActive: jest.Mock;
    updateDisplayName: jest.Mock;
  };
  let notificationService: { success: jest.Mock; error: jest.Mock };

  const sampleKey = {
    id: 'k1',
    serviceKey: 'resend',
    displayName: 'Resend',
    isActive: true,
    lastVerifiedAt: null,
    updatedById: 'u1',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  function setup(permissions: string[] = ['platform.system_config.read', 'platform.system_config.manage']) {
    serviceKeysService = {
      list: jest.fn().mockReturnValue(of([sampleKey])),
      verify: jest.fn(),
      setActive: jest.fn(),
      updateDisplayName: jest.fn(),
    };
    notificationService = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [ServiceKeysList],
      providers: [
        { provide: ServiceKeysService, useValue: serviceKeysService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ServiceKeysList);
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

  it('does not call the API and shows the no-permission message when unauthorized', () => {
    const fixture = setup([]);
    expect(serviceKeysService.list).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('No permission to view page');
  });

  it('loads and displays service keys when authorized', () => {
    const fixture = setup();
    expect(serviceKeysService.list).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('resend');
    expect(fixture.nativeElement.textContent).toContain('Active');
  });

  it('hides row actions without manage permission', () => {
    const fixture = setup(['platform.system_config.read']);
    expect(fixture.nativeElement.textContent).not.toContain('Verify');
    expect(fixture.nativeElement.textContent).not.toContain('Add Service Key');
  });

  it('shows a success toast when verify succeeds', () => {
    const fixture = setup();
    serviceKeysService.verify.mockReturnValue(of({ success: true, checkedAt: '2026-01-01T00:00:00Z', message: 'Key is valid.' }));
    const component = fixture.componentInstance;

    component['verifyKey']('resend');

    expect(notificationService.success).toHaveBeenCalledWith('Key is valid.');
  });

  it('shows an error toast when verify fails', () => {
    const fixture = setup();
    serviceKeysService.verify.mockReturnValue(of({ success: false, checkedAt: '2026-01-01T00:00:00Z', message: 'Key rejected by provider.' }));
    const component = fixture.componentInstance;

    component['verifyKey']('resend');

    expect(notificationService.error).toHaveBeenCalledWith('Key rejected by provider.');
  });

  it('toggles active state', () => {
    const fixture = setup();
    serviceKeysService.setActive.mockReturnValue(of({ ...sampleKey, isActive: false }));
    const component = fixture.componentInstance;

    component['toggleActive'](sampleKey);

    expect(serviceKeysService.setActive).toHaveBeenCalledWith('resend', false);
  });

  it('saves an edited display name', () => {
    const fixture = setup();
    serviceKeysService.updateDisplayName.mockReturnValue(of({ ...sampleKey, displayName: 'Resend Prod' }));
    const component = fixture.componentInstance;
    component['startEditName'](sampleKey);
    component['editingName'].set('Resend Prod');

    component['saveEditName']('resend');

    expect(serviceKeysService.updateDisplayName).toHaveBeenCalledWith('resend', 'Resend Prod');
  });

  it('shows the empty state when there are no keys', () => {
    serviceKeysService = { list: jest.fn().mockReturnValue(of([])), verify: jest.fn(), setActive: jest.fn(), updateDisplayName: jest.fn() };
    notificationService = { success: jest.fn(), error: jest.fn() };
    TestBed.configureTestingModule({
      imports: [ServiceKeysList],
      providers: [
        { provide: ServiceKeysService, useValue: serviceKeysService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ServiceKeysList);
    const store = TestBed.inject(PermissionStore);
    store.setAuthorizationContext({
      userId: 'u1',
      email: 'admin@example.com',
      platformRole: 'Platform Super Admin',
      expiresAt: '',
      mfaRequired: false,
      permissions: ['platform.system_config.read'],
      scopes: {},
      entitlements: [],
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No service keys configured yet');
  });
});
```

- [ ] **Step 4: Add the route in `app.routes.ts`**

Find the `audit-logs` route entry and add a new sibling route right after it:

```typescript
      {
        path: 'system-config/service-keys',
        loadComponent: () =>
          import('./modules/system-config/feature/service-keys-list/service-keys-list').then(
            (m) => m.ServiceKeysList,
          ),
      },
```

- [ ] **Step 5: Convert the sidebar's disabled "Settings" placeholder to an active link**

Find (in `sidebar.html`):

```html
  <span
    data-sidebar-item
    class="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400"
  >
    <svg class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <line x1="4" y1="6" x2="20" y2="6"></line>
      <circle cx="9" cy="6" r="2" fill="currentColor" stroke="none"></circle>
      <line x1="4" y1="12" x2="20" y2="12"></line>
      <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none"></circle>
      <line x1="4" y1="18" x2="20" y2="18"></line>
      <circle cx="11" cy="18" r="2" fill="currentColor" stroke="none"></circle>
    </svg>
    Settings
  </span>
```

Replace with:

```html
  <a
    routerLink="/system-config/service-keys"
    routerLinkActive="bg-indigo-50 text-indigo-700 font-semibold"
    data-sidebar-item
    class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
  >
    <svg class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <line x1="4" y1="6" x2="20" y2="6"></line>
      <circle cx="9" cy="6" r="2" fill="currentColor" stroke="none"></circle>
      <line x1="4" y1="12" x2="20" y2="12"></line>
      <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none"></circle>
      <line x1="4" y1="18" x2="20" y2="18"></line>
      <circle cx="11" cy="18" r="2" fill="currentColor" stroke="none"></circle>
    </svg>
    Settings
  </a>
```

- [ ] **Step 6: Run the spec**

Run: `npx jest service-keys-list.spec`
Expected: PASS (8 tests)

- [ ] **Step 7: Commit**

```bash
git add src/app/modules/system-config/feature/service-keys-list src/app/app.routes.ts src/app/layouts/main-layout/sidebar/sidebar.html
git commit -m "feat: add service keys list page"
```

---

### Task 3: Add Service Key modal

**Files:**
- Create: `src/app/modules/system-config/feature/add-service-key-modal/add-service-key-modal.ts`
- Create: `src/app/modules/system-config/feature/add-service-key-modal/add-service-key-modal.html`
- Create: `src/app/modules/system-config/feature/add-service-key-modal/add-service-key-modal.spec.ts`
- Modify: `src/app/modules/system-config/feature/service-keys-list/service-keys-list.html`

**Interfaces:**
- Consumes: `ServiceKeysService.listProviders()`/`.create()` (Task 1).
- Produces: `AddServiceKeyModal` component, selector `app-add-service-key-modal`, outputs `created: EventEmitter<void>`, `closed: EventEmitter<void>`. Hosted by `ServiceKeysList` (Task 2), which already has `showAddModal`/`onAddModalClosed()`/`onServiceKeyCreated()` wired.

- [ ] **Step 1: Write the failing spec**

```typescript
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AddServiceKeyModal } from './add-service-key-modal';
import { ServiceKeysService } from '../../data/service-keys.service';

describe('AddServiceKeyModal', () => {
  let serviceKeysService: { listProviders: jest.Mock; create: jest.Mock };

  const providers = [
    { providerKey: 'resend', displayName: 'Resend', configured: false, isActive: true },
    { providerKey: 'sendgrid', displayName: 'SendGrid', configured: true, isActive: true },
  ];

  function setup() {
    serviceKeysService = {
      listProviders: jest.fn().mockReturnValue(of(providers)),
      create: jest.fn(),
    };

    TestBed.configureTestingModule({
      imports: [AddServiceKeyModal],
      providers: [{ provide: ServiceKeysService, useValue: serviceKeysService }],
    }).compileComponents();

    const fixture = TestBed.createComponent(AddServiceKeyModal);
    fixture.detectChanges();
    return fixture;
  }

  it('loads provider options on init', () => {
    const fixture = setup();
    expect(serviceKeysService.listProviders).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Resend');
  });

  it('disables already-configured providers in the dropdown', () => {
    const fixture = setup();
    const options: HTMLOptionElement[] = Array.from(fixture.nativeElement.querySelectorAll('option'));
    const sendgridOption = options.find((o) => o.value === 'sendgrid');
    expect(sendgridOption?.disabled).toBe(true);
  });

  it('creates a service key with the form values', () => {
    const fixture = setup();
    serviceKeysService.create.mockReturnValue(of({}));
    const component = fixture.componentInstance;
    let created = false;
    component.created.subscribe(() => (created = true));

    component['form'].setValue({ serviceKey: 'resend', displayName: 'Resend', apiKey: 'secret' });
    component['submit']();

    expect(serviceKeysService.create).toHaveBeenCalledWith('resend', 'Resend', 'secret');
    expect(created).toBe(true);
  });

  it('shows the backend error detail on conflict', () => {
    const fixture = setup();
    serviceKeysService.create.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { detail: "A platform service key 'resend' already exists. Use rotate-key to replace its credential." },
          }),
      ),
    );
    const component = fixture.componentInstance;
    component['form'].setValue({ serviceKey: 'resend', displayName: 'Resend', apiKey: 'secret' });

    component['submit']();

    expect(fixture.nativeElement.textContent).toContain('already exists');
  });

  it('emits closed on cancel', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    let closed = false;
    component.closed.subscribe(() => (closed = true));

    component['cancel']();

    expect(closed).toBe(true);
  });
});
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `npx jest add-service-key-modal.spec`
Expected: FAIL — `Cannot find module './add-service-key-modal'`

- [ ] **Step 3: Write `add-service-key-modal.ts`**

```typescript
import { Component, OnInit, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ServiceKeysService } from '../../data/service-keys.service';
import { ServiceKeyProviderOption } from '../../data/service-key.model';
import { Button } from '../../../../shared/ui/button/button';

@Component({
  selector: 'app-add-service-key-modal',
  imports: [ReactiveFormsModule, Button],
  templateUrl: './add-service-key-modal.html',
})
export class AddServiceKeyModal implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly serviceKeysService = inject(ServiceKeysService);

  readonly created = output<void>();
  readonly closed = output<void>();

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly providers = signal<ServiceKeyProviderOption[]>([]);

  protected readonly form = this.formBuilder.nonNullable.group({
    serviceKey: ['', Validators.required],
    displayName: ['', [Validators.required, Validators.maxLength(80)]],
    apiKey: ['', Validators.required],
  });

  ngOnInit(): void {
    this.serviceKeysService.listProviders().subscribe({
      next: (providers) => this.providers.set(providers),
      error: () => this.errorMessage.set('Could not load provider options.'),
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    const { serviceKey, displayName, apiKey } = this.form.getRawValue();

    this.serviceKeysService.create(serviceKey, displayName, apiKey).subscribe({
      next: () => {
        this.loading.set(false);
        this.created.emit();
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(error.error?.detail ?? 'Could not create the service key.');
      },
    });
  }

  cancel(): void {
    this.closed.emit();
  }
}
```

- [ ] **Step 4: Write `add-service-key-modal.html`**

```html
<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
  <div class="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
    <h2 class="text-lg font-semibold text-slate-900">Add Service Key</h2>

    <form class="mt-6 flex flex-col gap-4" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      @if (errorMessage()) {
        <div
          class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          role="alert"
        >
          {{ errorMessage() }}
        </div>
      }

      <div>
        <label for="add-service-key-provider" class="text-sm font-medium text-slate-700">Provider</label>
        <select
          id="add-service-key-provider"
          formControlName="serviceKey"
          class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
        >
          <option value="" disabled>Select a provider</option>
          @for (provider of providers(); track provider.providerKey) {
            <option [value]="provider.providerKey" [disabled]="provider.configured">
              {{ provider.displayName }}{{ provider.configured ? ' (already configured)' : '' }}
            </option>
          }
        </select>
      </div>

      <div>
        <label for="add-service-key-displayName" class="text-sm font-medium text-slate-700">Display name</label>
        <input
          id="add-service-key-displayName"
          type="text"
          formControlName="displayName"
          class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
        />
      </div>

      <div>
        <label for="add-service-key-apiKey" class="text-sm font-medium text-slate-700">API key</label>
        <input
          id="add-service-key-apiKey"
          type="password"
          formControlName="apiKey"
          autocomplete="new-password"
          class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
        />
      </div>

      <div class="mt-2 flex justify-end gap-3">
        <button
          type="button"
          (click)="cancel()"
          class="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          Cancel
        </button>
        <app-button type="submit" label="Add Service Key" loadingText="Saving…" [loading]="loading()" [disabled]="form.invalid" />
      </div>
    </form>
  </div>
</div>
```

- [ ] **Step 5: Run the spec to verify it passes**

Run: `npx jest add-service-key-modal.spec`
Expected: PASS (5 tests)

- [ ] **Step 6: Host the modal in `service-keys-list.html`**

Add at the end of the file (after the closing `}` of the main `@if`/`@else` block, still inside the outer `@else`... — place it as a sibling right after the closing `</div>` of the card, still inside the `@else` branch that starts with `<div class="flex flex-col gap-4...">`):

Find:

```html
      </table>
    }
  </div>
}
```

Replace with:

```html
      </table>
    }
  </div>

  @if (showAddModal()) {
    <app-add-service-key-modal (created)="onServiceKeyCreated()" (closed)="onAddModalClosed()" />
  }
}
```

Then add `AddServiceKeyModal` to `service-keys-list.ts`'s `imports` array:

```typescript
import { AddServiceKeyModal } from '../add-service-key-modal/add-service-key-modal';
// ...
@Component({
  selector: 'app-service-keys-list',
  imports: [Button, StatusBadge, Loader, ErrorBanner, EmptyState, DatePipe, AddServiceKeyModal],
  templateUrl: './service-keys-list.html',
})
```

- [ ] **Step 7: Run the list spec again to confirm nothing broke**

Run: `npx jest service-keys-list.spec`
Expected: PASS (8 tests, unchanged)

- [ ] **Step 8: Commit**

```bash
git add src/app/modules/system-config/feature/add-service-key-modal src/app/modules/system-config/feature/service-keys-list
git commit -m "feat: add Add Service Key modal"
```

---

### Task 4: Rotate Service Key modal + full verification

**Files:**
- Create: `src/app/modules/system-config/feature/rotate-service-key-modal/rotate-service-key-modal.ts`
- Create: `src/app/modules/system-config/feature/rotate-service-key-modal/rotate-service-key-modal.html`
- Create: `src/app/modules/system-config/feature/rotate-service-key-modal/rotate-service-key-modal.spec.ts`
- Modify: `src/app/modules/system-config/feature/service-keys-list/service-keys-list.html`
- Modify: `src/app/modules/system-config/feature/service-keys-list/service-keys-list.ts`

**Interfaces:**
- Consumes: `ServiceKeysService.rotateKey()` (Task 1).
- Produces: `RotateServiceKeyModal` component, selector `app-rotate-service-key-modal`, input `serviceKey: string` (required), outputs `rotated: EventEmitter<void>`, `closed: EventEmitter<void>`.

- [ ] **Step 1: Write the failing spec**

```typescript
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { RotateServiceKeyModal } from './rotate-service-key-modal';
import { ServiceKeysService } from '../../data/service-keys.service';

describe('RotateServiceKeyModal', () => {
  let serviceKeysService: { rotateKey: jest.Mock };

  function setup() {
    serviceKeysService = { rotateKey: jest.fn() };

    TestBed.configureTestingModule({
      imports: [RotateServiceKeyModal],
      providers: [{ provide: ServiceKeysService, useValue: serviceKeysService }],
    }).compileComponents();

    const fixture = TestBed.createComponent(RotateServiceKeyModal);
    fixture.componentRef.setInput('serviceKey', 'resend');
    fixture.detectChanges();
    return fixture;
  }

  it('renders the service key being rotated', () => {
    const fixture = setup();
    expect(fixture.nativeElement.textContent).toContain('resend');
  });

  it('rotates the key with the typed value', () => {
    const fixture = setup();
    serviceKeysService.rotateKey.mockReturnValue(of({}));
    const component = fixture.componentInstance;
    let rotated = false;
    component.rotated.subscribe(() => (rotated = true));

    component['form'].setValue({ apiKey: 'new-secret' });
    component['submit']();

    expect(serviceKeysService.rotateKey).toHaveBeenCalledWith('resend', 'new-secret');
    expect(rotated).toBe(true);
  });

  it('shows the backend error message on failure', () => {
    const fixture = setup();
    serviceKeysService.rotateKey.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { detail: 'apiKey is required.' } })),
    );
    const component = fixture.componentInstance;
    component['form'].setValue({ apiKey: 'new-secret' });

    component['submit']();

    expect(fixture.nativeElement.textContent).toContain('apiKey is required.');
  });

  it('emits closed on cancel', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    let closed = false;
    component.closed.subscribe(() => (closed = true));

    component['cancel']();

    expect(closed).toBe(true);
  });
});
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `npx jest rotate-service-key-modal.spec`
Expected: FAIL — `Cannot find module './rotate-service-key-modal'`

- [ ] **Step 3: Write `rotate-service-key-modal.ts`**

```typescript
import { Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ServiceKeysService } from '../../data/service-keys.service';
import { Button } from '../../../../shared/ui/button/button';

@Component({
  selector: 'app-rotate-service-key-modal',
  imports: [ReactiveFormsModule, Button],
  templateUrl: './rotate-service-key-modal.html',
})
export class RotateServiceKeyModal {
  private readonly formBuilder = inject(FormBuilder);
  private readonly serviceKeysService = inject(ServiceKeysService);

  readonly serviceKey = input.required<string>();
  readonly rotated = output<void>();
  readonly closed = output<void>();

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    apiKey: ['', Validators.required],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    const { apiKey } = this.form.getRawValue();

    this.serviceKeysService.rotateKey(this.serviceKey(), apiKey).subscribe({
      next: () => {
        this.loading.set(false);
        this.rotated.emit();
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(error.error?.detail ?? 'Could not rotate the service key.');
      },
    });
  }

  cancel(): void {
    this.closed.emit();
  }
}
```

- [ ] **Step 4: Write `rotate-service-key-modal.html`**

```html
<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
  <div class="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
    <h2 class="text-lg font-semibold text-slate-900">Rotate Key — {{ serviceKey() }}</h2>
    <p class="mt-1 text-sm text-slate-500">The previous key will stop working immediately once rotated.</p>

    <form class="mt-6 flex flex-col gap-4" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      @if (errorMessage()) {
        <div
          class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          role="alert"
        >
          {{ errorMessage() }}
        </div>
      }

      <div>
        <label for="rotate-service-key-apiKey" class="text-sm font-medium text-slate-700">New API key</label>
        <input
          id="rotate-service-key-apiKey"
          type="password"
          formControlName="apiKey"
          autocomplete="new-password"
          class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
        />
      </div>

      <div class="mt-2 flex justify-end gap-3">
        <button
          type="button"
          (click)="cancel()"
          class="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          Cancel
        </button>
        <app-button type="submit" label="Rotate Key" loadingText="Rotating…" [loading]="loading()" [disabled]="form.invalid" />
      </div>
    </form>
  </div>
</div>
```

- [ ] **Step 5: Run the spec to verify it passes**

Run: `npx jest rotate-service-key-modal.spec`
Expected: PASS (4 tests)

- [ ] **Step 6: Host the modal in `service-keys-list.html` and wire it in `service-keys-list.ts`**

In `service-keys-list.html`, find:

```html
  @if (showAddModal()) {
    <app-add-service-key-modal (created)="onServiceKeyCreated()" (closed)="onAddModalClosed()" />
  }
}
```

Replace with:

```html
  @if (showAddModal()) {
    <app-add-service-key-modal (created)="onServiceKeyCreated()" (closed)="onAddModalClosed()" />
  }
  @if (rotatingKey(); as serviceKey) {
    <app-rotate-service-key-modal
      [serviceKey]="serviceKey"
      (rotated)="onKeyRotated()"
      (closed)="onRotateModalClosed()"
    />
  }
}
```

In `service-keys-list.ts`, add the import and add `RotateServiceKeyModal` to the `imports` array:

```typescript
import { RotateServiceKeyModal } from '../rotate-service-key-modal/rotate-service-key-modal';
// ...
@Component({
  selector: 'app-service-keys-list',
  imports: [Button, StatusBadge, Loader, ErrorBanner, EmptyState, DatePipe, AddServiceKeyModal, RotateServiceKeyModal],
  templateUrl: './service-keys-list.html',
})
```

- [ ] **Step 7: Run the list spec again to confirm nothing broke**

Run: `npx jest service-keys-list.spec`
Expected: PASS (8 tests, unchanged)

- [ ] **Step 8: Run full verification**

```bash
npm test
```
Expected: PASS, all suites green.

```bash
npm run lint
```
Expected: no new errors (pre-existing unrelated `tenant-wizard.html`/`modal.ts`/`user-profile-drawer.html` issues may still appear — do not touch them).

```bash
npm run build
```
Expected: builds cleanly.

- [ ] **Step 9: Commit**

```bash
git add src/app/modules/system-config/feature/rotate-service-key-modal src/app/modules/system-config/feature/service-keys-list
git commit -m "feat: add Rotate Service Key modal"
```

---

## Final Step

After Task 4, use superpowers:finishing-a-development-branch to verify the full test suite one more time and present merge/PR/keep options.
