# Subscription Plans Admin Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully functional Subscription Plans admin module (list, create, view/edit, archive) wired to the real backend, matching the Roles/Tenants module conventions already established in this codebase.

**Architecture:** Extend the existing thin `subscription-plans` data layer (used today only by the Tenant Wizard) with the remaining CRUD methods; add a new `module-catalog` data layer to power a real module picker; build a shared reactive-form component reused by both the create page and the detail page's edit mode; wire new routes and a sidebar nav item.

**Tech Stack:** Angular 21 (signals, `output()`, reactive forms), Jest + `HttpTestingController`.

## Global Constraints

- No dummy/mock data — every screen calls the real backend. `SubscriptionPlanSummary`/`list()` in the existing data layer must not change shape (Tenant Wizard depends on them unchanged).
- Permission codes: `platform.subscriptions.read` / `platform.subscriptions.manage` (view/manage), `platform.module_catalog.read` (module catalog list) — exact strings confirmed from the backend's `PlatformPermissionCatalog`.
- `ConfirmationDialog` on `development` still uses `(cancel)="..."` (the rename to `cancelled` is on an unmerged branch) — this plan builds against `(cancel)=`, matching `development`'s current state.
- Repo root: `C:\Users\User\OneDrive\Desktop\onexso\platform-administration`. Branch `feature/subscription-plans-admin-module` already created off up-to-date `origin/development`; spec doc already committed there.
- `route 'subscription-plans/new'` must be registered before `'subscription-plans/:id'` in `app.routes.ts` (Angular matches routes in order — same lesson as the Tenants module's `tenants/new` vs `tenants/:id`).

---

### Task 1: Data layer — subscription plans CRUD + module catalog

**Files:**
- Modify: `src/app/modules/subscription-plans/data/subscription-plan.model.ts`
- Modify: `src/app/modules/subscription-plans/data/subscription-plans.service.ts`
- Modify: `src/app/core/config/api-endpoints.ts`
- Create: `src/app/modules/module-catalog/data/module-catalog.model.ts`
- Create: `src/app/modules/module-catalog/data/module-catalog.service.ts`
- Test: `src/app/modules/subscription-plans/data/subscription-plans.service.spec.ts` (extend)
- Test: `src/app/modules/module-catalog/data/module-catalog.service.spec.ts` (create)

**Interfaces:**
- Produces: `SubscriptionPlanDetail`, `CreateSubscriptionPlanRequest`, `UpdateSubscriptionPlanRequest` (in `subscription-plan.model.ts`); `SubscriptionPlansService.getById(id)`, `.create(request)`, `.update(id, request)`, `.archive(id)`; `ModuleCatalogItem` (in `module-catalog.model.ts`); `ModuleCatalogService.list()`. All later tasks consume these exact names/shapes.

- [ ] **Step 1: Extend `subscription-plan.model.ts`**

Find:

```typescript
export interface SubscriptionPlanSummary {
  id: string;
  name: string;
  code: string;
  tier: string;
  companySizeRange: string;
  effectiveMonthlyPrice: number;
  effectiveAnnualPrice: number;
  currency: string;
  isActive: boolean;
}
```

Replace with:

```typescript
export interface SubscriptionPlanSummary {
  id: string;
  name: string;
  code: string;
  tier: string;
  companySizeRange: string;
  effectiveMonthlyPrice: number;
  effectiveAnnualPrice: number;
  currency: string;
  isActive: boolean;
}

export interface SubscriptionPlanDetail {
  id: string;
  name: string;
  code: string;
  tier: string;
  companySizeRange: string;
  pricingUnit: string;
  includedModules: string[];
  calculatedMonthlyPrice: number;
  calculatedAnnualPrice: number;
  overrideMonthlyPrice: number | null;
  overrideAnnualPrice: number | null;
  effectiveMonthlyPrice: number;
  effectiveAnnualPrice: number;
  currency: string;
  aiTokenLimitPerMonth: number | null;
  trialPeriodDays: number;
  unpaidGracePeriodDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateSubscriptionPlanRequest {
  name: string;
  code: string;
  tier: string;
  companySizeRange: string;
  moduleKeys: string[];
  currency: string;
  overrideMonthlyPrice: number | null;
  overrideAnnualPrice: number | null;
  aiTokenLimitPerMonth: number | null;
  trialPeriodDays: number;
  unpaidGracePeriodDays: number;
}

export interface UpdateSubscriptionPlanRequest {
  name?: string;
  tier?: string;
  companySizeRange?: string;
  moduleKeys?: string[];
  currency?: string;
  overrideMonthlyPrice?: number | null;
  overrideAnnualPrice?: number | null;
  aiTokenLimitPerMonth?: number | null;
  trialPeriodDays?: number;
  unpaidGracePeriodDays?: number;
}
```

- [ ] **Step 2: Extend `api-endpoints.ts`**

Find:

```typescript
  subscriptionPlans: {
    list: '/subscription-plans',
  },
```

Replace with:

```typescript
  subscriptionPlans: {
    list: '/subscription-plans',
    byId: (id: string) => `/subscription-plans/${id}`,
    create: '/subscription-plans',
    update: (id: string) => `/subscription-plans/${id}`,
    archive: (id: string) => `/subscription-plans/${id}`,
  },
  moduleCatalog: {
    list: '/modules/catalog',
  },
```

- [ ] **Step 3: Extend `subscription-plans.service.ts`**

Find:

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import { SubscriptionPlanSummary } from './subscription-plan.model';

@Injectable({ providedIn: 'root' })
export class SubscriptionPlansService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  list(): Observable<SubscriptionPlanSummary[]> {
    return this.http.get<SubscriptionPlanSummary[]>(
      `${this.baseUrl}${API_ENDPOINTS.subscriptionPlans.list}`,
      { withCredentials: true },
    );
  }
}
```

Replace with:

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import {
  CreateSubscriptionPlanRequest,
  SubscriptionPlanDetail,
  SubscriptionPlanSummary,
  UpdateSubscriptionPlanRequest,
} from './subscription-plan.model';

@Injectable({ providedIn: 'root' })
export class SubscriptionPlansService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  list(): Observable<SubscriptionPlanSummary[]> {
    return this.http.get<SubscriptionPlanSummary[]>(
      `${this.baseUrl}${API_ENDPOINTS.subscriptionPlans.list}`,
      { withCredentials: true },
    );
  }

  getById(id: string): Observable<SubscriptionPlanDetail> {
    return this.http.get<SubscriptionPlanDetail>(
      `${this.baseUrl}${API_ENDPOINTS.subscriptionPlans.byId(id)}`,
      { withCredentials: true },
    );
  }

  create(request: CreateSubscriptionPlanRequest): Observable<SubscriptionPlanDetail> {
    return this.http.post<SubscriptionPlanDetail>(
      `${this.baseUrl}${API_ENDPOINTS.subscriptionPlans.create}`,
      request,
      { withCredentials: true },
    );
  }

  update(id: string, request: UpdateSubscriptionPlanRequest): Observable<void> {
    return this.http.patch<void>(
      `${this.baseUrl}${API_ENDPOINTS.subscriptionPlans.update(id)}`,
      request,
      { withCredentials: true },
    );
  }

  archive(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}${API_ENDPOINTS.subscriptionPlans.archive(id)}`,
      { withCredentials: true },
    );
  }
}
```

- [ ] **Step 4: Add tests for the new service methods**

Append to `src/app/modules/subscription-plans/data/subscription-plans.service.spec.ts` (inside the existing `describe('SubscriptionPlansService', ...)` block, after the existing `'lists subscription plans'` test):

```typescript
  it('gets a subscription plan by id', () => {
    service.getById('plan-1').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/subscription-plans/plan-1`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush({});
  });

  it('creates a subscription plan', () => {
    const request = {
      name: 'Starter',
      code: 'starter_1_10',
      tier: 'Starter',
      companySizeRange: '1-10',
      moduleKeys: ['core-hr'],
      currency: 'USD',
      overrideMonthlyPrice: null,
      overrideAnnualPrice: null,
      aiTokenLimitPerMonth: null,
      trialPeriodDays: 30,
      unpaidGracePeriodDays: 7,
    };
    service.create(request).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/subscription-plans`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    expect(req.request.withCredentials).toBe(true);
    req.flush({});
  });

  it('updates a subscription plan', () => {
    const request = { name: 'Starter Plus' };
    service.update('plan-1', request).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/subscription-plans/plan-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(request);
    expect(req.request.withCredentials).toBe(true);
    req.flush(null);
  });

  it('archives a subscription plan', () => {
    service.archive('plan-1').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/subscription-plans/plan-1`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.withCredentials).toBe(true);
    req.flush(null);
  });
```

- [ ] **Step 5: Create `module-catalog.model.ts`**

```typescript
export interface ModuleCatalogItem {
  moduleKey: string;
  name: string;
  pillar: string;
  phase: string;
  pricingUnit: string;
  isActive: boolean;
}
```

- [ ] **Step 6: Create `module-catalog.service.ts`**

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import { ModuleCatalogItem } from './module-catalog.model';

@Injectable({ providedIn: 'root' })
export class ModuleCatalogService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  list(): Observable<ModuleCatalogItem[]> {
    return this.http.get<ModuleCatalogItem[]>(
      `${this.baseUrl}${API_ENDPOINTS.moduleCatalog.list}`,
      { withCredentials: true },
    );
  }
}
```

- [ ] **Step 7: Create `module-catalog.service.spec.ts`**

```typescript
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
});
```

- [ ] **Step 8: Run the new/extended specs**

Run: `npx jest subscription-plans.service.spec module-catalog.service.spec`
Expected: PASS (5 tests in `SubscriptionPlansService`, 1 test in `ModuleCatalogService`)

- [ ] **Step 9: Commit**

```bash
git add src/app/modules/subscription-plans/data src/app/modules/module-catalog src/app/core/config/api-endpoints.ts
git commit -m "feat: add subscription plan CRUD and module catalog data layer"
```

---

### Task 2: Subscription Plans list page

**Files:**
- Create: `src/app/modules/subscription-plans/feature/subscription-plans-list/subscription-plans-list.ts`
- Create: `src/app/modules/subscription-plans/feature/subscription-plans-list/subscription-plans-list.html`
- Test: `src/app/modules/subscription-plans/feature/subscription-plans-list/subscription-plans-list.spec.ts`
- Modify: `src/app/app.routes.ts`
- Modify: `src/app/layouts/main-layout/sidebar/sidebar.html`

**Interfaces:**
- Consumes: `SubscriptionPlansService.list()` (Task 1), `SubscriptionPlanSummary` (Task 1), `PermissionStore.hasPermission()`.

- [ ] **Step 1: Write `subscription-plans-list.ts`**

```typescript
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SubscriptionPlansService } from '../../data/subscription-plans.service';
import { SubscriptionPlanSummary } from '../../data/subscription-plan.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { Loader } from '../../../../shared/ui/loader/loader';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Button } from '../../../../shared/ui/button/button';

