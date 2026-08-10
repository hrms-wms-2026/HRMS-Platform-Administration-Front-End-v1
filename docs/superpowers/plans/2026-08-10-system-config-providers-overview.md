# System Config: Providers Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only, family-grouped overview of every System Config provider (OAuth Apps, Service Keys' four families, Payment Gateways) wired to the already-merged backend `GET /admin/v1/system-config/providers` endpoint.

**Architecture:** Pure frontend addition to the existing `system-config` module — a thin data layer (one method) plus a single flat list page that groups the response client-side by `providerFamily` into fixed, ordered sections. No mutating actions anywhere on this screen.

**Tech Stack:** Angular 21 (signals, `computed()`), Jest + `HttpTestingController`.

## Global Constraints

- No backend work — `GET /admin/v1/system-config/providers` already exists and is merged to `development`.
- Permission gating: `platform.system_config.read` only. This screen has no manage-gated content.
- No dummy data — family display labels are presentation-only text mapped from the backend's real `providerFamily` slug; the underlying configured/active/last-verified data always comes from the real response, never hardcoded.
- No row navigation/click handlers — this screen is purely inert (see spec for why).
- Repo root: `C:\Users\User\OneDrive\Desktop\onexso\platform-administration`. Branch: `feature/system-config-providers-overview` (already created off up-to-date `origin/development`, spec already committed there).

---

### Task 1: Providers data layer

**Files:**
- Create: `src/app/modules/system-config/data/provider-card.model.ts`
- Create: `src/app/modules/system-config/data/providers.service.ts`
- Create: `src/app/modules/system-config/data/providers.service.spec.ts`
- Modify: `src/app/core/config/api-endpoints.ts`

**Interfaces:**
- Produces: `PlatformProviderCard` interface; `ProvidersService.list(): Observable<PlatformProviderCard[]>`. Task 2 consumes both.

- [ ] **Step 1: Create `provider-card.model.ts`**

```typescript
export interface PlatformProviderCard {
  id: string;
  providerKey: string;
  displayName: string;
  providerFamily: string;
  configured: boolean;
  configurationActive: boolean;
  lastVerifiedAt: string | null;
}
```

- [ ] **Step 2: Extend `api-endpoints.ts`**

Find the `systemConfig` block. If it already has an `oauthApps` sub-key
(from the OAuth Apps branch) add `providers` as a sibling; if `systemConfig`
isn't present yet on this fresh branch, add it as a new top-level key
right before the closing `} as const;`:

```typescript
  systemConfig: {
    providers: {
      list: '/system-config/providers',
    },
  },
```

- [ ] **Step 3: Create `providers.service.ts`**

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import { PlatformProviderCard } from './provider-card.model';

@Injectable({ providedIn: 'root' })
export class ProvidersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  list(): Observable<PlatformProviderCard[]> {
    return this.http.get<PlatformProviderCard[]>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.providers.list}`,
      { withCredentials: true },
    );
  }
}
```

- [ ] **Step 4: Create `providers.service.spec.ts`**

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ProvidersService } from './providers.service';
import { environment } from '../../../../environments/environment';

describe('ProvidersService', () => {
  let service: ProvidersService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProvidersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists all provider cards', () => {
    let result: unknown;
    service.list().subscribe((cards) => (result = cards));

    const req = httpMock.expectOne(`${environment.apiUrl}/system-config/providers`);
    expect(req.request.method).toBe('GET');
    const card = {
      id: 'p1',
      providerKey: 'github',
      displayName: 'GitHub',
      providerFamily: 'oauth_app',
      configured: false,
      configurationActive: false,
      lastVerifiedAt: null,
    };
    req.flush([card]);
    expect(result).toEqual([card]);
  });
});
```

- [ ] **Step 5: Run the spec**

Run: `npx jest providers.service.spec`
Expected: PASS (1 test)

- [ ] **Step 6: Commit**

```bash
git add src/app/modules/system-config/data src/app/core/config/api-endpoints.ts
git commit -m "feat: add system config providers overview data layer"
```

---

### Task 2: Providers overview page + route + full verification

**Files:**
- Create: `src/app/modules/system-config/feature/providers-overview/providers-overview.ts`
- Create: `src/app/modules/system-config/feature/providers-overview/providers-overview.html`
- Create: `src/app/modules/system-config/feature/providers-overview/providers-overview.spec.ts`
- Modify: `src/app/app.routes.ts`

**Interfaces:**
- Consumes: `ProvidersService.list()`/`PlatformProviderCard` (Task 1), `PermissionStore.hasPermission()`.

- [ ] **Step 1: Write `providers-overview.ts`**

```typescript
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ProvidersService } from '../../data/providers.service';
import { PlatformProviderCard } from '../../data/provider-card.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { Loader } from '../../../../shared/ui/loader/loader';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';

interface ProviderFamilyGroup {
  label: string;
  cards: PlatformProviderCard[];
}

const FAMILY_ORDER: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'oauth_app', label: 'OAuth Apps' },
  { key: 'transactional_email', label: 'Transactional Email' },
  { key: 'infrastructure', label: 'Infrastructure' },
  { key: 'object_storage', label: 'Object Storage' },
  { key: 'ai_verification', label: 'AI Verification' },
  { key: 'payment_gateway', label: 'Payment Gateways' },
];

@Component({
  selector: 'app-providers-overview',
  imports: [Loader, ErrorBanner, StatusBadge, DatePipe],
  templateUrl: './providers-overview.html',
})
export class ProvidersOverview implements OnInit {
  private readonly providersService = inject(ProvidersService);
  protected readonly permissionStore = inject(PermissionStore);

