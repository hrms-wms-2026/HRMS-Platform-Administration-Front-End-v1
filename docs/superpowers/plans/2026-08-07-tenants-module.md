# Tenants Module Implementation Plan (List, Detail, Status Actions)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a working Tenants screen (list with search/status filter/pagination, detail view, and status-change actions) to `platform-administration`, consuming the already-complete `TenantsController` backend.

**Architecture:** Standard Angular feature module under `modules/tenants/`, mirroring `modules/platform-users/`'s `data/` + `feature/` split. Two routed components (`TenantsList`, `TenantDetail`) backed by one `TenantsService`. Server-side search/status/pagination (unlike the Users list's client-side filtering) since the Tenants API was built specifically for that.

**Tech Stack:** Angular 21 standalone components/signals, `HttpClient` + `HttpParams`, existing shared UI (`Button`, `StatusBadge`, `Loader`, `ErrorBanner`, `EmptyState`, `Pagination`, `ConfirmationDialog`).

## Global Constraints

- Frontend only — `TenantsController` and its query/command handlers already exist and are tested (`TenantsAdminApiIntegrationTests.cs`); no backend changes in this plan.
- List/detail-view access requires `platform.tenants.read`; status-change actions require `platform.tenants.manage` — same `[RequirePlatformPermission]` pattern already enforced server-side, mirrored client-side via `PermissionStore.hasPermission(...)`.
- Out of scope: tenant creation, editing draft fields, provisioning checklist, tenant-owner invite, the `plan_code` filter — per the approved spec.
- List response JSON is camelCase (`TenantListItemDto`/`TenantListResponseDto` have no `JsonPropertyName` overrides, so ASP.NET Core's default Web camelCase policy applies: `id, name, slug, status, createdAt` / `items, total, page, pageSize`).
- Detail response JSON is explicit snake_case (`TenantDetailDto` has `[property: JsonPropertyName(...)]` on every property): `id, company_name, slug, industry_profile, company_size_range, status, subscription_plan_id, settings_json, legal_entity_name, registration_number, country, currency, created_at, updated_at`.
- Status-update request body is camelCase (`TenantStatusUpdateRequest` has no overrides): `{ action, reason }`.
- Valid `status` filter/action values are case-insensitive on the backend (`Enum.TryParse<TenantStatus>(..., ignoreCase: true, ...)`); use lowercase (`active`, `suspended`, `provisioning`, `trial`, `cancelled`) client-side, matching the existing Users list's `value="active"` convention.

---

### Task 1: Tenants data layer (model + service + endpoints)

**Files:**
- Create: `src/app/modules/tenants/data/tenant.model.ts`
- Create: `src/app/modules/tenants/data/tenants.service.ts`
- Test: `src/app/modules/tenants/data/tenants.service.spec.ts`
- Modify: `src/app/core/config/api-endpoints.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `TenantListItem { id, name, slug, status, createdAt }`, `TenantListResponse { items: TenantListItem[], total, page, pageSize }`, `TenantDetail { id, companyName, slug, industryProfile, companySizeRange, status, subscriptionPlanId, settingsJson, legalEntityName, registrationNumber, country, currency, createdAt, updatedAt }` (all `string | null` where the DTO field is nullable) — consumed by Tasks 2 and 4. `TenantsService.list(params): Observable<TenantListResponse>`, `TenantsService.getById(id: string): Observable<TenantDetail>`, `TenantsService.changeStatus(id: string, action: string, reason?: string): Observable<void>` — consumed by Tasks 2 and 4.

- [ ] **Step 1: Write the failing test**

Create `src/app/modules/tenants/data/tenants.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TenantsService } from './tenants.service';
import { environment } from '../../../../environments/environment';

