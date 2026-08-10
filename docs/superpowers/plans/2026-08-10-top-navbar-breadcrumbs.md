# Top Navbar Breadcrumbs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a route-driven `Breadcrumb` component to the navbar, and relocate the ONEXSO logo from the sidebar into the navbar next to it.

**Architecture:** Every route under the main layout gets a `data.breadcrumb` entry (one of three shapes: section+page, section+clickable-parent+page, or a standalone single page). A new `Breadcrumb` component walks `ActivatedRoute` down to its deepest child on every `NavigationEnd` and renders whatever shape it finds. The navbar becomes `justify-between`: logo + breadcrumb on the left, the existing profile-menu on the right.

**Tech Stack:** Angular 21 signals, `Router`/`ActivatedRoute`/`RouterLink`, RxJS `filter`, Tailwind CSS, Jest + Angular `TestBed`.

## Global Constraints

- Section labels in breadcrumb data must exactly match the sidebar's current wording for every group except Platform Configuration: "Platform", "Access Control", "Subscription & Billing", "Security & Compliance". The three `system-config/*` routes use the full approved terminology instead — section "Platform Configuration", and the providers page reads "Providers Overview" (not the sidebar's shortened "Providers") — since the breadcrumb's flexible-width navbar doesn't share the sidebar's fixed-column text-wrap constraint. Route paths and folder names keep using `system-config` regardless; this is a display-label difference only.
- Detail-page breadcrumbs use a static page label (e.g. "Tenant Details") — never a fetched entity name.
- `/access-denied` gets no `data.breadcrumb` at all; the component must render nothing (not an empty `<nav>`) when a route has no breadcrumb data.
- `/settings/mfa` gets a single-segment breadcrumb (`page` only, no `section`, no `parent`).
- The logo moves out of `sidebar.html` entirely — no duplicate logo left behind.
- Full `npm test` / `npm run lint` / `npm run build` must stay clean, per this project's established verification convention.

---

### Task 1: Breadcrumb data model and component

**Files:**
- Create: `src/app/layouts/main-layout/breadcrumb/breadcrumb.model.ts`
- Create: `src/app/layouts/main-layout/breadcrumb/breadcrumb.ts`
- Create: `src/app/layouts/main-layout/breadcrumb/breadcrumb.html`
- Test: `src/app/layouts/main-layout/breadcrumb/breadcrumb.spec.ts`

