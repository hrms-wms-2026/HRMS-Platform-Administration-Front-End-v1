# System Config: Platform OAuth Apps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an OAuth Apps management screen — a 4-provider overview (GitHub, Google, Microsoft, Zoom) plus a per-provider detail drawer (view, configure, rotate secret, validate config, activate/deactivate) — wired to the already-merged backend `system-config/oauth-apps` endpoints.

**Architecture:** Pure frontend addition to the existing `system-config` module (started by the Service Keys sub-project). A `OAuthAppsList` landing page renders a fixed, compact settings list — one row per provider (the backend always returns exactly 4). Clicking a row opens `OAuthAppDetailDrawer`, a right-side slide-in panel that owns every credential-touching action, built on the same structural pattern as the existing `UserProfileDrawer` (`input.required<T>()` + `effect()` reload, `closed`/`updated` outputs, `w-96` slide-in with backdrop-click-to-close).

**Tech Stack:** Angular 21 (signals, `effect()`, reactive forms), Jest + `HttpTestingController`.

## Global Constraints

- No backend work — all endpoints under `admin/v1/system-config/oauth-apps*` already exist and are merged to `development`.
- Permission gating: `platform.system_config.read` (view), `platform.system_config.manage` (configure/rotate/activate/deactivate/validate).
- No dummy data — `clientSecret`/`privateKey` inputs are write-only (sent on Configure/Rotate, never displayed, never pre-filled); `authorizationUrl`/`tokenUrl`/`defaultScopes`/`capabilities` are rendered read-only exactly as the backend returns them, never hardcoded per-provider in the frontend.
- Terminology: the `/validate-config` action must be labeled **"Validate Configuration"**, never "Verify" — its result is a local structural check only (`verificationType` is always `"local"`), not a live call to GitHub/Google/Microsoft/Zoom. Any user-facing message must make this explicit (e.g. prefix with `"Local check: "`).
- Repo root: `C:\Users\User\OneDrive\Desktop\onexso\platform-administration`. Branch: `feature/system-config-oauth-apps` (already created off up-to-date `origin/development`, spec already committed there).

---

### Task 1: OAuth apps data layer

**Files:**
- Create: `src/app/modules/system-config/data/oauth-app.model.ts`
- Create: `src/app/modules/system-config/data/oauth-apps.service.ts`
- Create: `src/app/modules/system-config/data/oauth-apps.service.spec.ts`
- Modify: `src/app/core/config/api-endpoints.ts`

**Interfaces:**
- Produces: `OAuthApp`, `OAuthAppValidateConfigResult`, `ConfigureOAuthAppPayload` interfaces; `OAuthAppsService` with `list()`, `getById()`, `configure()`, `rotateSecret()`, `setActive()`, `validateConfig()`. Task 2/3/4 consume all of these.

- [ ] **Step 1: Create `oauth-app.model.ts`**

```typescript
export interface OAuthApp {
  provider: string;
  displayName: string;
  appName: string | null;
  logoUrl: string | null;
  configured: boolean;
  isActive: boolean;
  clientId: string | null;
  authorizationUrl: string;
  tokenUrl: string;
  defaultScopes: string[];
  capabilities: string[];
  clientSecretRequired: boolean;
  hasActiveCredential: boolean;
  activeCredentialVersion: number | null;
  hasPrivateKey: boolean;
  lastVerifiedAt: string | null;
  updatedAt: string | null;
}

export interface OAuthAppValidateConfigResult {
  provider: string;
  status: string;
  verificationType: string;
  message: string;
  verifiedAt: string | null;
}

export interface ConfigureOAuthAppPayload {
  appName?: string;
  logoUrl?: string;
  clientId?: string;
  clientSecret?: string;
  privateKey?: string;
}
```

- [ ] **Step 2: Extend `api-endpoints.ts`**

Find the `systemConfig.serviceKeys` block and add an `oauthApps` sibling
inside `systemConfig` (if the `systemConfig` key from the Service Keys
branch isn't present yet on this fresh branch, add the whole
`systemConfig: { oauthApps: { ... } }` block as a new top-level key
instead, right before the closing `} as const;`):