  protected readonly canView = computed(() => this.permissionStore.hasPermission('platform.system_config.read'));

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly providers = signal<PlatformProviderCard[]>([]);

  protected readonly groupedFamilies = computed<ProviderFamilyGroup[]>(() => {
    const all = this.providers();
    return FAMILY_ORDER.map((family) => ({
      label: family.label,
      cards: all.filter((card) => card.providerFamily === family.key),
    })).filter((group) => group.cards.length > 0);
  });

  ngOnInit(): void {
    if (!this.canView()) {
      return;
    }
    this.loadProviders();
  }

  protected loadProviders(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.providersService.list().subscribe({
      next: (providers) => {
        this.providers.set(providers);
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

- [ ] **Step 2: Write `providers-overview.html`**

```html
@if (!canView()) {
  <div class="rounded-2xl bg-white p-8 shadow-sm">
    <p class="text-sm font-medium text-red-700">No permission to view page</p>
  </div>
} @else {
  <div class="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm">
    <div>
      <h1 class="text-xl font-semibold text-slate-900">Providers Overview</h1>
      <p class="mt-1 text-sm text-slate-500">Configuration status across every System Config provider</p>
    </div>

    @if (loading()) {
      <app-loader label="Loading…" />
    } @else if (errorMessage(); as message) {
      <app-error-banner [message]="message" (retry)="loadProviders()" />
    } @else {
      @for (group of groupedFamilies(); track group.label) {
        <div class="flex flex-col gap-2">
          <h2 class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ group.label }}</h2>
          <div class="divide-y divide-slate-100 rounded-xl border border-slate-200">
            @for (card of group.cards; track card.providerKey) {
              <div class="flex items-center justify-between gap-4 px-4 py-3">
                <span class="text-sm font-medium text-slate-900">{{ card.displayName }}</span>
                <div class="flex items-center gap-3">
                  <app-status-badge
                    [label]="card.configured ? 'Configured' : 'Not configured'"
                    [tone]="card.configured ? 'success' : 'neutral'"
                  />
                  @if (card.configured) {
                    <app-status-badge
                      [label]="card.configurationActive ? 'Active' : 'Inactive'"
                      [tone]="card.configurationActive ? 'success' : 'neutral'"
                    />
                  }
                  <span class="text-xs text-slate-400">
                    Last verified: {{ card.lastVerifiedAt ? (card.lastVerifiedAt | date: 'medium') : '—' }}
                  </span>
                </div>
              </div>
            }
          </div>
        </div>
      }
    }
  </div>
}
```

- [ ] **Step 3: Write `providers-overview.spec.ts`**

```typescript
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ProvidersOverview } from './providers-overview';
import { ProvidersService } from '../../data/providers.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';

describe('ProvidersOverview', () => {
  let providersService: { list: jest.Mock };

  const cards = [
    {
      id: 'p1',
      providerKey: 'github',
      displayName: 'GitHub',
      providerFamily: 'oauth_app',
      configured: false,
      configurationActive: false,
      lastVerifiedAt: null,
    },
    {
      id: 'p2',
      providerKey: 'resend',
      displayName: 'Resend',
      providerFamily: 'transactional_email',
      configured: true,
      configurationActive: true,
      lastVerifiedAt: '2026-01-01T00:00:00Z',
    },
  ];

  function setup(permissions: string[] = ['platform.system_config.read']) {
    providersService = { list: jest.fn().mockReturnValue(of(cards)) };

    TestBed.configureTestingModule({
      imports: [ProvidersOverview],
      providers: [{ provide: ProvidersService, useValue: providersService }],
    }).compileComponents();

    const fixture = TestBed.createComponent(ProvidersOverview);
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
    expect(providersService.list).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('No permission to view page');
  });

  it('groups providers by family with correct section headings', () => {
    const fixture = setup();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('OAuth Apps');
    expect(text).toContain('GitHub');
    expect(text).toContain('Transactional Email');
    expect(text).toContain('Resend');
  });

  it('does not render a heading for a family with no entries', () => {
    const fixture = setup();
    expect(fixture.nativeElement.textContent).not.toContain('Payment Gateways');
    expect(fixture.nativeElement.textContent).not.toContain('Infrastructure');
  });

  it('shows Configured + Active badges for a configured provider and Not configured for an unconfigured one', () => {
    const fixture = setup();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Not configured');
    expect(text).toContain('Configured');
    expect(text).toContain('Active');
  });

  it('renders an em dash for a null lastVerifiedAt', () => {
    const fixture = setup();
    expect(fixture.nativeElement.textContent).toContain('—');
  });
});
```

- [ ] **Step 4: Add the route in `app.routes.ts`**

Find the `system-config/oauth-apps` route entry (or, if the OAuth Apps
branch hasn't merged yet on this branch, find the `audit-logs` route
entry instead) and add a new sibling route right after it:

```typescript
      {
        path: 'system-config/providers',
        loadComponent: () =>
          import('./modules/system-config/feature/providers-overview/providers-overview').then(
            (m) => m.ProvidersOverview,
          ),
      },
```

- [ ] **Step 5: Run the spec**

Run: `npx jest providers-overview.spec`
Expected: PASS (5 tests)

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
git add src/app/modules/system-config/feature/providers-overview src/app/app.routes.ts
git commit -m "feat: add system config providers overview page"
```

---

## Final Step

After Task 2, use superpowers:finishing-a-development-branch to verify the full test suite one more time and present merge/PR/keep options.