**Interfaces:**
- Produces (consumed by Task 2's `app.routes.ts` changes): `interface BreadcrumbData { section?: string; parent?: { label: string; route: string }; page: string }`, and the `Breadcrumb` component (selector `app-breadcrumb`) that reads `data['breadcrumb']` typed as `BreadcrumbData` from the active route.

- [ ] **Step 1: Write the failing test**

Create `src/app/layouts/main-layout/breadcrumb/breadcrumb.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { Breadcrumb } from './breadcrumb';

describe('Breadcrumb', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [Breadcrumb],
      providers: [
        provideRouter([
          { path: '', data: { breadcrumb: { section: 'Platform', page: 'Dashboard' } }, children: [] },
          { path: 'tenants', data: { breadcrumb: { section: 'Platform', page: 'Tenants' } }, children: [] },
          {
            path: 'tenants/:id',
            data: {
              breadcrumb: {
                section: 'Platform',
                parent: { label: 'Tenants', route: '/tenants' },
                page: 'Tenant Details',
              },
            },
            children: [],
          },
          { path: 'settings/mfa', data: { breadcrumb: { page: 'Two-Factor Authentication' } }, children: [] },
          { path: 'access-denied', children: [] },
        ]),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(Breadcrumb);
    const router = TestBed.inject(Router);
    fixture.detectChanges();
    return { fixture, router };
  }

  it('renders section and page for a top-level route with no parent link', async () => {
    const { fixture, router } = setup();
    await router.navigateByUrl('/tenants');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Platform');
    expect(text).toContain('Tenants');
    expect(fixture.debugElement.queryAll(By.css('a')).length).toBe(0);
  });

  it('renders section, a clickable parent link, and the current page for a detail route', async () => {
    const { fixture, router } = setup();
    await router.navigateByUrl('/tenants/abc123');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Platform');
    expect(text).toContain('Tenants');
    expect(text).toContain('Tenant Details');

    const parentLink = fixture.debugElement.query(By.css('a'));
    expect(parentLink.nativeElement.getAttribute('href')).toBe('/tenants');
  });

  it('renders a single segment with no section for a standalone route', async () => {
    const { fixture, router } = setup();
    await router.navigateByUrl('/settings/mfa');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe('Two-Factor Authentication');
  });

  it('renders nothing for a route with no breadcrumb data', async () => {
    const { fixture, router } = setup();
    await router.navigateByUrl('/access-denied');
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('nav'))).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest breadcrumb.spec -t Breadcrumb`
Expected: FAIL — `./breadcrumb` module doesn't exist yet.

- [ ] **Step 3: Create the data model**

Create `src/app/layouts/main-layout/breadcrumb/breadcrumb.model.ts`:

```ts
export interface BreadcrumbData {
  section?: string;
  parent?: { label: string; route: string };
  page: string;
}
```

- [ ] **Step 4: Implement the component**

Create `src/app/layouts/main-layout/breadcrumb/breadcrumb.ts`:

```ts
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';
import type { BreadcrumbData } from './breadcrumb.model';

@Component({
  selector: 'app-breadcrumb',
  imports: [RouterLink],
  templateUrl: './breadcrumb.html',
})
export class Breadcrumb {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);

  protected readonly crumb = signal<BreadcrumbData | null>(this.readCrumb());

  constructor() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.crumb.set(this.readCrumb());
    });
  }

  private readCrumb(): BreadcrumbData | null {
    let route = this.activatedRoute.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return (route.snapshot.data['breadcrumb'] as BreadcrumbData | undefined) ?? null;
  }
}
```

Create `src/app/layouts/main-layout/breadcrumb/breadcrumb.html`:

```html
@if (crumb(); as c) {
  <nav aria-label="Breadcrumb" class="flex items-center gap-1.5 text-sm text-slate-500">
    @if (c.section) {
      <span>{{ c.section }}</span>
      <span aria-hidden="true">/</span>
    }
    @if (c.parent) {
      <a [routerLink]="c.parent.route" class="hover:text-slate-700 hover:underline">{{ c.parent.label }}</a>
      <span aria-hidden="true">/</span>
    }
    <span class="font-medium text-slate-900">{{ c.page }}</span>
  </nav>
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest breadcrumb.spec`
Expected: PASS — all 4 tests.

- [ ] **Step 6: Commit**

```bash
git add src/app/layouts/main-layout/breadcrumb/
git commit -m "feat: add route-driven Breadcrumb component"
```

---

### Task 2: Wire breadcrumb into the navbar, move the logo, add route data, verify

**Files:**
- Modify: `src/app/app.routes.ts`
- Modify: `src/app/layouts/main-layout/navbar/navbar.ts`
- Modify: `src/app/layouts/main-layout/navbar/navbar.html`
- Modify: `src/app/layouts/main-layout/navbar/navbar.spec.ts`
- Modify: `src/app/layouts/main-layout/sidebar/sidebar.html`
- Modify: `src/app/layouts/main-layout/sidebar/sidebar.spec.ts`

**Interfaces:**
- Consumes (from Task 1): `Breadcrumb` component (selector `app-breadcrumb`), `BreadcrumbData` shape for the route `data.breadcrumb` values added here.

- [ ] **Step 1: Add breadcrumb data to every route**

Replace the full contents of `src/app/app.routes.ts` with:

```ts
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layouts/main-layout/main-layout').then((m) => m.MainLayout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        data: { breadcrumb: { section: 'Platform', page: 'Dashboard' } },
        loadComponent: () =>
          import('./modules/dashboard/feature/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'tenants',
        data: { breadcrumb: { section: 'Platform', page: 'Tenants' } },
        loadComponent: () =>
          import('./modules/tenants/feature/tenants-list/tenants-list').then((m) => m.TenantsList),
      },
      {
        path: 'tenants/new',
        data: {
          breadcrumb: {
            section: 'Platform',
            parent: { label: 'Tenants', route: '/tenants' },
            page: 'New Tenant',
          },
        },
        loadComponent: () =>
          import('./modules/tenants/feature/tenant-wizard/tenant-wizard').then((m) => m.TenantWizard),
      },
      {
        path: 'tenants/:id',
        data: {
          breadcrumb: {
            section: 'Platform',
            parent: { label: 'Tenants', route: '/tenants' },
            page: 'Tenant Details',
          },
        },
        loadComponent: () =>
          import('./modules/tenants/feature/tenant-detail/tenant-detail').then((m) => m.TenantDetailComponent),
      },
      {
        path: 'roles',
        data: { breadcrumb: { section: 'Access Control', page: 'Roles' } },
        loadComponent: () =>
          import('./modules/roles/feature/roles-list/roles-list').then((m) => m.RolesList),
      },
      {
        path: 'roles/:id',
        data: {
          breadcrumb: {
            section: 'Access Control',
            parent: { label: 'Roles', route: '/roles' },
            page: 'Role Details',
          },
        },
        loadComponent: () =>
          import('./modules/roles/feature/role-detail/role-detail').then((m) => m.RoleDetail),
      },
      {
        path: 'subscription-plans',
        data: { breadcrumb: { section: 'Subscription & Billing', page: 'Subscription Plans' } },
        loadComponent: () =>
          import('./modules/subscription-plans/feature/subscription-plans-list/subscription-plans-list').then(
            (m) => m.SubscriptionPlansList,
          ),
      },
      {
        path: 'subscription-plans/new',
        data: {
          breadcrumb: {
            section: 'Subscription & Billing',
            parent: { label: 'Subscription Plans', route: '/subscription-plans' },
            page: 'New Plan',
          },
        },
        loadComponent: () =>
          import('./modules/subscription-plans/feature/subscription-plan-create/subscription-plan-create').then(
            (m) => m.SubscriptionPlanCreate,
          ),
      },
      {
        path: 'subscription-plans/:id',
        data: {
          breadcrumb: {
            section: 'Subscription & Billing',
            parent: { label: 'Subscription Plans', route: '/subscription-plans' },
            page: 'Plan Details',
          },
        },
        loadComponent: () =>
          import('./modules/subscription-plans/feature/subscription-plan-detail/subscription-plan-detail').then(
            (m) => m.SubscriptionPlanDetail,
          ),
      },
      {
        path: 'users',
        data: { breadcrumb: { section: 'Access Control', page: 'Users' } },
        loadComponent: () =>
          import('./modules/platform-users/feature/platform-users-list/platform-users-list').then(
            (m) => m.PlatformUsersList,
          ),
      },
      {
        path: 'settings/mfa',
        data: { breadcrumb: { page: 'Two-Factor Authentication' } },
        loadComponent: () =>
          import('./modules/auth/feature/mfa-setup/mfa-setup').then((m) => m.MfaSetup),
      },
      {
        path: 'access-denied',
        loadComponent: () =>
          import('./modules/shared/feature/access-denied/access-denied').then(
            (m) => m.AccessDenied,
          ),
      },
      {
        path: 'audit-logs',
        data: { breadcrumb: { section: 'Security & Compliance', page: 'Audit Logs' } },
        loadComponent: () =>
          import('./modules/audit-logs/feature/audit-logs-list/audit-logs-list').then(
            (m) => m.AuditLogsList,
          ),
      },
      {
        path: 'system-config/oauth-apps',
        data: { breadcrumb: { section: 'Platform Configuration', page: 'OAuth Apps' } },
        loadComponent: () =>
          import('./modules/system-config/feature/oauth-apps-list/oauth-apps-list').then(
            (m) => m.OAuthAppsList,
          ),
      },
      {
        path: 'system-config/service-keys',
        data: { breadcrumb: { section: 'Platform Configuration', page: 'Service Keys' } },
        loadComponent: () =>
          import('./modules/system-config/feature/service-keys-list/service-keys-list').then(
            (m) => m.ServiceKeysList,
          ),
      },
      {
        path: 'system-config/providers',
        data: { breadcrumb: { section: 'Platform Configuration', page: 'Providers Overview' } },
        loadComponent: () =>
          import('./modules/system-config/feature/providers-overview/providers-overview').then(
            (m) => m.ProvidersOverview,
          ),
      },
    ],
  },
  {
    path: 'auth',
    loadComponent: () =>
      import('./layouts/auth-layout/auth-layout').then((m) => m.AuthLayout),
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./modules/auth/feature/login/login').then((m) => m.Login),
      },
      {
        path: 'mfa-verify',
        loadComponent: () =>
          import('./modules/auth/feature/mfa-verify/mfa-verify').then((m) => m.MfaVerify),
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./modules/auth/feature/forgot-password/forgot-password').then(
            (m) => m.ForgotPassword,
          ),
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./modules/auth/feature/reset-password/reset-password').then(
            (m) => m.ResetPassword,
          ),
      },
      {
        path: 'accept-invite',
        loadComponent: () =>
          import('./modules/auth/feature/accept-invite/accept-invite').then(
            (m) => m.AcceptInvite,
          ),
      },
    ],
  },
];
```

- [ ] **Step 2: Write the failing test for the navbar's new content**

Replace the full contents of `src/app/layouts/main-layout/navbar/navbar.spec.ts` with:

```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { Navbar } from './navbar';
import { AuthService } from '../../../core/auth/auth.service';
import { SessionService } from '../../../core/auth/session.service';

describe('Navbar', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [{ provide: AuthService, useValue: { logout: jest.fn() } }, provideRouter([]), SessionService],
    }).compileComponents();
  });

  it('renders the profile menu', () => {
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-profile-menu')).toBeTruthy();
  });

  it('renders the ONEXSO logo icon and wordmark', () => {
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();

    const images = fixture.debugElement.queryAll(By.css('img'));
    const srcs = images.map((img) => img.nativeElement.getAttribute('src'));

    expect(srcs).toContain('onexso-logo-icon.svg');
    expect(srcs).toContain('onexso-logo-text.svg');
  });

  it('renders the breadcrumb', () => {
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-breadcrumb')).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run test to verify the new assertions fail**

Run: `npx jest navbar.spec`
Expected: FAIL — `navbar.html` doesn't render a logo or `app-breadcrumb` yet. The pre-existing "renders the profile menu" test still PASSES.

- [ ] **Step 4: Wire the logo and breadcrumb into the navbar**

Replace the full contents of `src/app/layouts/main-layout/navbar/navbar.ts` with:

```ts
import { Component } from '@angular/core';
import { ProfileMenu } from '../profile-menu/profile-menu';
import { Breadcrumb } from '../breadcrumb/breadcrumb';

@Component({
  selector: 'app-navbar',
  imports: [ProfileMenu, Breadcrumb],
  templateUrl: './navbar.html',
})
export class Navbar {}
```

Replace the full contents of `src/app/layouts/main-layout/navbar/navbar.html` with:

```html
<nav class="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
  <div class="flex items-center gap-6">
    <div class="flex items-center gap-2">
      <img src="onexso-logo-icon.svg" alt="" class="h-7 w-auto" />
      <img src="onexso-logo-text.svg" alt="ONEXSO" class="h-4 w-auto" />
    </div>
    <app-breadcrumb />
  </div>
  <app-profile-menu />
</nav>
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest navbar.spec`
Expected: PASS — all 3 tests.

- [ ] **Step 6: Remove the logo from the sidebar**

In `src/app/layouts/main-layout/sidebar/sidebar.html`, delete the logo block at the top of `<aside>`:

Replace:
```html
<aside class="flex w-56 flex-col gap-1 overflow-y-auto border-r border-slate-200 bg-white p-4">
  <div class="mb-4 flex items-center gap-2 px-1">
    <img src="onexso-logo-icon.svg" alt="" class="h-8 w-auto" />
    <img src="onexso-logo-text.svg" alt="ONEXSO" class="h-5 w-auto" />
  </div>

  <p class="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Platform</p>
```
With:
```html
<aside class="flex w-56 flex-col gap-1 overflow-y-auto border-r border-slate-200 bg-white p-4">
  <p class="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Platform</p>
```

In `src/app/layouts/main-layout/sidebar/sidebar.spec.ts`, delete the now-obsolete logo test:

Replace:
```ts
  it('renders the ONEXSO logo icon and wordmark', () => {
    const fixture = setup();
    const images = fixture.debugElement.queryAll(By.css('img'));
    const srcs = images.map((img) => img.nativeElement.getAttribute('src'));

    expect(srcs).toContain('onexso-logo-icon.svg');
    expect(srcs).toContain('onexso-logo-text.svg');
  });

  it('renders all five section labels', () => {
```
With:
```ts
  it('renders all five section labels', () => {
```

- [ ] **Step 7: Run the full test suite**

Run: `npm test`
Expected: All suites pass — the sidebar suite loses one test (now 3 instead of 4), the navbar suite gains two (now 3), the breadcrumb suite adds 4 new tests, and every other suite is unaffected.

- [ ] **Step 8: Commit**

```bash
git add src/app/app.routes.ts src/app/layouts/main-layout/navbar/ src/app/layouts/main-layout/sidebar/sidebar.html src/app/layouts/main-layout/sidebar/sidebar.spec.ts
git commit -m "feat: wire breadcrumbs into navbar and relocate logo from sidebar"
```

- [ ] **Step 9: Full verification**

Run in order:
```bash
npm test
npm run lint
npm run build
```
Expected: `npm test` all suites passing; `npm run lint` shows only the same pre-existing unrelated baseline errors already present in this codebase (tenant-wizard.html, modal.ts, user-profile-drawer.html, oauth-app-detail-drawer.html); `npm run build` completes cleanly.

- [ ] **Step 10: Live browser smoke test**

Log in, confirm the logo now renders in the top navbar (not the sidebar) and the sidebar's first visible content is the "Platform" section label. Visit a top-level page (e.g. Tenants) and confirm the breadcrumb reads "Platform / Tenants" with no clickable segment. Visit a tenant's detail page and confirm the breadcrumb reads "Platform / Tenants / Tenant Details" with "Tenants" clickable back to `/tenants`. Visit `/settings/mfa` via the profile menu and confirm the breadcrumb reads just "Two-Factor Authentication". Visit each System Config page and confirm "Platform Configuration / <page>" (Providers specifically reads "Platform Configuration / Providers Overview", not "Providers"). Confirm no breadcrumb renders (or crashes) on `/access-denied`.

- [ ] **Step 11: Finish the branch**

**REQUIRED SUB-SKILL:** Use superpowers:finishing-a-development-branch to verify tests, present merge/PR/keep options, and execute the chosen option. Note: this branch was forked from `development` directly — the base branch for merge/PR is `development`, not `feature/sidebar-collapse-flyout` or `feature/providers-overview-card-redesign` (those remain independent, unmerged branches).