```typescript
  systemConfig: {
    oauthApps: {
      list: '/system-config/oauth-apps',
      byId: (provider: string) => `/system-config/oauth-apps/${provider}`,
      configure: (provider: string) => `/system-config/oauth-apps/${provider}`,
      rotateSecret: (provider: string) => `/system-config/oauth-apps/${provider}/rotate-secret`,
      activate: (provider: string) => `/system-config/oauth-apps/${provider}/activate`,
      deactivate: (provider: string) => `/system-config/oauth-apps/${provider}/deactivate`,
      validateConfig: (provider: string) => `/system-config/oauth-apps/${provider}/validate-config`,
    },
  },
```

- [ ] **Step 3: Create `oauth-apps.service.ts`**

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import { ConfigureOAuthAppPayload, OAuthApp, OAuthAppValidateConfigResult } from './oauth-app.model';

@Injectable({ providedIn: 'root' })
export class OAuthAppsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  list(): Observable<OAuthApp[]> {
    return this.http.get<OAuthApp[]>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.oauthApps.list}`,
      { withCredentials: true },
    );
  }

  getById(provider: string): Observable<OAuthApp> {
    return this.http.get<OAuthApp>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.oauthApps.byId(provider)}`,
      { withCredentials: true },
    );
  }

  configure(provider: string, payload: ConfigureOAuthAppPayload): Observable<OAuthApp> {
    return this.http.put<OAuthApp>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.oauthApps.configure(provider)}`,
      payload,
      { withCredentials: true },
    );
  }

  rotateSecret(provider: string, clientSecret: string, privateKey?: string): Observable<OAuthApp> {
    return this.http.post<OAuthApp>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.oauthApps.rotateSecret(provider)}`,
      { clientSecret, privateKey: privateKey || undefined },
      { withCredentials: true },
    );
  }

  setActive(provider: string, active: boolean): Observable<OAuthApp> {
    const url = active
      ? API_ENDPOINTS.systemConfig.oauthApps.activate(provider)
      : API_ENDPOINTS.systemConfig.oauthApps.deactivate(provider);
    return this.http.post<OAuthApp>(`${this.baseUrl}${url}`, {}, { withCredentials: true });
  }

  validateConfig(provider: string): Observable<OAuthAppValidateConfigResult> {
    return this.http.post<OAuthAppValidateConfigResult>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.oauthApps.validateConfig(provider)}`,
      {},
      { withCredentials: true },
    );
  }
}
```

- [ ] **Step 4: Create `oauth-apps.service.spec.ts`**

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { OAuthAppsService } from './oauth-apps.service';
import { environment } from '../../../../environments/environment';

