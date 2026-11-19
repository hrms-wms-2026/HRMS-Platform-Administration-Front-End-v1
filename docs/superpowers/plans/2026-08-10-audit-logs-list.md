# Audit Logs List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only Audit Logs screen listing platform auth events, wired to the already-merged backend endpoint.

**Architecture:** Pure frontend addition — thin data layer + a single flat read-only list component, mirroring the Roles module's simplest list pattern (no create/edit/detail, no row click-through).

**Tech Stack:** Angular 21 (signals), Jest + `HttpTestingController`.

## Global Constraints

- No backend work — `GET /admin/v1/platform-access/auth-events` already exists and is merged to `development`.
- Permission gating: `platform.audit.read` (exact string, confirmed from `PlatformPermissionCatalog.cs`). No manage/export UI — `platform.audit.export` exists as a permission code but has no backend functionality yet, out of scope.
- No dummy data — `userId`/`sourceIp`/`userAgent` render as-is from the backend; only render `—` for genuinely null values (matches `tenant-detail.html`'s existing convention).
- Repo root: `C:\Users\User\OneDrive\Desktop\onexso\platform-administration`. Branch: create fresh off up-to-date `origin/development`.

---

### Task 1: Audit logs data layer

**Files:**
- Create: `src/app/modules/audit-logs/data/audit-log.model.ts`
- Create: `src/app/modules/audit-logs/data/audit-logs.service.ts`
- Create: `src/app/modules/audit-logs/data/audit-logs.service.spec.ts`
- Modify: `src/app/core/config/api-endpoints.ts`

**Interfaces:**
- Produces: `AuditLogEntry` interface, `AuditLogsService.list(): Observable<AuditLogEntry[]>`. Task 2 consumes both.

- [ ] **Step 1: Create `audit-log.model.ts`**

```typescript
export interface AuditLogEntry {
  id: string;
  userId: string | null;
  eventType: string;
  sourceIp: string | null;
  userAgent: string | null;
  createdAt: string;
}
```

- [ ] **Step 2: Extend `api-endpoints.ts`**

Find:

```typescript
  moduleCatalog: {
    list: '/modules/catalog',
  },
```

Replace with:

```typescript
  moduleCatalog: {
    list: '/modules/catalog',
  },
  auditLogs: {
    list: '/platform-access/auth-events',
  },
```

(If `moduleCatalog` isn't present yet on this fresh branch because `feature/subscription-plans-admin-module` hasn't merged to `development` yet, add `auditLogs` as its own new top-level key at the end of `API_ENDPOINTS`, right before the closing `} as const;`, instead.)

- [ ] **Step 3: Create `audit-logs.service.ts`**

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import { AuditLogEntry } from './audit-log.model';

@Injectable({ providedIn: 'root' })
export class AuditLogsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  list(): Observable<AuditLogEntry[]> {
    return this.http.get<AuditLogEntry[]>(`${this.baseUrl}${API_ENDPOINTS.auditLogs.list}`, {
      withCredentials: true,
    });
  }
}
```

- [ ] **Step 4: Create `audit-logs.service.spec.ts`**

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuditLogsService } from './audit-logs.service';
import { environment } from '../../../../environments/environment';

describe('AuditLogsService', () => {
  let service: AuditLogsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuditLogsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists platform auth events', () => {
    let result: unknown;
    service.list().subscribe((events) => (result = events));

    const req = httpMock.expectOne(`${environment.apiUrl}/platform-access/auth-events`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);

    const event = {
      id: 'event-1',
      userId: 'user-1',
      eventType: 'login_succeeded',
      sourceIp: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      createdAt: '2026-01-01T00:00:00Z',
    };
    req.flush([event]);

    expect(result).toEqual([event]);
  });
});
```

- [ ] **Step 5: Run the spec**

Run: `npx jest audit-logs.service.spec`
Expected: PASS (1 test)

- [ ] **Step 6: Commit**

```bash
git add src/app/modules/audit-logs/data src/app/core/config/api-endpoints.ts
git commit -m "feat: add audit logs data layer"
```

---

### Task 2: Audit logs list page + route + sidebar + full verification

**Files:**
- Create: `src/app/modules/audit-logs/feature/audit-logs-list/audit-logs-list.ts`
- Create: `src/app/modules/audit-logs/feature/audit-logs-list/audit-logs-list.html`
- Create: `src/app/modules/audit-logs/feature/audit-logs-list/audit-logs-list.spec.ts`
- Modify: `src/app/app.routes.ts`
- Modify: `src/app/layouts/main-layout/sidebar/sidebar.html`

**Interfaces:**
- Consumes: `AuditLogsService.list()`/`AuditLogEntry` (Task 1), `PermissionStore.hasPermission()`.

- [ ] **Step 1: Write `audit-logs-list.ts`**