describe('TenantsService', () => {
  let service: TenantsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(TenantsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists tenants with search, status, and pagination as query params', () => {
    service
      .list({ search: 'acme', status: 'active', page: 2, pageSize: 25 })
      .subscribe();

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${environment.apiUrl}/tenants` &&
        r.params.get('search') === 'acme' &&
        r.params.get('status') === 'active' &&
        r.params.get('page') === '2' &&
        r.params.get('page_size') === '25',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ items: [], total: 0, page: 2, pageSize: 25 });
  });

  it('omits empty search and status from the query params', () => {
    service.list({ search: '', status: '', page: 1, pageSize: 25 }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/tenants?page=1&page_size=25`);
    expect(req.request.params.has('search')).toBe(false);
    expect(req.request.params.has('status')).toBe(false);
    req.flush({ items: [], total: 0, page: 1, pageSize: 25 });
  });

  it('maps the snake_case detail response to a camelCase TenantDetail', () => {
    let result: unknown;
    service.getById('tenant-1').subscribe((detail) => (result = detail));

    const req = httpMock.expectOne(`${environment.apiUrl}/tenants/tenant-1`);
    expect(req.request.method).toBe('GET');
    req.flush({
      id: 'tenant-1',
      company_name: 'Acme Inc',
      slug: 'acme',
      industry_profile: 'technology',
      company_size_range: '11-50',
      status: 'active',
      subscription_plan_id: null,
      settings_json: null,
      legal_entity_name: 'Acme Legal LLC',
      registration_number: 'REG123',
      country: 'US',
      currency: 'USD',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: null,
    });

    expect(result).toEqual({
      id: 'tenant-1',
      companyName: 'Acme Inc',
      slug: 'acme',
      industryProfile: 'technology',
      companySizeRange: '11-50',
      status: 'active',
      subscriptionPlanId: null,
      settingsJson: null,
      legalEntityName: 'Acme Legal LLC',
      registrationNumber: 'REG123',
      country: 'US',
      currency: 'USD',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: null,
    });
  });

  it('sends the status change action and reason', () => {
    service.changeStatus('tenant-1', 'suspend', 'Non-payment').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/tenants/tenant-1/status`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ action: 'suspend', reason: 'Non-payment' });
    expect(req.request.withCredentials).toBe(true);
    req.flush(null);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tenants.service`
Expected: FAIL — `Cannot find module './tenants.service'` (nothing created yet).

- [ ] **Step 3: Add the Tenants endpoints**

In `src/app/core/config/api-endpoints.ts`, add a `tenants` key to the existing `API_ENDPOINTS` object (do not remove any existing keys):

```typescript
  tenants: {
    list: '/tenants',
    byId: (id: string) => `/tenants/${id}`,
    status: (id: string) => `/tenants/${id}/status`,
  },
```

- [ ] **Step 4: Write the model**

Create `src/app/modules/tenants/data/tenant.model.ts`:

```typescript
export interface TenantListItem {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
}

export interface TenantListResponse {
  items: TenantListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TenantDetail {
  id: string;
  companyName: string;
  slug: string;
  industryProfile: string;
  companySizeRange: string;
  status: string;
  subscriptionPlanId: string | null;
  settingsJson: string | null;
  legalEntityName: string | null;
  registrationNumber: string | null;
  country: string | null;
  currency: string | null;
  createdAt: string;
  updatedAt: string | null;
}
```

- [ ] **Step 5: Write the implementation**

Create `src/app/modules/tenants/data/tenants.service.ts`:

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import { TenantDetail, TenantListResponse } from './tenant.model';

interface TenantDetailResponse {
  id: string;
  company_name: string;
  slug: string;
  industry_profile: string;
  company_size_range: string;
  status: string;
  subscription_plan_id: string | null;
  settings_json: string | null;
  legal_entity_name: string | null;
  registration_number: string | null;
  country: string | null;
  currency: string | null;
  created_at: string;
  updated_at: string | null;
}

function toTenantDetail(response: TenantDetailResponse): TenantDetail {
  return {
    id: response.id,
    companyName: response.company_name,
    slug: response.slug,
    industryProfile: response.industry_profile,
    companySizeRange: response.company_size_range,
    status: response.status,
    subscriptionPlanId: response.subscription_plan_id,
    settingsJson: response.settings_json,
    legalEntityName: response.legal_entity_name,
    registrationNumber: response.registration_number,
    country: response.country,
    currency: response.currency,
    createdAt: response.created_at,
    updatedAt: response.updated_at,
  };
}

export interface ListTenantsParams {
  search: string;
  status: string;
  page: number;
  pageSize: number;
}

@Injectable({ providedIn: 'root' })
export class TenantsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  list(params: ListTenantsParams): Observable<TenantListResponse> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('page_size', params.pageSize);
    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }

    return this.http.get<TenantListResponse>(`${this.baseUrl}${API_ENDPOINTS.tenants.list}`, {
      params: httpParams,
      withCredentials: true,
    });
  }

  getById(id: string): Observable<TenantDetail> {
    return this.http
      .get<TenantDetailResponse>(`${this.baseUrl}${API_ENDPOINTS.tenants.byId(id)}`, {
        withCredentials: true,
      })
      .pipe(map(toTenantDetail));
  }

  changeStatus(id: string, action: string, reason?: string): Observable<void> {
    return this.http.patch<void>(
      `${this.baseUrl}${API_ENDPOINTS.tenants.status(id)}`,
      { action, reason },
      { withCredentials: true },
    );
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- tenants.service`
Expected: PASS — all 4 tests green.

- [ ] **Step 7: Commit**

```bash
git add src/app/modules/tenants/data/tenant.model.ts src/app/modules/tenants/data/tenants.service.ts src/app/modules/tenants/data/tenants.service.spec.ts src/app/core/config/api-endpoints.ts
git commit -m "feat: add Tenants data layer (model, service, endpoints)"
```

---

### Task 2: TenantsList component, route, and sidebar entry

**Files:**
- Create: `src/app/modules/tenants/feature/tenants-list/tenants-list.ts`
- Create: `src/app/modules/tenants/feature/tenants-list/tenants-list.html`
- Test: `src/app/modules/tenants/feature/tenants-list/tenants-list.spec.ts`
- Modify: `src/app/app.routes.ts`
- Modify: `src/app/layouts/main-layout/sidebar/sidebar.html`
- Modify: `src/app/layouts/main-layout/sidebar/sidebar.spec.ts`

**Interfaces:**
- Consumes: `TenantsService.list(params)` from Task 1, `PermissionStore.hasPermission(code)` (existing), shared UI components `Button`, `StatusBadge`, `Loader`, `ErrorBanner`, `EmptyState`, `Pagination` (existing, same imports as `PlatformUsersList`).
- Produces: route `/tenants` rendering `TenantsList`; a real (non-"Coming soon") sidebar item that navigates there. Task 4 relies on `TenantsList` rows linking to `/tenants/{id}`.

- [ ] **Step 1: Write the failing test**

Create `src/app/modules/tenants/feature/tenants-list/tenants-list.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { TenantsList } from './tenants-list';
import { TenantsService } from '../../data/tenants.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';

describe('TenantsList', () => {
  let tenantsService: { list: jest.Mock };

  function setup(permissions: string[] = ['platform.tenants.read']) {
    tenantsService = { list: jest.fn() };

    TestBed.configureTestingModule({
      imports: [TenantsList],
      providers: [provideRouter([]), { provide: TenantsService, useValue: tenantsService }],
    }).compileComponents();

    const fixture = TestBed.createComponent(TenantsList);
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

    expect(tenantsService.list).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('No permission to view page');
  });

  it('loads tenants on init when authorized', () => {
    tenantsService.list.mockReturnValue(
      of({
        items: [{ id: 't1', name: 'Acme', slug: 'acme', status: 'active', createdAt: '2026-01-01T00:00:00Z' }],
        total: 1,
        page: 1,
        pageSize: 20,
      }),
    );
    const fixture = setup();
    fixture.detectChanges();

    expect(tenantsService.list).toHaveBeenCalledWith({ search: '', status: '', page: 1, pageSize: 20 });
    expect(fixture.nativeElement.textContent).toContain('Acme');
  });

  it('resets to page 1 and re-queries when the search term changes', () => {
    tenantsService.list.mockReturnValue(of({ items: [], total: 0, page: 1, pageSize: 20 }));
    const fixture = setup();
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['goToPage'](3);
    component['onSearchChange']('acme');

    expect(component['currentPage']()).toBe(1);
    expect(tenantsService.list).toHaveBeenLastCalledWith({
      search: 'acme',
      status: '',
      page: 1,
      pageSize: 20,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tenants-list`
Expected: FAIL — `Cannot find module './tenants-list'`.

- [ ] **Step 3: Write the implementation**

Create `src/app/modules/tenants/feature/tenants-list/tenants-list.ts`:

```typescript
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TenantsService } from '../../data/tenants.service';
import { TenantListItem } from '../../data/tenant.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { Button } from '../../../../shared/ui/button/button';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { Loader } from '../../../../shared/ui/loader/loader';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Pagination } from '../../../../shared/ui/pagination/pagination';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  active: 'success',
  trial: 'warning',
  provisioning: 'neutral',
  suspended: 'danger',
  cancelled: 'neutral',
};

@Component({
  selector: 'app-tenants-list',
  imports: [RouterLink, Button, StatusBadge, Loader, ErrorBanner, EmptyState, Pagination],
  templateUrl: './tenants-list.html',
})
export class TenantsList implements OnInit {
  private readonly tenantsService = inject(TenantsService);
  protected readonly permissionStore = inject(PermissionStore);

  protected readonly pageSize = PAGE_SIZE;

  protected readonly canView = computed(() => this.permissionStore.hasPermission('platform.tenants.read'));

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly tenants = signal<TenantListItem[]>([]);
  protected readonly total = signal(0);
  protected readonly search = signal('');
  protected readonly statusFilter = signal('');
  protected readonly currentPage = signal(1);

  private searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void {
    if (!this.canView()) {
      return;
    }
    this.loadTenants();
  }

  protected onSearchChange(value: string): void {
    this.search.set(value);
    this.currentPage.set(1);

    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => this.loadTenants(), SEARCH_DEBOUNCE_MS);
  }

  protected onStatusFilterChange(value: string): void {
    this.statusFilter.set(value);
    this.currentPage.set(1);
    this.loadTenants();
  }

  protected goToPage(page: number): void {
    this.currentPage.set(page);
    this.loadTenants();
  }

  protected toneFor(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
    return STATUS_TONE[status] ?? 'neutral';
  }

  protected loadTenants(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.tenantsService
      .list({
        search: this.search(),
        status: this.statusFilter(),
        page: this.currentPage(),
        pageSize: PAGE_SIZE,
      })
      .subscribe({
        next: (response) => {
          this.tenants.set(response.items);
          this.total.set(response.total);
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

Create `src/app/modules/tenants/feature/tenants-list/tenants-list.html`:

```html
@if (!canView()) {
  <div class="rounded-2xl bg-white p-8 shadow-sm">
    <p class="text-sm font-medium text-red-700">No permission to view page</p>
  </div>
} @else {
  <div class="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm">
    <div>
      <h1 class="text-xl font-semibold text-slate-900">Tenants</h1>
      <p class="mt-1 text-sm text-slate-500">Manage tenant accounts and their status</p>
    </div>

    <div class="flex flex-col gap-3 sm:flex-row">
      <input
        type="text"
        placeholder="Search by name or slug"
        [value]="search()"
        (input)="onSearchChange($any($event.target).value)"
        class="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/30"
      />
      <select
        [value]="statusFilter()"
        (change)="onStatusFilterChange($any($event.target).value)"
        class="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/30"
      >
        <option value="">All Statuses</option>
        <option value="provisioning">Provisioning</option>
        <option value="trial">Trial</option>
        <option value="active">Active</option>
        <option value="suspended">Suspended</option>
        <option value="cancelled">Cancelled</option>
      </select>
    </div>

    @if (loading()) {
      <app-loader label="Loading…" />
    } @else if (errorMessage(); as message) {
      <app-error-banner [message]="message" (retry)="loadTenants()" />
    } @else if (tenants().length === 0) {
      <app-empty-state
        [title]="search() || statusFilter() ? 'No tenants match your search' : 'No tenants yet'"
      />
    } @else {
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="border-b border-slate-200 text-xs font-medium uppercase text-slate-500">
            <th class="py-2 pr-4">Name</th>
            <th class="py-2 pr-4">Slug</th>
            <th class="py-2 pr-4">Status</th>
            <th class="py-2 pr-4">Created</th>
          </tr>
        </thead>
        <tbody>
          @for (tenant of tenants(); track tenant.id) {
            <tr
              [routerLink]="['/tenants', tenant.id]"
              class="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
            >
              <td class="py-3 pr-4 font-medium text-slate-900">{{ tenant.name }}</td>
              <td class="py-3 pr-4 text-slate-600">{{ tenant.slug }}</td>
              <td class="py-3 pr-4">
                <app-status-badge [label]="tenant.status" [tone]="toneFor(tenant.status)" />
              </td>
              <td class="py-3 pr-4 text-slate-600">{{ tenant.createdAt | date: 'mediumDate' }}</td>
            </tr>
          }
        </tbody>
      </table>

      <app-pagination
        [page]="currentPage()"
        [pageSize]="pageSize"
        [total]="total()"
        (pageChange)="goToPage($event)"
      />
    }
  </div>
}
```

Note: `date` pipe requires `DatePipe` in the component's `imports` array — add it:

```typescript
import { DatePipe } from '@angular/common';
```

and include `DatePipe` in the `@Component({ imports: [...] })` array alongside the others.

- [ ] **Step 4: Register the route**

In `src/app/app.routes.ts`, add a new child route inside the existing guarded `MainLayout` route's `children` array (after the `users` entry, before `settings/mfa`):

```typescript
      {
        path: 'tenants',
        loadComponent: () =>
          import('./modules/tenants/feature/tenants-list/tenants-list').then((m) => m.TenantsList),
      },
```

- [ ] **Step 5: Add the sidebar entry**

In `src/app/layouts/main-layout/sidebar/sidebar.html`, insert a new real nav item between the Dashboard link and the Users link:

```html
  <a
    routerLink="/tenants"
    routerLinkActive="bg-indigo-50 text-indigo-700 font-semibold"
    data-sidebar-item
    class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
  >
    <svg class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <rect x="4" y="3" width="16" height="18" rx="1"></rect>
      <rect x="7" y="6" width="3" height="3"></rect>
      <rect x="14" y="6" width="3" height="3"></rect>
      <rect x="7" y="11" width="3" height="3"></rect>
      <rect x="14" y="11" width="3" height="3"></rect>
      <rect x="10" y="16" width="4" height="5"></rect>
    </svg>
    Tenants
  </a>
```

(Insert it directly after the closing `</a>` of the Dashboard link and before the opening `<a routerLink="/users" ...>` tag.)

- [ ] **Step 6: Update the sidebar test**

In `src/app/layouts/main-layout/sidebar/sidebar.spec.ts`, update the first test (`'renders Dashboard and Users as real navigable links'`) to also assert the Tenants link:

```typescript
  it('renders Dashboard, Tenants, and Users as real navigable links', () => {
    const fixture = setup();
    const links = fixture.debugElement.queryAll(By.css('a'));
    const hrefs = links.map((link) => link.nativeElement.getAttribute('href'));

    expect(hrefs).toContain('/');
    expect(hrefs).toContain('/tenants');
    expect(hrefs).toContain('/users');
  });
```

(Replace the existing `it('renders Dashboard and Users as real navigable links', ...)` block with this one — same body structure, just the added assertion and renamed test title.)

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test -- tenants-list sidebar`
Expected: PASS — all `TenantsList` tests and all `Sidebar` tests green.

- [ ] **Step 8: Run the full frontend test suite**

Run: `npm test`
Expected: PASS — no regressions elsewhere.

- [ ] **Step 9: Commit**

```bash
git add src/app/modules/tenants/feature/tenants-list/ src/app/app.routes.ts src/app/layouts/main-layout/sidebar/sidebar.html src/app/layouts/main-layout/sidebar/sidebar.spec.ts
git commit -m "feat: add Tenants list screen, route, and sidebar entry"
```

---

### Task 3: ConfirmationDialog confirm-button variant support

**Files:**
- Modify: `src/app/shared/ui/confirmation-dialog/confirmation-dialog.ts`
- Test: `src/app/shared/ui/confirmation-dialog/confirmation-dialog.spec.ts`

**Interfaces:**
- Consumes: `Button` (existing, already has an `indigo` variant added earlier this session), `Modal` (existing).
- Produces: `ConfirmationDialog` gains an optional `confirmVariant` input (`ButtonVariant`, defaults to `'danger'` — preserves current behavior for every existing/future caller that doesn't set it). Task 4's non-destructive actions (Activate, Unsuspend) pass `confirmVariant="indigo"`; destructive ones (Suspend, Cancel) rely on the default `'danger'`.

**Context:** `ConfirmationDialog`'s confirm button is hardcoded to `variant="danger"` today. That's wrong for a non-destructive action like "Activate" (a red confirm button implies something harmful). No component currently uses `ConfirmationDialog` — this is its first real usage.

- [ ] **Step 1: Write the failing test**

Create `src/app/shared/ui/confirmation-dialog/confirmation-dialog.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ConfirmationDialog } from './confirmation-dialog';

describe('ConfirmationDialog', () => {
  function setup(confirmVariant?: 'primary' | 'secondary' | 'danger' | 'indigo') {
    TestBed.configureTestingModule({ imports: [ConfirmationDialog] }).compileComponents();
    const fixture = TestBed.createComponent(ConfirmationDialog);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('message', 'Are you sure?');
    if (confirmVariant) {
      fixture.componentRef.setInput('confirmVariant', confirmVariant);
    }
    fixture.detectChanges();
    return fixture;
  }

  function confirmButtonClasses(fixture: ReturnType<typeof setup>): string {
    const buttons = fixture.debugElement.queryAll(By.css('button'));
    const confirmButton = buttons[buttons.length - 1];
    return confirmButton.nativeElement.className;
  }

  it('defaults the confirm button to the danger variant', () => {
    const fixture = setup();
    expect(confirmButtonClasses(fixture)).toContain('bg-red-700');
  });

  it('uses the given confirmVariant when provided', () => {
    const fixture = setup('indigo');
    expect(confirmButtonClasses(fixture)).toContain('bg-indigo-600');
  });

  it('emits confirm and cancel', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    let confirmed = false;
    let cancelled = false;
    component.confirm.subscribe(() => (confirmed = true));
    component.cancel.subscribe(() => (cancelled = true));

    const buttons = fixture.debugElement.queryAll(By.css('button'));
    buttons[0].nativeElement.click();
    buttons[1].nativeElement.click();

    expect(cancelled).toBe(true);
    expect(confirmed).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- confirmation-dialog`
Expected: FAIL — `confirmVariant` input doesn't exist yet, so the second test fails (button stays `bg-red-700` regardless).

- [ ] **Step 3: Write the implementation**

Replace the full contents of `src/app/shared/ui/confirmation-dialog/confirmation-dialog.ts`:

```typescript
import { Component, input, output } from '@angular/core';
import { Modal } from '../modal/modal';
import { Button, ButtonVariant } from '../button/button';

@Component({
  selector: 'app-confirmation-dialog',
  imports: [Modal, Button],
  template: `
    <app-modal [open]="open()" [title]="title()" (close)="cancel.emit()">
      <p class="text-sm text-slate-600">{{ message() }}</p>
      <div class="mt-6 flex justify-end gap-3">
        <app-button label="Cancel" variant="secondary" (clicked)="cancel.emit()" />
        <app-button [label]="confirmLabel()" [variant]="confirmVariant()" (clicked)="confirm.emit()" />
      </div>
    </app-modal>
  `,
})
export class ConfirmationDialog {
  readonly open = input.required<boolean>();
  readonly title = input('Are you sure?');
  readonly message = input.required<string>();
  readonly confirmLabel = input('Confirm');
  readonly confirmVariant = input<ButtonVariant>('danger');
  readonly confirm = output<void>();
  readonly cancel = output<void>();
}
```

(`ButtonVariant` is already exported from `button.ts` per its existing `export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'indigo';` — just needs importing here.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- confirmation-dialog`
Expected: PASS — all 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/ui/confirmation-dialog/confirmation-dialog.ts src/app/shared/ui/confirmation-dialog/confirmation-dialog.spec.ts
git commit -m "feat: add confirmVariant input to ConfirmationDialog"
```

---

### Task 4: TenantDetail component with status actions

**Files:**
- Create: `src/app/modules/tenants/feature/tenant-detail/tenant-detail.ts`
- Create: `src/app/modules/tenants/feature/tenant-detail/tenant-detail.html`
- Test: `src/app/modules/tenants/feature/tenant-detail/tenant-detail.spec.ts`
- Modify: `src/app/app.routes.ts`

**Interfaces:**
- Consumes: `TenantsService.getById(id)` / `TenantsService.changeStatus(id, action, reason?)` from Task 1, `ConfirmationDialog` with `confirmVariant` from Task 3, `PermissionStore.hasPermission(code)`, `NotificationService` (existing), `TenantsList`'s row links (`/tenants/{id}`, from Task 2).
- Produces: route `/tenants/:id` — nothing else depends on this component.

- [ ] **Step 1: Write the failing test**

Create `src/app/modules/tenants/feature/tenant-detail/tenant-detail.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { TenantDetailComponent } from './tenant-detail';
import { TenantsService } from '../../data/tenants.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';

describe('TenantDetail', () => {
  let tenantsService: { getById: jest.Mock; changeStatus: jest.Mock };
  let notificationService: { success: jest.Mock; error: jest.Mock };

  const activeTenant = {
    id: 't1',
    companyName: 'Acme Inc',
    slug: 'acme',
    industryProfile: 'technology',
    companySizeRange: '11-50',
    status: 'active',
    subscriptionPlanId: null,
    settingsJson: null,
    legalEntityName: 'Acme Legal LLC',
    registrationNumber: 'REG123',
    country: 'US',
    currency: 'USD',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: null,
  };

  function setup(permissions: string[] = ['platform.tenants.read', 'platform.tenants.manage']) {
    tenantsService = { getById: jest.fn().mockReturnValue(of(activeTenant)), changeStatus: jest.fn() };
    notificationService = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [TenantDetail],
      providers: [
        { provide: TenantsService, useValue: tenantsService },
        { provide: NotificationService, useValue: notificationService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 't1' }) } },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TenantDetailComponent);
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

  it('loads and renders the tenant detail fields', () => {
    const fixture = setup();
    expect(tenantsService.getById).toHaveBeenCalledWith('t1');
    expect(fixture.nativeElement.textContent).toContain('Acme Inc');
    expect(fixture.nativeElement.textContent).toContain('REG123');
  });

  it('shows Suspend and Cancel actions for an active tenant when the user can manage', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    expect(component['availableActions']()).toEqual([
      { action: 'suspend', label: 'Suspend', confirmVariant: 'danger' },
      { action: 'cancel', label: 'Cancel', confirmVariant: 'danger' },
    ]);
  });

  it('hides all actions when the user lacks manage permission', () => {
    const fixture = setup(['platform.tenants.read']);
    const component = fixture.componentInstance;
    expect(component['availableActions']()).toEqual([]);
  });

  it('calls changeStatus with the reason and reloads on confirm', () => {
    tenantsService.changeStatus.mockReturnValue(of(undefined));
    const fixture = setup();
    const component = fixture.componentInstance;

    component['startAction']({ action: 'suspend', label: 'Suspend', confirmVariant: 'danger' });
    component['reason'].set('Non-payment');
    component['confirmAction']();

    expect(tenantsService.changeStatus).toHaveBeenCalledWith('t1', 'suspend', 'Non-payment');
    expect(notificationService.success).toHaveBeenCalledWith('Tenant status updated.');
    expect(tenantsService.getById).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tenant-detail`
Expected: FAIL — `Cannot find module './tenant-detail'`.

- [ ] **Step 3: Write the implementation**

Create `src/app/modules/tenants/feature/tenant-detail/tenant-detail.ts`:

```typescript
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TenantsService } from '../../data/tenants.service';
import { TenantDetail as TenantDetailModel } from '../../data/tenant.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';
import { Button, ButtonVariant } from '../../../../shared/ui/button/button';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { Loader } from '../../../../shared/ui/loader/loader';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { ConfirmationDialog } from '../../../../shared/ui/confirmation-dialog/confirmation-dialog';

interface StatusAction {
  action: string;
  label: string;
  confirmVariant: ButtonVariant;
}

const ACTIONS_BY_STATUS: Record<string, StatusAction[]> = {
  provisioning: [{ action: 'cancel', label: 'Cancel', confirmVariant: 'danger' }],
  trial: [
    { action: 'activate', label: 'Activate', confirmVariant: 'indigo' },
    { action: 'suspend', label: 'Suspend', confirmVariant: 'danger' },
  ],
  active: [
    { action: 'suspend', label: 'Suspend', confirmVariant: 'danger' },
    { action: 'cancel', label: 'Cancel', confirmVariant: 'danger' },
  ],
  suspended: [
    { action: 'unsuspend', label: 'Unsuspend', confirmVariant: 'indigo' },
    { action: 'cancel', label: 'Cancel', confirmVariant: 'danger' },
  ],
  cancelled: [],
};

@Component({
  selector: 'app-tenant-detail',
  imports: [Button, StatusBadge, Loader, ErrorBanner, ConfirmationDialog],
  templateUrl: './tenant-detail.html',
})
export class TenantDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly tenantsService = inject(TenantsService);
  private readonly notificationService = inject(NotificationService);
  protected readonly permissionStore = inject(PermissionStore);

  private readonly tenantId = this.route.snapshot.paramMap.get('id')!;

  protected readonly canManage = computed(() => this.permissionStore.hasPermission('platform.tenants.manage'));

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly tenant = signal<TenantDetailModel | null>(null);

  protected readonly availableActions = computed<StatusAction[]>(() => {
    if (!this.canManage()) {
      return [];
    }
    const status = this.tenant()?.status ?? '';
    return ACTIONS_BY_STATUS[status] ?? [];
  });

  protected readonly pendingAction = signal<StatusAction | null>(null);
  protected readonly reason = signal('');

  ngOnInit(): void {
    this.loadTenant();
  }

  protected loadTenant(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.tenantsService.getById(this.tenantId).subscribe({
      next: (tenant) => {
        this.tenant.set(tenant);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Something went wrong. Please try again.');
        this.loading.set(false);
      },
    });
  }

  protected startAction(action: StatusAction): void {
    this.reason.set('');
    this.pendingAction.set(action);
  }

  protected cancelAction(): void {
    this.pendingAction.set(null);
  }

  protected confirmAction(): void {
    const action = this.pendingAction();
    if (!action) {
      return;
    }

    this.tenantsService.changeStatus(this.tenantId, action.action, this.reason() || undefined).subscribe({
      next: () => {
        this.pendingAction.set(null);
        this.notificationService.success('Tenant status updated.');
        this.loadTenant();
      },
      error: () => this.notificationService.error('Could not update the tenant status.'),
    });
  }
}
```

Create `src/app/modules/tenants/feature/tenant-detail/tenant-detail.html`:

```html
@if (loading()) {
  <app-loader label="Loading…" />
} @else if (errorMessage(); as message) {
  <app-error-banner [message]="message" (retry)="loadTenant()" />
} @else if (tenant(); as t) {
  <div class="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold text-slate-900">{{ t.companyName }}</h1>
        <p class="mt-1 text-sm text-slate-500">{{ t.slug }}</p>
      </div>
      <app-status-badge [label]="t.status" tone="neutral" />
    </div>

    <div class="grid grid-cols-2 gap-4 text-sm">
      <div>
        <p class="text-xs font-medium uppercase text-slate-500">Industry</p>
        <p class="text-slate-900">{{ t.industryProfile }}</p>
      </div>
      <div>
        <p class="text-xs font-medium uppercase text-slate-500">Company Size</p>
        <p class="text-slate-900">{{ t.companySizeRange }}</p>
      </div>
      <div>
        <p class="text-xs font-medium uppercase text-slate-500">Legal Entity Name</p>
        <p class="text-slate-900">{{ t.legalEntityName || '—' }}</p>
      </div>
      <div>
        <p class="text-xs font-medium uppercase text-slate-500">Registration Number</p>
        <p class="text-slate-900">{{ t.registrationNumber || '—' }}</p>
      </div>
      <div>
        <p class="text-xs font-medium uppercase text-slate-500">Country</p>
        <p class="text-slate-900">{{ t.country || '—' }}</p>
      </div>
      <div>
        <p class="text-xs font-medium uppercase text-slate-500">Currency</p>
        <p class="text-slate-900">{{ t.currency || '—' }}</p>
      </div>
    </div>

    @if (availableActions().length > 0) {
      <div class="flex gap-3 border-t border-slate-100 pt-4">
        @for (action of availableActions(); track action.action) {
          <app-button
            [label]="action.label"
            [variant]="action.confirmVariant"
            (clicked)="startAction(action)"
          />
        }
      </div>
    }
  </div>

  @if (pendingAction(); as action) {
    <app-confirmation-dialog
      [open]="true"
      [title]="action.label + ' tenant?'"
      message="Are you sure you want to {{ action.label.toLowerCase() }} this tenant?"
      [confirmLabel]="action.label"
      [confirmVariant]="action.confirmVariant"
      (confirm)="confirmAction()"
      (cancel)="cancelAction()"
    />
  }
}
```

- [ ] **Step 4: Register the route**

In `src/app/app.routes.ts`, add another child route right after the `tenants` entry added in Task 2:

```typescript
      {
        path: 'tenants/:id',
        loadComponent: () =>
          import('./modules/tenants/feature/tenant-detail/tenant-detail').then((m) => m.TenantDetailComponent),
      },
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tenant-detail`
Expected: PASS — all 4 tests green.

- [ ] **Step 6: Run the full frontend test suite**

Run: `npm test`
Expected: PASS — no regressions.

- [ ] **Step 7: Manual visual check**

Start the dev server (`npm start`) and open `https://admin.localhost:4200/tenants`. Confirm:
- The Tenants sidebar link is active/highlighted, no longer "Coming soon".
- The list loads, search and status filter re-query the backend (check Network tab for `search=`/`status=` query params).
- Clicking a row navigates to `/tenants/{id}` and shows the detail fields.
- The correct action buttons appear per status, and confirming one (e.g. Suspend) updates the status badge after reload.

- [ ] **Step 8: Commit**

```bash
git add src/app/modules/tenants/feature/tenant-detail/ src/app/app.routes.ts
git commit -m "feat: add Tenant detail screen with status actions"
```

---

## Self-Review Notes

- **Spec coverage:** list (search/status/pagination) ✓ Task 2, detail view (all `TenantDetailDto` fields) ✓ Task 4, status actions per the exact transition table ✓ Task 4's `ACTIONS_BY_STATUS`, sidebar entry ✓ Task 2, confirmation dialog with reason ✓ Tasks 3+4, `platform.tenants.read`/`platform.tenants.manage` gating ✓ both list and detail. Explicitly out of scope (creation wizard, edit, provisioning, invite, plan filter) — no task touches any of that.
- **Placeholder scan:** none — every step has literal file contents.
- **Type consistency:** `TenantListItem`/`TenantListResponse`/`TenantDetail` (Task 1) are the exact types `TenantsList` (Task 2) and `TenantDetailComponent` (Task 4) consume. `TenantsService.list/getById/changeStatus` signatures (Task 1) match every call site in Tasks 2 and 4. `ButtonVariant` (extended nowhere in Task 3 — reusing the existing type) matches `StatusAction.confirmVariant`'s type in Task 4.