describe('OAuthAppsService', () => {
  let service: OAuthAppsService;
  let httpMock: HttpTestingController;

  const sampleApp = {
    provider: 'github',
    displayName: 'GitHub',
    appName: null,
    logoUrl: null,
    configured: false,
    isActive: false,
    clientId: null,
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    defaultScopes: ['read:user'],
    capabilities: ['user_oauth'],
    clientSecretRequired: true,
    hasActiveCredential: false,
    activeCredentialVersion: null,
    hasPrivateKey: false,
    lastVerifiedAt: null,
    updatedAt: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(OAuthAppsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists all oauth apps', () => {
    let result: unknown;
    service.list().subscribe((apps) => (result = apps));

    const req = httpMock.expectOne(`${environment.apiUrl}/system-config/oauth-apps`);
    expect(req.request.method).toBe('GET');
    req.flush([sampleApp]);
    expect(result).toEqual([sampleApp]);
  });

  it('gets one oauth app by provider', () => {
    let result: unknown;
    service.getById('github').subscribe((app) => (result = app));

    const req = httpMock.expectOne(`${environment.apiUrl}/system-config/oauth-apps/github`);
    expect(req.request.method).toBe('GET');
    req.flush(sampleApp);
    expect(result).toEqual(sampleApp);
  });

  it('configures (upserts) an oauth app', () => {
    service.configure('github', { appName: 'ONEVO', clientId: 'abc123' }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/system-config/oauth-apps/github`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ appName: 'ONEVO', clientId: 'abc123' });
    req.flush({});
  });

  it('rotates the secret without a private key', () => {
    service.rotateSecret('github', 'new-secret').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/system-config/oauth-apps/github/rotate-secret`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ clientSecret: 'new-secret', privateKey: undefined });
    req.flush({});
  });

  it('activates an oauth app', () => {
    service.setActive('github', true).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/system-config/oauth-apps/github/activate`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('deactivates an oauth app', () => {
    service.setActive('github', false).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/system-config/oauth-apps/github/deactivate`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('validates the local configuration', () => {
    let result: unknown;
    service.validateConfig('github').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${environment.apiUrl}/system-config/oauth-apps/github/validate-config`);
    expect(req.request.method).toBe('POST');
    const validation = {
      provider: 'github',
      status: 'valid',
      verificationType: 'local',
      message: 'Configuration looks correct.',
      verifiedAt: '2026-01-01T00:00:00Z',
    };
    req.flush(validation);
    expect(result).toEqual(validation);
  });
});
```

- [ ] **Step 5: Run the spec**

Run: `npx jest oauth-apps.service.spec`
Expected: PASS (7 tests)

- [ ] **Step 6: Commit**

```bash
git add src/app/modules/system-config/data src/app/core/config/api-endpoints.ts
git commit -m "feat: add system config oauth apps data layer"
```

---

### Task 2: OAuth apps list page (compact settings list) + route

**Files:**
- Create: `src/app/modules/system-config/feature/oauth-apps-list/oauth-apps-list.ts`
- Create: `src/app/modules/system-config/feature/oauth-apps-list/oauth-apps-list.html`
- Create: `src/app/modules/system-config/feature/oauth-apps-list/oauth-apps-list.spec.ts`
- Modify: `src/app/app.routes.ts`

**Interfaces:**
- Consumes: `OAuthAppsService.list()`/`OAuthApp` (Task 1), `PermissionStore.hasPermission()`.
- Produces: `OAuthAppsList` component with `protected readonly selectedProvider = signal<string | null>(null)`. Task 3 (drawer) is hosted by this component and reads/writes `selectedProvider`.

- [ ] **Step 1: Write `oauth-apps-list.ts`**

```typescript
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { OAuthAppsService } from '../../data/oauth-apps.service';
import { OAuthApp } from '../../data/oauth-app.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { Loader } from '../../../../shared/ui/loader/loader';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';

@Component({
  selector: 'app-oauth-apps-list',
  imports: [Loader, ErrorBanner, StatusBadge, DatePipe],
  templateUrl: './oauth-apps-list.html',
})
export class OAuthAppsList implements OnInit {
  private readonly oauthAppsService = inject(OAuthAppsService);
  protected readonly permissionStore = inject(PermissionStore);

  protected readonly canView = computed(() => this.permissionStore.hasPermission('platform.system_config.read'));

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly apps = signal<OAuthApp[]>([]);
  protected readonly selectedProvider = signal<string | null>(null);

  ngOnInit(): void {
    if (!this.canView()) {
      return;
    }
    this.loadApps();
  }

  protected loadApps(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.oauthAppsService.list().subscribe({
      next: (apps) => {
        this.apps.set(apps);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Something went wrong. Please try again.');
        this.loading.set(false);
      },
    });
  }

  protected openDrawer(provider: string): void {
    this.selectedProvider.set(provider);
  }

  protected closeDrawer(): void {
    this.selectedProvider.set(null);
  }

  protected onAppUpdated(): void {
    this.loadApps();
  }
}
```

- [ ] **Step 2: Write `oauth-apps-list.html`**

```html
@if (!canView()) {
  <div class="rounded-2xl bg-white p-8 shadow-sm">
    <p class="text-sm font-medium text-red-700">No permission to view page</p>
  </div>
} @else {
  <div class="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm">
    <div>
      <h1 class="text-xl font-semibold text-slate-900">OAuth Apps</h1>
      <p class="mt-1 text-sm text-slate-500">Platform-registered OAuth applications for admin SSO and integrations</p>
    </div>

    @if (loading()) {
      <app-loader label="Loading…" />
    } @else if (errorMessage(); as message) {
      <app-error-banner [message]="message" (retry)="loadApps()" />
    } @else {
      <div class="divide-y divide-slate-100 rounded-xl border border-slate-200">
        @for (app of apps(); track app.provider) {
          <button
            type="button"
            (click)="openDrawer(app.provider)"
            class="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-slate-50"
          >
            <div class="flex items-center gap-3">
              <span
                class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600"
              >
                {{ app.displayName.charAt(0) }}
              </span>
              <span class="text-sm font-medium text-slate-900">{{ app.displayName }}</span>
            </div>
            <div class="flex items-center gap-3">
              <app-status-badge
                [label]="app.configured ? 'Configured' : 'Not configured'"
                [tone]="app.configured ? 'success' : 'neutral'"
              />
              @if (app.configured) {
                <app-status-badge
                  [label]="app.isActive ? 'Active' : 'Inactive'"
                  [tone]="app.isActive ? 'success' : 'neutral'"
                />
              }
              <span class="hidden text-xs text-slate-400 sm:inline">
                Last verified: {{ app.lastVerifiedAt ? (app.lastVerifiedAt | date: 'medium') : '—' }}
              </span>
              <span class="text-slate-400" aria-hidden="true">&rsaquo;</span>
            </div>
          </button>
        }
      </div>
    }
  </div>
}
```

- [ ] **Step 3: Write `oauth-apps-list.spec.ts`**

```typescript
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { OAuthAppsList } from './oauth-apps-list';
import { OAuthAppsService } from '../../data/oauth-apps.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';

describe('OAuthAppsList', () => {
  let oauthAppsService: { list: jest.Mock };

  const apps = [
    {
      provider: 'github',
      displayName: 'GitHub',
      appName: null,
      logoUrl: null,
      configured: false,
      isActive: false,
      clientId: null,
      authorizationUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      defaultScopes: ['read:user'],
      capabilities: ['user_oauth'],
      clientSecretRequired: true,
      hasActiveCredential: false,
      activeCredentialVersion: null,
      hasPrivateKey: false,
      lastVerifiedAt: null,
      updatedAt: null,
    },
    {
      provider: 'google',
      displayName: 'Google',
      appName: 'ONEVO Admin',
      logoUrl: null,
      configured: true,
      isActive: true,
      clientId: 'client-abc',
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      defaultScopes: ['openid', 'profile', 'email'],
      capabilities: ['admin_sso', 'user_oauth', 'calendar'],
      clientSecretRequired: true,
      hasActiveCredential: true,
      activeCredentialVersion: 1,
      hasPrivateKey: false,
      lastVerifiedAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  function setup(permissions: string[] = ['platform.system_config.read']) {
    oauthAppsService = { list: jest.fn().mockReturnValue(of(apps)) };

    TestBed.configureTestingModule({
      imports: [OAuthAppsList],
      providers: [{ provide: OAuthAppsService, useValue: oauthAppsService }],
    }).compileComponents();

    const fixture = TestBed.createComponent(OAuthAppsList);
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
    expect(oauthAppsService.list).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('No permission to view page');
  });

  it('loads and displays all provider rows when authorized', () => {
    const fixture = setup();
    expect(oauthAppsService.list).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('GitHub');
    expect(fixture.nativeElement.textContent).toContain('Google');
  });

  it('shows Not configured for an unconfigured provider and Configured + Active for a configured one', () => {
    const fixture = setup();
    expect(fixture.nativeElement.textContent).toContain('Not configured');
    expect(fixture.nativeElement.textContent).toContain('Configured');
    expect(fixture.nativeElement.textContent).toContain('Active');
  });

  it('opens the drawer with the clicked provider', () => {
    const fixture = setup();
    const component = fixture.componentInstance;

    component['openDrawer']('github');

    expect(component['selectedProvider']()).toBe('github');
  });
});
```

- [ ] **Step 4: Add the route in `app.routes.ts`**

Find the `system-config/service-keys` route entry (or, if the Service Keys
branch hasn't merged yet on this branch, find the `audit-logs` route entry
instead) and add a new sibling route right after it:

```typescript
      {
        path: 'system-config/oauth-apps',
        loadComponent: () =>
          import('./modules/system-config/feature/oauth-apps-list/oauth-apps-list').then(
            (m) => m.OAuthAppsList,
          ),
      },
```

- [ ] **Step 5: Run the spec**

Run: `npx jest oauth-apps-list.spec`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add src/app/modules/system-config/feature/oauth-apps-list src/app/app.routes.ts
git commit -m "feat: add oauth apps list page"
```

---

### Task 3: OAuth app detail drawer — view + configure

**Files:**
- Create: `src/app/modules/system-config/feature/oauth-app-detail-drawer/oauth-app-detail-drawer.ts`
- Create: `src/app/modules/system-config/feature/oauth-app-detail-drawer/oauth-app-detail-drawer.html`
- Create: `src/app/modules/system-config/feature/oauth-app-detail-drawer/oauth-app-detail-drawer.spec.ts`
- Modify: `src/app/modules/system-config/feature/oauth-apps-list/oauth-apps-list.html`
- Modify: `src/app/modules/system-config/feature/oauth-apps-list/oauth-apps-list.ts`

**Interfaces:**
- Consumes: `OAuthAppsService.getById()`/`.configure()` (Task 1).
- Produces: `OAuthAppDetailDrawer` component, selector `app-oauth-app-detail-drawer`, input `provider: string` (required), outputs `closed: EventEmitter<void>`, `updated: EventEmitter<void>`. Task 4 extends this same component with rotate/validate/activate actions.

- [ ] **Step 1: Write `oauth-app-detail-drawer.ts`**

```typescript
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { OAuthAppsService } from '../../data/oauth-apps.service';
import { OAuthApp } from '../../data/oauth-app.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';
import { Button } from '../../../../shared/ui/button/button';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { Loader } from '../../../../shared/ui/loader/loader';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';

@Component({
  selector: 'app-oauth-app-detail-drawer',
  imports: [ReactiveFormsModule, Button, StatusBadge, Loader, ErrorBanner],
  templateUrl: './oauth-app-detail-drawer.html',
})
export class OAuthAppDetailDrawer {
  private readonly formBuilder = inject(FormBuilder);
  private readonly oauthAppsService = inject(OAuthAppsService);
  private readonly notificationService = inject(NotificationService);
  protected readonly permissionStore = inject(PermissionStore);

  readonly provider = input.required<string>();
  readonly closed = output<void>();
  readonly updated = output<void>();

  protected readonly canManage = computed(() =>
    this.permissionStore.hasPermission('platform.system_config.manage'),
  );

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly app = signal<OAuthApp | null>(null);

  protected readonly configureForm = this.formBuilder.nonNullable.group({
    appName: [''],
    logoUrl: [''],
    clientId: [''],
    clientSecret: [''],
    privateKey: [''],
  });

  constructor() {
    effect(() => {
      const provider = this.provider();
      this.loadApp(provider);
    });
  }

  private loadApp(provider: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.oauthAppsService.getById(provider).subscribe({
      next: (app) => {
        this.app.set(app);
        this.configureForm.patchValue({
          appName: app.appName ?? '',
          logoUrl: app.logoUrl ?? '',
          clientId: app.clientId ?? '',
        });
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Something went wrong. Please try again.');
        this.loading.set(false);
      },
    });
  }

  protected saveConfiguration(): void {
    this.saving.set(true);
    const raw = this.configureForm.getRawValue();

    this.oauthAppsService
      .configure(this.provider(), {
        appName: raw.appName || undefined,
        logoUrl: raw.logoUrl || undefined,
        clientId: raw.clientId || undefined,
        clientSecret: raw.clientSecret || undefined,
        privateKey: raw.privateKey || undefined,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.configureForm.patchValue({ clientSecret: '', privateKey: '' });
          this.notificationService.success('Configuration saved.');
          this.loadApp(this.provider());
          this.updated.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          this.notificationService.error(error.error?.detail ?? 'Could not save the configuration.');
        },
      });
  }

  close(): void {
    this.closed.emit();
  }
}
```

- [ ] **Step 2: Write `oauth-app-detail-drawer.html`**

```html
<div class="fixed inset-0 z-50 flex justify-end bg-slate-900/50" (click)="close()">
  <div class="flex h-full w-96 flex-col bg-white shadow-2xl" (click)="$event.stopPropagation()">
    <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
      <h2 class="text-lg font-semibold text-slate-900">{{ app()?.displayName ?? provider() }}</h2>
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
      } @else if (app(); as a) {
        <div class="flex flex-wrap gap-2">
          <app-status-badge [label]="a.configured ? 'Configured' : 'Not configured'" [tone]="a.configured ? 'success' : 'neutral'" />
          @if (a.configured) {
            <app-status-badge [label]="a.isActive ? 'Active' : 'Inactive'" [tone]="a.isActive ? 'success' : 'neutral'" />
          }
        </div>

        <div class="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <p><span class="font-medium text-slate-900">Authorization URL:</span> {{ a.authorizationUrl }}</p>
          <p class="mt-1"><span class="font-medium text-slate-900">Token URL:</span> {{ a.tokenUrl }}</p>
          <p class="mt-1"><span class="font-medium text-slate-900">Default scopes:</span> {{ a.defaultScopes.join(', ') }}</p>
          <p class="mt-1"><span class="font-medium text-slate-900">Capabilities:</span> {{ a.capabilities.join(', ') }}</p>
        </div>

        @if (canManage()) {
          <form class="mt-6 flex flex-col gap-4" [formGroup]="configureForm" (ngSubmit)="saveConfiguration()" novalidate>
            <div>
              <label for="oauth-app-appName" class="text-sm font-medium text-slate-700">App name</label>
              <input
                id="oauth-app-appName"
                type="text"
                formControlName="appName"
                class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
              />
            </div>

            <div>
              <label for="oauth-app-logoUrl" class="text-sm font-medium text-slate-700">Logo URL</label>
              <input
                id="oauth-app-logoUrl"
                type="text"
                formControlName="logoUrl"
                class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
              />
            </div>

            <div>
              <label for="oauth-app-clientId" class="text-sm font-medium text-slate-700">Client ID</label>
              <input
                id="oauth-app-clientId"
                type="text"
                formControlName="clientId"
                class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
              />
            </div>

            <div>
              <label for="oauth-app-clientSecret" class="text-sm font-medium text-slate-700">Client Secret</label>
              <input
                id="oauth-app-clientSecret"
                type="password"
                formControlName="clientSecret"
                autocomplete="new-password"
                placeholder="Leave blank to keep the current secret"
                class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
              />
            </div>

            <details class="text-sm">
              <summary class="cursor-pointer font-medium text-slate-700">Advanced: Private key</summary>
              <textarea
                id="oauth-app-privateKey"
                formControlName="privateKey"
                rows="3"
                placeholder="Only needed for providers that require a private key"
                class="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
              ></textarea>
            </details>

            <app-button type="submit" label="Save Configuration" loadingText="Saving…" [loading]="saving()" />
          </form>
        }
      }
    </div>
  </div>
</div>
```

- [ ] **Step 3: Write `oauth-app-detail-drawer.spec.ts`**

```typescript
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { OAuthAppDetailDrawer } from './oauth-app-detail-drawer';
import { OAuthAppsService } from '../../data/oauth-apps.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';

describe('OAuthAppDetailDrawer', () => {
  let oauthAppsService: { getById: jest.Mock; configure: jest.Mock };
  let notificationService: { success: jest.Mock; error: jest.Mock };

  const githubApp = {
    provider: 'github',
    displayName: 'GitHub',
    appName: null,
    logoUrl: null,
    configured: false,
    isActive: false,
    clientId: null,
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    defaultScopes: ['read:user'],
    capabilities: ['user_oauth'],
    clientSecretRequired: true,
    hasActiveCredential: false,
    activeCredentialVersion: null,
    hasPrivateKey: false,
    lastVerifiedAt: null,
    updatedAt: null,
  };

  function setup(permissions: string[] = ['platform.system_config.read', 'platform.system_config.manage']) {
    oauthAppsService = {
      getById: jest.fn().mockReturnValue(of(githubApp)),
      configure: jest.fn(),
    };
    notificationService = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [OAuthAppDetailDrawer],
      providers: [
        { provide: OAuthAppsService, useValue: oauthAppsService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(OAuthAppDetailDrawer);
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
    fixture.componentRef.setInput('provider', 'github');
    fixture.detectChanges();
    return fixture;
  }

  it('loads the provider detail on init', () => {
    const fixture = setup();
    expect(oauthAppsService.getById).toHaveBeenCalledWith('github');
    expect(fixture.nativeElement.textContent).toContain('GitHub');
  });

  it('renders backend-owned scopes and capabilities as read-only text', () => {
    const fixture = setup();
    expect(fixture.nativeElement.textContent).toContain('read:user');
    expect(fixture.nativeElement.textContent).toContain('user_oauth');
  });

  it('hides the configure form without manage permission', () => {
    const fixture = setup(['platform.system_config.read']);
    expect(fixture.nativeElement.textContent).not.toContain('Save Configuration');
  });

  it('saves the configuration with entered values', () => {
    const fixture = setup();
    oauthAppsService.configure.mockReturnValue(of(githubApp));
    const component = fixture.componentInstance;
    component['configureForm'].patchValue({ appName: 'ONEVO', clientId: 'abc123', clientSecret: 'shh' });

    component['saveConfiguration']();

    expect(oauthAppsService.configure).toHaveBeenCalledWith('github', {
      appName: 'ONEVO',
      logoUrl: undefined,
      clientId: 'abc123',
      clientSecret: 'shh',
      privateKey: undefined,
    });
  });

  it('shows the backend error message on failure', () => {
    const fixture = setup();
    oauthAppsService.configure.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { detail: 'clientId is invalid.' } })),
    );
    const component = fixture.componentInstance;

    component['saveConfiguration']();

    expect(notificationService.error).toHaveBeenCalledWith('clientId is invalid.');
  });

  it('emits closed when the close button is clicked', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    let closed = false;
    component.closed.subscribe(() => (closed = true));

    component['close']();

    expect(closed).toBe(true);
  });
});
```

- [ ] **Step 4: Run the spec**

Run: `npx jest oauth-app-detail-drawer.spec`
Expected: PASS (6 tests)

- [ ] **Step 5: Host the drawer in `oauth-apps-list.html`**

Find:

```html
      </div>
    }
  </div>
}
```

Replace with:

```html
      </div>
    }
  </div>

  @if (selectedProvider(); as provider) {
    <app-oauth-app-detail-drawer
      [provider]="provider"
      (closed)="closeDrawer()"
      (updated)="onAppUpdated()"
    />
  }
}
```

Then add `OAuthAppDetailDrawer` to `oauth-apps-list.ts`'s `imports` array:

```typescript
import { OAuthAppDetailDrawer } from '../oauth-app-detail-drawer/oauth-app-detail-drawer';
// ...
@Component({
  selector: 'app-oauth-apps-list',
  imports: [Loader, ErrorBanner, StatusBadge, DatePipe, OAuthAppDetailDrawer],
  templateUrl: './oauth-apps-list.html',
})
```

- [ ] **Step 6: Run the list spec again to confirm nothing broke**

Run: `npx jest oauth-apps-list.spec`
Expected: PASS (4 tests, unchanged)

- [ ] **Step 7: Commit**

```bash
git add src/app/modules/system-config/feature/oauth-app-detail-drawer src/app/modules/system-config/feature/oauth-apps-list
git commit -m "feat: add oauth app detail drawer with configure form"
```

---

### Task 4: Rotate secret, validate config, activate/deactivate + full verification

**Files:**
- Modify: `src/app/modules/system-config/feature/oauth-app-detail-drawer/oauth-app-detail-drawer.ts`
- Modify: `src/app/modules/system-config/feature/oauth-app-detail-drawer/oauth-app-detail-drawer.html`
- Modify: `src/app/modules/system-config/feature/oauth-app-detail-drawer/oauth-app-detail-drawer.spec.ts`

**Interfaces:**
- Consumes: `OAuthAppsService.rotateSecret()`/`.validateConfig()`/`.setActive()` (Task 1).

- [ ] **Step 1: Add the new tests to `oauth-app-detail-drawer.spec.ts`**

Add these `it` blocks inside the existing `describe('OAuthAppDetailDrawer', ...)`:

```typescript
  it('rotates the secret and reloads', () => {
    const fixture = setup();
    oauthAppsService.rotateSecret = jest.fn().mockReturnValue(of(githubApp));
    const component = fixture.componentInstance;
    component['rotateForm'].patchValue({ clientSecret: 'brand-new-secret' });

    component['rotateSecret']();

    expect(oauthAppsService.rotateSecret).toHaveBeenCalledWith('github', 'brand-new-secret', undefined);
    expect(oauthAppsService.getById).toHaveBeenCalledTimes(2);
  });

  it('shows a local-check-labeled message on validate', () => {
    const fixture = setup();
    oauthAppsService.validateConfig = jest.fn().mockReturnValue(
      of({ provider: 'github', status: 'valid', verificationType: 'local', message: 'Client ID and secret are present.', verifiedAt: '2026-01-01T00:00:00Z' }),
    );
    const component = fixture.componentInstance;

    component['validateConfiguration']();

    expect(notificationService.success).toHaveBeenCalledWith('Local check: Client ID and secret are present.');
  });

  it('toggles active state', () => {
    const fixture = setup();
    oauthAppsService.setActive = jest.fn().mockReturnValue(of({ ...githubApp, isActive: true }));
    const component = fixture.componentInstance;
    component['app'].set({ ...githubApp, configured: true, isActive: false });

    component['toggleActive']();

    expect(oauthAppsService.setActive).toHaveBeenCalledWith('github', true);
  });