```typescript
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AuditLogsService } from '../../data/audit-logs.service';
import { AuditLogEntry } from '../../data/audit-log.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { Loader } from '../../../../shared/ui/loader/loader';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';

@Component({
  selector: 'app-audit-logs-list',
  imports: [Loader, ErrorBanner, EmptyState, DatePipe],
  templateUrl: './audit-logs-list.html',
})
export class AuditLogsList implements OnInit {
  private readonly auditLogsService = inject(AuditLogsService);
  protected readonly permissionStore = inject(PermissionStore);

  protected readonly canView = computed(() => this.permissionStore.hasPermission('platform.audit.read'));

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly events = signal<AuditLogEntry[]>([]);

  ngOnInit(): void {
    if (!this.canView()) {
      return;
    }
    this.loadEvents();
  }

  protected loadEvents(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.auditLogsService.list().subscribe({
      next: (events) => {
        this.events.set(events);
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

- [ ] **Step 2: Write `audit-logs-list.html`**

```html
@if (!canView()) {
  <div class="rounded-2xl bg-white p-8 shadow-sm">
    <p class="text-sm font-medium text-red-700">No permission to view page</p>
  </div>
} @else {
  <div class="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm">
    <div>
      <h1 class="text-xl font-semibold text-slate-900">Audit Logs</h1>
      <p class="mt-1 text-sm text-slate-500">Platform authentication and security events</p>
    </div>

    @if (loading()) {
      <app-loader label="Loading…" />
    } @else if (errorMessage(); as message) {
      <app-error-banner [message]="message" (retry)="loadEvents()" />
    } @else if (events().length === 0) {
      <app-empty-state title="No audit log events yet" />
    } @else {
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="border-b border-slate-200 text-xs font-medium uppercase text-slate-500">
            <th class="py-2 pr-4">Event Type</th>
            <th class="py-2 pr-4">User ID</th>
            <th class="py-2 pr-4">Source IP</th>
            <th class="py-2 pr-4">User Agent</th>
            <th class="py-2 pr-4">Created At</th>
          </tr>
        </thead>
        <tbody>
          @for (event of events(); track event.id) {
            <tr class="border-b border-slate-100">
              <td class="py-3 pr-4 font-medium text-slate-900">{{ event.eventType }}</td>
              <td class="py-3 pr-4 text-slate-600">{{ event.userId || '—' }}</td>
              <td class="py-3 pr-4 text-slate-600">{{ event.sourceIp || '—' }}</td>
              <td class="py-3 pr-4 text-slate-600">{{ event.userAgent || '—' }}</td>
              <td class="py-3 pr-4 text-slate-600">{{ event.createdAt | date: 'medium' }}</td>
            </tr>
          }
        </tbody>
      </table>
    }
  </div>
}
```

- [ ] **Step 3: Write `audit-logs-list.spec.ts`**

```typescript
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuditLogsList } from './audit-logs-list';
import { AuditLogsService } from '../../data/audit-logs.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';

describe('AuditLogsList', () => {
  let auditLogsService: { list: jest.Mock };

  function setup(permissions: string[] = ['platform.audit.read']) {
    auditLogsService = { list: jest.fn() };

    TestBed.configureTestingModule({
      imports: [AuditLogsList],
      providers: [{ provide: AuditLogsService, useValue: auditLogsService }],
    }).compileComponents();

    const fixture = TestBed.createComponent(AuditLogsList);
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

    expect(auditLogsService.list).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('No permission to view page');
  });

  it('loads and displays events on init when authorized', () => {
    const fixture = setup();
    auditLogsService.list.mockReturnValue(
      of([
        {
          id: 'event-1',
          userId: 'user-1',
          eventType: 'login_succeeded',
          sourceIp: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          createdAt: '2026-01-01T00:00:00Z',
        },
      ]),
    );
    fixture.detectChanges();

    expect(auditLogsService.list).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('login_succeeded');
  });

  it('renders an em dash for null fields', () => {
    const fixture = setup();
    auditLogsService.list.mockReturnValue(
      of([
        {
          id: 'event-1',
          userId: null,
          eventType: 'login_failed',
          sourceIp: null,
          userAgent: null,
          createdAt: '2026-01-01T00:00:00Z',
        },
      ]),
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('—');
  });

  it('shows the empty state when there are no events', () => {
    const fixture = setup();
    auditLogsService.list.mockReturnValue(of([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No audit log events yet');
  });
});
```

- [ ] **Step 4: Add the route in `app.routes.ts`**

Find:

```typescript
      {
        path: 'settings/mfa',
        loadComponent: () =>
          import('./modules/auth/feature/mfa-setup/mfa-setup').then((m) => m.MfaSetup),
      },
```

Replace with:

```typescript
      {
        path: 'settings/mfa',
        loadComponent: () =>
          import('./modules/auth/feature/mfa-setup/mfa-setup').then((m) => m.MfaSetup),
      },
      {
        path: 'audit-logs',
        loadComponent: () =>
          import('./modules/audit-logs/feature/audit-logs-list/audit-logs-list').then(
            (m) => m.AuditLogsList,
          ),
      },
```

- [ ] **Step 5: Convert the sidebar placeholder to an active link**

Find (in `sidebar.html`):

```html
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
    routerLink="/audit-logs"
    routerLinkActive="bg-indigo-50 text-indigo-700 font-semibold"
    data-sidebar-item
    class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
  >
    <svg class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <rect x="5" y="3" width="14" height="18" rx="1.5"></rect>
      <line x1="8" y1="8" x2="16" y2="8"></line>
      <line x1="8" y1="12" x2="16" y2="12"></line>
      <line x1="8" y1="16" x2="12" y2="16"></line>
    </svg>
    Audit Logs
  </a>
```

- [ ] **Step 6: Run the spec**

Run: `npx jest audit-logs-list.spec`
Expected: PASS (4 tests)

- [ ] **Step 7: Run full verification**

```bash
npm test
```
Expected: PASS, all suites green.

```bash
npm run lint
```
Expected: no new errors (pre-existing unrelated warnings/errors from other in-flight branches may still appear depending on merge state — do not touch them).

```bash
npm run build
```
Expected: builds cleanly.

- [ ] **Step 8: Commit**

```bash
git add src/app/modules/audit-logs/feature src/app/app.routes.ts src/app/layouts/main-layout/sidebar/sidebar.html
git commit -m "feat: add audit logs list page"
```

---

## Final Step

After Task 2, use superpowers:finishing-a-development-branch to verify the full test suite one more time and present merge/PR/keep options.