@Component({
  selector: 'app-subscription-plans-list',
  imports: [RouterLink, StatusBadge, Loader, ErrorBanner, EmptyState, Button],
  templateUrl: './subscription-plans-list.html',
})
export class SubscriptionPlansList implements OnInit {
  private readonly plansService = inject(SubscriptionPlansService);
  protected readonly permissionStore = inject(PermissionStore);

  protected readonly canView = computed(() => this.permissionStore.hasPermission('platform.subscriptions.read'));
  protected readonly canManage = computed(() =>
    this.permissionStore.hasPermission('platform.subscriptions.manage'),
  );

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly plans = signal<SubscriptionPlanSummary[]>([]);

  ngOnInit(): void {
    if (!this.canView()) {
      return;
    }
    this.loadPlans();
  }

  protected loadPlans(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.plansService.list().subscribe({
      next: (plans) => {
        this.plans.set(plans);
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

- [ ] **Step 2: Write `subscription-plans-list.html`**

```html
@if (!canView()) {
  <div class="rounded-2xl bg-white p-8 shadow-sm">
    <p class="text-sm font-medium text-red-700">No permission to view page</p>
  </div>
} @else {
  <div class="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold text-slate-900">Subscription Plans</h1>
        <p class="mt-1 text-sm text-slate-500">Manage pricing tiers, module bundles, and billing terms</p>
      </div>
      @if (canManage()) {
        <a routerLink="/subscription-plans/new">
          <app-button label="Create Plan" variant="indigo" />
        </a>
      }
    </div>

    @if (loading()) {
      <app-loader label="Loading…" />
    } @else if (errorMessage(); as message) {
      <app-error-banner [message]="message" (retry)="loadPlans()" />
    } @else if (plans().length === 0) {
      <app-empty-state title="No subscription plans yet" />
    } @else {
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="border-b border-slate-200 text-xs font-medium uppercase text-slate-500">
            <th class="py-2 pr-4">Name</th>
            <th class="py-2 pr-4">Code</th>
            <th class="py-2 pr-4">Tier</th>
            <th class="py-2 pr-4">Company Size</th>
            <th class="py-2 pr-4">Price</th>
            <th class="py-2 pr-4">Status</th>
          </tr>
        </thead>
        <tbody>
          @for (plan of plans(); track plan.id) {
            <tr
              [routerLink]="['/subscription-plans', plan.id]"
              class="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
            >
              <td class="py-3 pr-4 font-medium text-slate-900">{{ plan.name }}</td>
              <td class="py-3 pr-4 text-slate-600">{{ plan.code }}</td>
              <td class="py-3 pr-4 text-slate-600">{{ plan.tier }}</td>
              <td class="py-3 pr-4 text-slate-600">{{ plan.companySizeRange }}</td>
              <td class="py-3 pr-4 text-slate-600">{{ plan.currency }} {{ plan.effectiveMonthlyPrice }}/mo</td>
              <td class="py-3 pr-4">
                <app-status-badge
                  [label]="plan.isActive ? 'Active' : 'Archived'"
                  [tone]="plan.isActive ? 'success' : 'neutral'"
                />
              </td>
            </tr>
          }
        </tbody>
      </table>
    }
  </div>
}
```

- [ ] **Step 3: Write `subscription-plans-list.spec.ts`**

```typescript
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { SubscriptionPlansList } from './subscription-plans-list';
import { SubscriptionPlansService } from '../../data/subscription-plans.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';

describe('SubscriptionPlansList', () => {
  let plansService: { list: jest.Mock };

  function setup(permissions: string[] = ['platform.subscriptions.read']) {
    plansService = { list: jest.fn() };

    TestBed.configureTestingModule({
      imports: [SubscriptionPlansList],
      providers: [provideRouter([]), { provide: SubscriptionPlansService, useValue: plansService }],
    }).compileComponents();

    const fixture = TestBed.createComponent(SubscriptionPlansList);
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

    expect(plansService.list).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('No permission to view page');
  });

  it('loads plans on init when authorized', () => {
    const fixture = setup();
    plansService.list.mockReturnValue(
      of([
        {
          id: 'plan-1',
          name: 'Starter',
          code: 'starter_1_10',
          tier: 'Starter',
          companySizeRange: '1-10',
          effectiveMonthlyPrice: 10,
          effectiveAnnualPrice: 100,
          currency: 'USD',
          isActive: true,
        },
      ]),
    );
    fixture.detectChanges();

    expect(plansService.list).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Starter');
  });

  it('does not show the Create Plan button without manage permission', () => {
    const fixture = setup(['platform.subscriptions.read']);
    plansService.list.mockReturnValue(of([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Create Plan');
  });

  it('shows the Create Plan button with manage permission', () => {
    const fixture = setup(['platform.subscriptions.read', 'platform.subscriptions.manage']);
    plansService.list.mockReturnValue(of([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Create Plan');
  });
});
```

- [ ] **Step 4: Add routes in `app.routes.ts`**

Find:

```typescript
      {
        path: 'roles/:id',
        loadComponent: () =>
          import('./modules/roles/feature/role-detail/role-detail').then((m) => m.RoleDetail),
      },
```

Replace with:

```typescript
      {
        path: 'roles/:id',
        loadComponent: () =>
          import('./modules/roles/feature/role-detail/role-detail').then((m) => m.RoleDetail),
      },
      {
        path: 'subscription-plans',
        loadComponent: () =>
          import('./modules/subscription-plans/feature/subscription-plans-list/subscription-plans-list').then(
            (m) => m.SubscriptionPlansList,
          ),
      },
      {
        path: 'subscription-plans/new',
        loadComponent: () =>
          import('./modules/subscription-plans/feature/subscription-plan-create/subscription-plan-create').then(
            (m) => m.SubscriptionPlanCreate,
          ),
      },
      {
        path: 'subscription-plans/:id',
        loadComponent: () =>
          import('./modules/subscription-plans/feature/subscription-plan-detail/subscription-plan-detail').then(
            (m) => m.SubscriptionPlanDetail,
          ),
      },
```

(`subscription-plan-create`/`subscription-plan-detail` don't exist yet — they're built in Tasks 4–5. This route wiring is added now so Task 2's list page can link to them; the app will not compile again until those components exist, which is fine since we commit and continue immediately in this same session.)

- [ ] **Step 5: Add the sidebar nav item**

Find (in `sidebar.html`):

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
    Roles
  </a>
  <span
    data-sidebar-item
    class="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400"
  >
    <svg class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <rect x="5" y="3" width="14" height="18" rx="1.5"></rect>
      <line x1="8" y1="8" x2="16" y2="8"></line>
      <line x1="8" y1="12" x2="16" y2="12"></line>
      <line x1="8" y1="16" x2="12" y2="16"></line>
    </svg>
    Audit Logs
  </span>
```

Replace with:

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
    Roles
  </a>
  <a
    routerLink="/subscription-plans"
    routerLinkActive="bg-indigo-50 text-indigo-700 font-semibold"
    data-sidebar-item
    class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
  >
    <svg class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
      ></path>
    </svg>
    Subscription Plans
  </a>
  <span
    data-sidebar-item
    class="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400"
  >
    <svg class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <rect x="5" y="3" width="14" height="18" rx="1.5"></rect>
      <line x1="8" y1="8" x2="16" y2="8"></line>
      <line x1="8" y1="12" x2="16" y2="12"></line>
      <line x1="8" y1="16" x2="12" y2="16"></line>
    </svg>
    Audit Logs
  </span>
```

- [ ] **Step 6: Run the new spec**

Run: `npx jest subscription-plans-list.spec`
Expected: PASS (4 tests). Note: `npm run build`/full `npm test` will NOT be green yet — routes reference `subscription-plan-create`/`subscription-plan-detail`, built in Tasks 4–5. Don't run the full suite/build until Task 5 is done.

- [ ] **Step 7: Commit**

```bash
git add src/app/modules/subscription-plans/feature/subscription-plans-list src/app/app.routes.ts src/app/layouts/main-layout/sidebar/sidebar.html
git commit -m "feat: add subscription plans list page"
```

---

### Task 3: Shared subscription plan form

**Files:**
- Create: `src/app/modules/subscription-plans/feature/subscription-plan-form/subscription-plan-form.ts`
- Create: `src/app/modules/subscription-plans/feature/subscription-plan-form/subscription-plan-form.html`
- Test: `src/app/modules/subscription-plans/feature/subscription-plan-form/subscription-plan-form.spec.ts`

**Interfaces:**
- Consumes: `ModuleCatalogService.list()`/`ModuleCatalogItem` (Task 1), `SubscriptionPlanDetail`/`CreateSubscriptionPlanRequest` (Task 1), `COMPANY_SIZE_OPTIONS`/`CURRENCY_CODE_OPTIONS` (existing, `src/app/modules/tenants/utils/tenant-options.ts`).
- Produces: `SubscriptionPlanForm` component — `mode: input<'create' | 'edit'>` (required), `initialValue: input<SubscriptionPlanDetail | null>`, `saving: input<boolean>`, `submitted: output<CreateSubscriptionPlanRequest>()`. Tasks 4 and 5 both host this component.

- [ ] **Step 1: Write `subscription-plan-form.ts`**

```typescript
import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModuleCatalogService } from '../../../module-catalog/data/module-catalog.service';
import { ModuleCatalogItem } from '../../../module-catalog/data/module-catalog.model';
import { CreateSubscriptionPlanRequest, SubscriptionPlanDetail } from '../../data/subscription-plan.model';
import { COMPANY_SIZE_OPTIONS, CURRENCY_CODE_OPTIONS } from '../../../tenants/utils/tenant-options';
import { Button } from '../../../../shared/ui/button/button';
import { Loader } from '../../../../shared/ui/loader/loader';

const CODE_PATTERN = /^[a-z0-9_]+$/;
const COMPANY_SIZE_PATTERN = /^\d+(-\d+|\+)$/;

@Component({
  selector: 'app-subscription-plan-form',
  imports: [ReactiveFormsModule, Button, Loader],
  templateUrl: './subscription-plan-form.html',
})
export class SubscriptionPlanForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly moduleCatalogService = inject(ModuleCatalogService);

  readonly mode = input.required<'create' | 'edit'>();
  readonly initialValue = input<SubscriptionPlanDetail | null>(null);
  readonly saving = input(false);
  readonly submitted = output<CreateSubscriptionPlanRequest>();

  protected readonly companySizeOptions = COMPANY_SIZE_OPTIONS;
  protected readonly currencyOptions = CURRENCY_CODE_OPTIONS;

  protected readonly loadingModules = signal(false);
  protected readonly modulesError = signal<string | null>(null);
  protected readonly modules = signal<ModuleCatalogItem[]>([]);
  protected readonly selectedModuleKeys = signal<Set<string>>(new Set());

  protected readonly isCreate = computed(() => this.mode() === 'create');

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    code: ['', [Validators.required, Validators.maxLength(20), Validators.pattern(CODE_PATTERN)]],
    tier: ['', [Validators.required, Validators.maxLength(50)]],
    companySizeRange: ['', [Validators.required, Validators.pattern(COMPANY_SIZE_PATTERN)]],
    currency: ['USD', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
    overrideMonthlyPrice: this.formBuilder.control<number | null>(null),
    overrideAnnualPrice: this.formBuilder.control<number | null>(null),
    aiTokenLimitPerMonth: this.formBuilder.control<number | null>(null),
    trialPeriodDays: [30, [Validators.required, Validators.min(0)]],
    unpaidGracePeriodDays: [7, [Validators.required, Validators.min(0)]],
  });

  protected readonly canSubmit = computed(
    () => this.form.valid && this.selectedModuleKeys().size > 0 && !this.saving(),
  );

  ngOnInit(): void {
    this.loadModules();

    const value = this.initialValue();
    if (value) {
      this.form.patchValue({
        name: value.name,
        code: value.code,
        tier: value.tier,
        companySizeRange: value.companySizeRange,
        currency: value.currency,
        overrideMonthlyPrice: value.overrideMonthlyPrice,
        overrideAnnualPrice: value.overrideAnnualPrice,
        aiTokenLimitPerMonth: value.aiTokenLimitPerMonth,
        trialPeriodDays: value.trialPeriodDays,
        unpaidGracePeriodDays: value.unpaidGracePeriodDays,
      });
      this.selectedModuleKeys.set(new Set(value.includedModules));
    }

    if (this.mode() === 'edit') {
      this.form.controls.code.disable();
    }
  }

  private loadModules(): void {
    this.loadingModules.set(true);
    this.modulesError.set(null);

    this.moduleCatalogService.list().subscribe({
      next: (modules) => {
        this.modules.set(modules.filter((m) => m.isActive));
        this.loadingModules.set(false);
      },
      error: () => {
        this.modulesError.set('Could not load the module catalog.');
        this.loadingModules.set(false);
      },
    });
  }

  protected toggleModule(moduleKey: string): void {
    const next = new Set(this.selectedModuleKeys());
    if (next.has(moduleKey)) {
      next.delete(moduleKey);
    } else {
      next.add(moduleKey);
    }
    this.selectedModuleKeys.set(next);
  }

  protected submit(): void {
    if (!this.canSubmit()) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.submitted.emit({
      name: raw.name,
      code: raw.code,
      tier: raw.tier,
      companySizeRange: raw.companySizeRange,
      moduleKeys: Array.from(this.selectedModuleKeys()),
      currency: raw.currency,
      overrideMonthlyPrice: raw.overrideMonthlyPrice,
      overrideAnnualPrice: raw.overrideAnnualPrice,
      aiTokenLimitPerMonth: raw.aiTokenLimitPerMonth,
      trialPeriodDays: raw.trialPeriodDays,
      unpaidGracePeriodDays: raw.unpaidGracePeriodDays,
    });
  }
}
```

- [ ] **Step 2: Write `subscription-plan-form.html`**

```html
<form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
  <div>
    <label for="name" class="text-sm font-medium text-slate-700">Plan Name</label>
    <input
      id="name"
      type="text"
      formControlName="name"
      class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
    />
  </div>
  <div>
    <label for="code" class="text-sm font-medium text-slate-700">Code</label>
    <input
      id="code"
      type="text"
      formControlName="code"
      placeholder="e.g. starter_1_10"
      class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-400"
    />
    @if (!isCreate()) {
      <p class="mt-1 text-xs text-slate-500">Code cannot be changed after creation.</p>
    }
  </div>
  <div class="grid grid-cols-2 gap-4">
    <div>
      <label for="tier" class="text-sm font-medium text-slate-700">Tier</label>
      <input
        id="tier"
        type="text"
        formControlName="tier"
        placeholder="e.g. Starter, Professional, Enterprise"
        class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
    </div>
    <div>
      <label for="companySizeRange" class="text-sm font-medium text-slate-700">Company Size</label>
      <select
        id="companySizeRange"
        formControlName="companySizeRange"
        class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      >
        <option value="">Select…</option>
        @for (option of companySizeOptions; track option.value) {
          <option [value]="option.value">{{ option.label }}</option>
        }
      </select>
    </div>
  </div>

  <div>
    <p class="text-sm font-medium text-slate-700">Modules</p>
    @if (loadingModules()) {
      <app-loader label="Loading modules…" />
    } @else if (modulesError(); as message) {
      <p class="mt-1 text-xs text-red-700">{{ message }}</p>
    } @else {
      <div class="mt-1 grid grid-cols-2 gap-2 rounded-lg border border-slate-200 p-3">
        @for (module of modules(); track module.moduleKey) {
          <label class="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              [checked]="selectedModuleKeys().has(module.moduleKey)"
              (change)="toggleModule(module.moduleKey)"
              class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600/30"
            />
            {{ module.name }}
          </label>
        }
      </div>
      @if (selectedModuleKeys().size === 0) {
        <p class="mt-1 text-xs text-red-700">Select at least one module.</p>
      }
    }
  </div>

  <div class="grid grid-cols-2 gap-4">
    <div>
      <label for="currency" class="text-sm font-medium text-slate-700">Currency</label>
      <select
        id="currency"
        formControlName="currency"
        class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      >
        @for (option of currencyOptions; track option.value) {
          <option [value]="option.value">{{ option.label }}</option>
        }
      </select>
    </div>
    <div>
      <label for="aiTokenLimitPerMonth" class="text-sm font-medium text-slate-700">
        AI Token Limit / Month (optional)
      </label>
      <input
        id="aiTokenLimitPerMonth"
        type="number"
        formControlName="aiTokenLimitPerMonth"
        class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
    </div>
  </div>

  <div class="grid grid-cols-2 gap-4">
    <div>
      <label for="overrideMonthlyPrice" class="text-sm font-medium text-slate-700">
        Override Monthly Price (optional)
      </label>
      <input
        id="overrideMonthlyPrice"
        type="number"
        step="0.01"
        formControlName="overrideMonthlyPrice"
        class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
    </div>
    <div>
      <label for="overrideAnnualPrice" class="text-sm font-medium text-slate-700">
        Override Annual Price (optional)
      </label>
      <input
        id="overrideAnnualPrice"
        type="number"
        step="0.01"
        formControlName="overrideAnnualPrice"
        class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
    </div>
  </div>

  <div class="grid grid-cols-2 gap-4">
    <div>
      <label for="trialPeriodDays" class="text-sm font-medium text-slate-700">Trial Period (days)</label>
      <input
        id="trialPeriodDays"
        type="number"
        formControlName="trialPeriodDays"
        class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
    </div>
    <div>
      <label for="unpaidGracePeriodDays" class="text-sm font-medium text-slate-700">
        Unpaid Grace Period (days)
      </label>
      <input
        id="unpaidGracePeriodDays"
        type="number"
        formControlName="unpaidGracePeriodDays"
        class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
    </div>
  </div>

  <div class="flex justify-end border-t border-slate-100 pt-4">
    <app-button
      type="submit"
      [label]="isCreate() ? 'Create Plan' : 'Save Changes'"
      variant="indigo"
      [loading]="saving()"
      [disabled]="!canSubmit()"
    />
  </div>
</form>
```

- [ ] **Step 3: Write `subscription-plan-form.spec.ts`**

```typescript
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SubscriptionPlanForm } from './subscription-plan-form';
import { ModuleCatalogService } from '../../../module-catalog/data/module-catalog.service';

describe('SubscriptionPlanForm', () => {
  let moduleCatalogService: { list: jest.Mock };

  const modules = [
    { moduleKey: 'core-hr', name: 'Core HR', pillar: 'Organization Administration', phase: '1', pricingUnit: 'per_employee', isActive: true },
    { moduleKey: 'leave', name: 'Leave Management', pillar: 'Workforce Monitoring', phase: '1', pricingUnit: 'per_employee', isActive: true },
  ];

  function setup(mode: 'create' | 'edit' = 'create', initialValue: unknown = null) {
    moduleCatalogService = { list: jest.fn().mockReturnValue(of(modules)) };

    TestBed.configureTestingModule({
      imports: [SubscriptionPlanForm],
      providers: [{ provide: ModuleCatalogService, useValue: moduleCatalogService }],
    }).compileComponents();

    const fixture = TestBed.createComponent(SubscriptionPlanForm);
    fixture.componentRef.setInput('mode', mode);
    fixture.componentRef.setInput('initialValue', initialValue);
    fixture.detectChanges();
    return fixture;
  }

  it('loads the module catalog on init', () => {
    const fixture = setup();
    expect(moduleCatalogService.list).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Core HR');
  });

  it('does not allow submit until required fields and a module are set', () => {
    const fixture = setup();
    const component = fixture.componentInstance;

    expect(component['canSubmit']()).toBe(false);
  });

  it('disables the code field in edit mode', () => {
    const fixture = setup('edit', {
      id: 'plan-1',
      name: 'Starter',
      code: 'starter_1_10',
      tier: 'Starter',
      companySizeRange: '1-10',
      pricingUnit: 'per_employee',
      includedModules: ['core-hr'],
      calculatedMonthlyPrice: 10,
      calculatedAnnualPrice: 100,
      overrideMonthlyPrice: null,
      overrideAnnualPrice: null,
      effectiveMonthlyPrice: 10,
      effectiveAnnualPrice: 100,
      currency: 'USD',
      aiTokenLimitPerMonth: null,
      trialPeriodDays: 30,
      unpaidGracePeriodDays: 7,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: null,
    });
    const component = fixture.componentInstance;

    expect(component['form'].controls.code.disabled).toBe(true);
    expect(component['selectedModuleKeys']().has('core-hr')).toBe(true);
  });

  it('emits the form value with selected module keys on submit', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    let emitted: unknown;
    component.submitted.subscribe((value) => (emitted = value));

    component['form'].setValue({
      name: 'Starter',
      code: 'starter_1_10',
      tier: 'Starter',
      companySizeRange: '1-10',
      currency: 'USD',
      overrideMonthlyPrice: null,
      overrideAnnualPrice: null,
      aiTokenLimitPerMonth: null,
      trialPeriodDays: 30,
      unpaidGracePeriodDays: 7,
    });
    component['toggleModule']('core-hr');
    component['submit']();

    expect(emitted).toEqual({
      name: 'Starter',
      code: 'starter_1_10',
      tier: 'Starter',
      companySizeRange: '1-10',
      moduleKeys: ['core-hr'],
      currency: 'USD',
      overrideMonthlyPrice: null,
      overrideAnnualPrice: null,
      aiTokenLimitPerMonth: null,
      trialPeriodDays: 30,
      unpaidGracePeriodDays: 7,
    });
  });
});
```

- [ ] **Step 4: Run the spec**

Run: `npx jest subscription-plan-form.spec`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/modules/subscription-plans/feature/subscription-plan-form
git commit -m "feat: add shared subscription plan form component"
```

---

### Task 4: Create page

**Files:**
- Create: `src/app/modules/subscription-plans/feature/subscription-plan-create/subscription-plan-create.ts`
- Create: `src/app/modules/subscription-plans/feature/subscription-plan-create/subscription-plan-create.html`
- Test: `src/app/modules/subscription-plans/feature/subscription-plan-create/subscription-plan-create.spec.ts`

**Interfaces:**
- Consumes: `SubscriptionPlanForm` (Task 3), `SubscriptionPlansService.create()` (Task 1).

- [ ] **Step 1: Write `subscription-plan-create.ts`**

```typescript
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { SubscriptionPlansService } from '../../data/subscription-plans.service';
import { CreateSubscriptionPlanRequest } from '../../data/subscription-plan.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { SubscriptionPlanForm } from '../subscription-plan-form/subscription-plan-form';

@Component({
  selector: 'app-subscription-plan-create',
  imports: [SubscriptionPlanForm],
  templateUrl: './subscription-plan-create.html',
})
export class SubscriptionPlanCreate {
  private readonly plansService = inject(SubscriptionPlansService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly saving = signal(false);

  protected submit(value: CreateSubscriptionPlanRequest): void {
    this.saving.set(true);

    this.plansService.create(value).subscribe({
      next: (plan) => {
        this.saving.set(false);
        this.notificationService.success('Subscription plan created.');
        this.router.navigate(['/subscription-plans', plan.id]);
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.notificationService.error(error.error?.detail ?? 'Could not create the subscription plan.');
      },
    });
  }
}
```

- [ ] **Step 2: Write `subscription-plan-create.html`**

```html
<div class="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm">
  <div>
    <h1 class="text-xl font-semibold text-slate-900">Create Subscription Plan</h1>
    <p class="mt-1 text-sm text-slate-500">Define pricing, modules, and billing terms for a new plan</p>
  </div>
  <app-subscription-plan-form mode="create" [saving]="saving()" (submitted)="submit($event)" />
</div>
```

- [ ] **Step 3: Write `subscription-plan-create.spec.ts`**

```typescript
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { SubscriptionPlanCreate } from './subscription-plan-create';
import { SubscriptionPlansService } from '../../data/subscription-plans.service';
import { NotificationService } from '../../../../core/services/notification.service';

describe('SubscriptionPlanCreate', () => {
  let plansService: { create: jest.Mock };
  let notificationService: { success: jest.Mock; error: jest.Mock };
  let router: { navigate: jest.Mock };

  const request = {
    name: 'Starter',
    code: 'starter_1_10',
    tier: 'Starter',
    companySizeRange: '1-10',
    moduleKeys: ['core-hr'],
    currency: 'USD',
    overrideMonthlyPrice: null,
    overrideAnnualPrice: null,
    aiTokenLimitPerMonth: null,
    trialPeriodDays: 30,
    unpaidGracePeriodDays: 7,
  };

  function setup() {
    plansService = { create: jest.fn() };
    notificationService = { success: jest.fn(), error: jest.fn() };
    router = { navigate: jest.fn() };

    TestBed.configureTestingModule({
      imports: [SubscriptionPlanCreate],
      providers: [
        { provide: SubscriptionPlansService, useValue: plansService },
        { provide: NotificationService, useValue: notificationService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    return TestBed.createComponent(SubscriptionPlanCreate);
  }

  it('creates the plan and navigates to its detail page on success', () => {
    const fixture = setup();
    plansService.create.mockReturnValue(of({ id: 'plan-1' }));
    const component = fixture.componentInstance;

    component['submit'](request);

    expect(plansService.create).toHaveBeenCalledWith(request);
    expect(notificationService.success).toHaveBeenCalledWith('Subscription plan created.');
    expect(router.navigate).toHaveBeenCalledWith(['/subscription-plans', 'plan-1']);
  });

  it('shows the backend error detail message on failure', () => {
    const fixture = setup();
    plansService.create.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { detail: "A subscription plan with code 'starter_1_10' already exists." },
          }),
      ),
    );
    const component = fixture.componentInstance;

    component['submit'](request);

    expect(notificationService.error).toHaveBeenCalledWith(
      "A subscription plan with code 'starter_1_10' already exists.",
    );
  });
});
```

- [ ] **Step 4: Run the spec**

Run: `npx jest subscription-plan-create.spec`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/modules/subscription-plans/feature/subscription-plan-create
git commit -m "feat: add subscription plan create page"
```

---

### Task 5: Detail page (view, edit, archive) + full verification

**Files:**
- Create: `src/app/modules/subscription-plans/feature/subscription-plan-detail/subscription-plan-detail.ts`
- Create: `src/app/modules/subscription-plans/feature/subscription-plan-detail/subscription-plan-detail.html`
- Test: `src/app/modules/subscription-plans/feature/subscription-plan-detail/subscription-plan-detail.spec.ts`

**Interfaces:**
- Consumes: `SubscriptionPlanForm` (Task 3), `SubscriptionPlansService.getById()/update()/archive()` (Task 1), `ConfirmationDialog` (existing, `(cancel)=`/`(confirm)=` API — `development`'s current state).

- [ ] **Step 1: Write `subscription-plan-detail.ts`**

```typescript
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { SubscriptionPlansService } from '../../data/subscription-plans.service';
import {
  CreateSubscriptionPlanRequest,
  SubscriptionPlanDetail as SubscriptionPlanDetailModel,
  UpdateSubscriptionPlanRequest,
} from '../../data/subscription-plan.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';
import { Button } from '../../../../shared/ui/button/button';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { Loader } from '../../../../shared/ui/loader/loader';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { ConfirmationDialog } from '../../../../shared/ui/confirmation-dialog/confirmation-dialog';
import { SubscriptionPlanForm } from '../subscription-plan-form/subscription-plan-form';

@Component({
  selector: 'app-subscription-plan-detail',
  imports: [Button, StatusBadge, Loader, ErrorBanner, ConfirmationDialog, SubscriptionPlanForm],
  templateUrl: './subscription-plan-detail.html',
})
export class SubscriptionPlanDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly plansService = inject(SubscriptionPlansService);
  private readonly notificationService = inject(NotificationService);
  protected readonly permissionStore = inject(PermissionStore);

  private readonly planId = this.route.snapshot.paramMap.get('id')!;

  protected readonly canManage = computed(() =>
    this.permissionStore.hasPermission('platform.subscriptions.manage'),
  );

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly plan = signal<SubscriptionPlanDetailModel | null>(null);
  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected readonly pendingArchive = signal(false);
  protected readonly archiving = signal(false);

  ngOnInit(): void {
    this.loadPlan();
  }

  protected loadPlan(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.plansService.getById(this.planId).subscribe({
      next: (plan) => {
        this.plan.set(plan);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Something went wrong. Please try again.');
        this.loading.set(false);
      },
    });
  }

  protected startEdit(): void {
    this.editing.set(true);
  }

  protected cancelEdit(): void {
    this.editing.set(false);
  }

  protected saveEdit(value: CreateSubscriptionPlanRequest): void {
    this.saving.set(true);

    const request: UpdateSubscriptionPlanRequest = {
      name: value.name,
      tier: value.tier,
      companySizeRange: value.companySizeRange,
      moduleKeys: value.moduleKeys,
      currency: value.currency,
      overrideMonthlyPrice: value.overrideMonthlyPrice,
      overrideAnnualPrice: value.overrideAnnualPrice,
      aiTokenLimitPerMonth: value.aiTokenLimitPerMonth,
      trialPeriodDays: value.trialPeriodDays,
      unpaidGracePeriodDays: value.unpaidGracePeriodDays,
    };

    this.plansService.update(this.planId, request).subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(false);
        this.notificationService.success('Subscription plan updated.');
        this.loadPlan();
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.notificationService.error(error.error?.detail ?? 'Could not update the subscription plan.');
      },
    });
  }

  protected startArchive(): void {
    this.pendingArchive.set(true);
  }

  protected cancelArchive(): void {
    this.pendingArchive.set(false);
  }

  protected confirmArchive(): void {
    this.pendingArchive.set(false);
    this.archiving.set(true);

    this.plansService.archive(this.planId).subscribe({
      next: () => {
        this.archiving.set(false);
        this.notificationService.success('Subscription plan archived.');
        this.loadPlan();
      },
      error: () => {
        this.archiving.set(false);
        this.notificationService.error('Could not archive the subscription plan.');
      },
    });
  }
}
```

- [ ] **Step 2: Write `subscription-plan-detail.html`**

```html
@if (loading()) {
  <app-loader label="Loading…" />
} @else if (errorMessage(); as message) {
  <app-error-banner [message]="message" (retry)="loadPlan()" />
} @else if (plan(); as p) {
  @if (editing()) {
    <div class="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm">
      <h1 class="text-xl font-semibold text-slate-900">Edit {{ p.name }}</h1>
      <app-subscription-plan-form
        mode="edit"
        [initialValue]="p"
        [saving]="saving()"
        (submitted)="saveEdit($event)"
      />
      <div class="flex justify-end border-t border-slate-100 pt-4">
        <app-button label="Cancel" variant="secondary" (clicked)="cancelEdit()" />
      </div>
    </div>
  } @else {
    <div class="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-semibold text-slate-900">{{ p.name }}</h1>
          <p class="mt-1 text-sm text-slate-500">{{ p.code }}</p>
        </div>
        <app-status-badge [label]="p.isActive ? 'Active' : 'Archived'" [tone]="p.isActive ? 'success' : 'neutral'" />
      </div>

      <div class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p class="text-xs font-medium uppercase text-slate-500">Tier</p>
          <p class="text-slate-900">{{ p.tier }}</p>
        </div>
        <div>
          <p class="text-xs font-medium uppercase text-slate-500">Company Size</p>
          <p class="text-slate-900">{{ p.companySizeRange }}</p>
        </div>
        <div>
          <p class="text-xs font-medium uppercase text-slate-500">Monthly Price</p>
          <p class="text-slate-900">{{ p.currency }} {{ p.effectiveMonthlyPrice }}</p>
        </div>
        <div>
          <p class="text-xs font-medium uppercase text-slate-500">Annual Price</p>
          <p class="text-slate-900">{{ p.currency }} {{ p.effectiveAnnualPrice }}</p>
        </div>
        <div>
          <p class="text-xs font-medium uppercase text-slate-500">AI Token Limit / Month</p>
          <p class="text-slate-900">{{ p.aiTokenLimitPerMonth ?? 'Unlimited' }}</p>
        </div>
        <div>
          <p class="text-xs font-medium uppercase text-slate-500">Trial / Grace Period</p>
          <p class="text-slate-900">{{ p.trialPeriodDays }} days / {{ p.unpaidGracePeriodDays }} days</p>
        </div>
      </div>

      <div>
        <p class="text-xs font-medium uppercase text-slate-500">Included Modules</p>
        <p class="mt-1 text-sm text-slate-900">{{ p.includedModules.join(', ') }}</p>
      </div>

      @if (canManage()) {
        <div class="flex gap-3 border-t border-slate-100 pt-4">
          <app-button label="Edit" variant="secondary" (clicked)="startEdit()" />
          @if (p.isActive) {
            <app-button label="Archive" variant="danger" (clicked)="startArchive()" />
          }
        </div>
      }
    </div>
  }

  @if (pendingArchive()) {
    <app-confirmation-dialog
      [open]="true"
      title="Archive plan?"
      message="This will soft-delete the plan. It will no longer be selectable for new tenants."
      confirmLabel="Archive"
      confirmVariant="danger"
      (confirm)="confirmArchive()"
      (cancel)="cancelArchive()"
    />
  }
}
```

- [ ] **Step 3: Write `subscription-plan-detail.spec.ts`**

```typescript
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { SubscriptionPlanDetail } from './subscription-plan-detail';
import { SubscriptionPlansService } from '../../data/subscription-plans.service';
import { ModuleCatalogService } from '../../../module-catalog/data/module-catalog.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';

describe('SubscriptionPlanDetail', () => {
  let plansService: { getById: jest.Mock; update: jest.Mock; archive: jest.Mock };
  let moduleCatalogService: { list: jest.Mock };
  let notificationService: { success: jest.Mock; error: jest.Mock };

  const planDetail = {
    id: 'plan-1',
    name: 'Starter',
    code: 'starter_1_10',
    tier: 'Starter',
    companySizeRange: '1-10',
    pricingUnit: 'per_employee',
    includedModules: ['core-hr'],
    calculatedMonthlyPrice: 10,
    calculatedAnnualPrice: 100,
    overrideMonthlyPrice: null,
    overrideAnnualPrice: null,
    effectiveMonthlyPrice: 10,
    effectiveAnnualPrice: 100,
    currency: 'USD',
    aiTokenLimitPerMonth: null,
    trialPeriodDays: 30,
    unpaidGracePeriodDays: 7,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: null,
  };

  function setup(permissions: string[] = ['platform.subscriptions.read', 'platform.subscriptions.manage']) {
    plansService = {
      getById: jest.fn().mockReturnValue(of(planDetail)),
      update: jest.fn(),
      archive: jest.fn(),
    };
    moduleCatalogService = { list: jest.fn().mockReturnValue(of([])) };
    notificationService = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [SubscriptionPlanDetail],
      providers: [
        { provide: SubscriptionPlansService, useValue: plansService },
        { provide: ModuleCatalogService, useValue: moduleCatalogService },
        { provide: NotificationService, useValue: notificationService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'plan-1' }) } },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SubscriptionPlanDetail);
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

  it('loads and displays the plan', () => {
    const fixture = setup();
    expect(plansService.getById).toHaveBeenCalledWith('plan-1');
    expect(fixture.nativeElement.textContent).toContain('Starter');
  });

  it('hides Edit/Archive without manage permission', () => {
    const fixture = setup(['platform.subscriptions.read']);
    expect(fixture.nativeElement.textContent).not.toContain('Archive');
  });

  it('archives the plan and reloads on confirm', () => {
    const fixture = setup();
    plansService.archive.mockReturnValue(of(undefined));
    const component = fixture.componentInstance;

    component['startArchive']();
    component['confirmArchive']();

    expect(plansService.archive).toHaveBeenCalledWith('plan-1');
    expect(notificationService.success).toHaveBeenCalledWith('Subscription plan archived.');
    expect(plansService.getById).toHaveBeenCalledTimes(2);
  });

  it('shows the backend error detail message when update fails', () => {
    const fixture = setup();
    plansService.update.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ status: 400, error: { detail: 'Unknown module keys: bad-key.' } }),
      ),
    );
    const component = fixture.componentInstance;

    component['saveEdit']({
      name: 'Starter',
      code: 'starter_1_10',
      tier: 'Starter',
      companySizeRange: '1-10',
      moduleKeys: ['core-hr'],
      currency: 'USD',
      overrideMonthlyPrice: null,
      overrideAnnualPrice: null,
      aiTokenLimitPerMonth: null,
      trialPeriodDays: 30,
      unpaidGracePeriodDays: 7,
    });

    expect(notificationService.error).toHaveBeenCalledWith('Unknown module keys: bad-key.');
  });
});
```

- [ ] **Step 4: Run the spec**

Run: `npx jest subscription-plan-detail.spec`
Expected: PASS (4 tests)

- [ ] **Step 5: Run full verification**

```bash
npm test
```
Expected: PASS, all suites green (this is the first point the full suite compiles cleanly — Tasks 2's routes reference this task's components).

```bash
npm run lint
```
Expected: no new errors (pre-existing, unrelated warnings in `modal.ts`/`tenant-wizard.html` may still appear depending on which branches have merged — do not touch them).

```bash
npm run build
```
Expected: builds cleanly.

- [ ] **Step 6: Commit**

```bash
git add src/app/modules/subscription-plans/feature/subscription-plan-detail
git commit -m "feat: add subscription plan detail page with edit and archive"
```

---

## Final Step

After Task 5, use superpowers:finishing-a-development-branch to verify the full test suite one more time and present merge/PR/keep options. Also remind the user: this module only works end-to-end once the backend's `feature/admin-subscription-plans-list` (PR #47) and `feature/admin-subscription-plan-detail-endpoint` branches are merged into `HRMS-Backend-v1`'s `development`.