```

- [ ] **Step 2: Run the spec to verify the new tests fail**

Run: `npx jest oauth-app-detail-drawer.spec`
Expected: FAIL — `rotateForm`/`rotateSecret`/`validateConfiguration`/`toggleActive` don't exist yet.

- [ ] **Step 3: Extend `oauth-app-detail-drawer.ts`**

Add these members to the `OAuthAppDetailDrawer` class (after `configureForm`):

```typescript
  protected readonly rotating = signal(false);
  protected readonly validating = signal(false);

  protected readonly rotateForm = this.formBuilder.nonNullable.group({
    clientSecret: [''],
    privateKey: [''],
  });
```

Add these methods (after `saveConfiguration()`):

```typescript
  protected rotateSecret(): void {
    this.rotating.set(true);
    const { clientSecret, privateKey } = this.rotateForm.getRawValue();

    this.oauthAppsService.rotateSecret(this.provider(), clientSecret, privateKey || undefined).subscribe({
      next: () => {
        this.rotating.set(false);
        this.rotateForm.reset({ clientSecret: '', privateKey: '' });
        this.notificationService.success('Secret rotated.');
        this.loadApp(this.provider());
        this.updated.emit();
      },
      error: (error: HttpErrorResponse) => {
        this.rotating.set(false);
        this.notificationService.error(error.error?.detail ?? 'Could not rotate the secret.');
      },
    });
  }

  protected validateConfiguration(): void {
    this.validating.set(true);
    this.oauthAppsService.validateConfig(this.provider()).subscribe({
      next: (result) => {
        this.validating.set(false);
        if (result.status === 'valid') {
          this.notificationService.success(`Local check: ${result.message}`);
        } else {
          this.notificationService.error(`Local check: ${result.message}`);
        }
        this.loadApp(this.provider());
      },
      error: () => {
        this.validating.set(false);
        this.notificationService.error('Could not validate the configuration.');
      },
    });
  }

  protected toggleActive(): void {
    const current = this.app();
    if (!current) {
      return;
    }
    this.oauthAppsService.setActive(this.provider(), !current.isActive).subscribe({
      next: () => {
        this.notificationService.success(current.isActive ? 'App deactivated.' : 'App activated.');
        this.loadApp(this.provider());
        this.updated.emit();
      },
      error: (error: HttpErrorResponse) => {
        this.notificationService.error(error.error?.detail ?? 'Could not update the app.');
      },
    });
  }
```

- [ ] **Step 4: Extend `oauth-app-detail-drawer.html`**

Find:

```html
            <app-button type="submit" label="Save Configuration" loadingText="Saving…" [loading]="saving()" />
          </form>
        }
      }
    </div>
  </div>
</div>
```

Replace with:

```html
            <app-button type="submit" label="Save Configuration" loadingText="Saving…" [loading]="saving()" />
          </form>

          <div class="mt-6 border-t border-slate-100 pt-4">
            <h3 class="text-sm font-medium text-slate-700">Rotate secret</h3>
            <form class="mt-2 flex flex-col gap-3" [formGroup]="rotateForm" (ngSubmit)="rotateSecret()" novalidate>
              <input
                type="password"
                formControlName="clientSecret"
                autocomplete="new-password"
                placeholder="New client secret"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
              />
              <app-button
                type="submit"
                label="Rotate Secret"
                variant="secondary"
                loadingText="Rotating…"
                [loading]="rotating()"
                [disabled]="!rotateForm.controls.clientSecret.value"
              />
            </form>
          </div>

          <div class="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-4">
            <app-button
              label="Validate Configuration"
              variant="secondary"
              [loading]="validating()"
              (clicked)="validateConfiguration()"
            />
            <app-button
              [label]="a.isActive ? 'Deactivate' : 'Activate'"
              variant="secondary"
              (clicked)="toggleActive()"
            />
          </div>
        }
      }
    </div>
  </div>
</div>
```

- [ ] **Step 5: Run the spec to verify it passes**

Run: `npx jest oauth-app-detail-drawer.spec`
Expected: PASS (9 tests)

- [ ] **Step 6: Run full verification**

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

- [ ] **Step 7: Commit**

```bash
git add src/app/modules/system-config/feature/oauth-app-detail-drawer
git commit -m "feat: add rotate secret, validate config, and activate toggle to oauth app drawer"
```

---

## Final Step

After Task 4, use superpowers:finishing-a-development-branch to verify the full test suite one more time and present merge/PR/keep options.
