# Access Restricted Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the existing `permissionGuard`/`entitlementGuard` a real `/access-denied` destination instead of a 404.

**Architecture:** One new standalone Angular component (`AccessDenied`) registered as a lazy-loaded child route under `MainLayout`, so it inherits `authGuard` and keeps the nav/sidebar chrome. No backend changes, no guard changes.

**Tech Stack:** Angular 21 standalone components, Reactive signals, Tailwind CSS utility classes, Jest + `@angular/core/testing` `TestBed`.

## Global Constraints

- Route path stays `/access-denied` (spec: don't touch the guards, which already redirect there).
- Message is generic — no permission code shown to the user (spec: avoid leaking internal RBAC detail; no route-state plumbing needed).
- Single action: "Go to Dashboard" button, `routerLink="/"`. No "Go Back" / browser-history option (spec: avoids redirect loops if the referring page is itself restricted).
- Reuse the existing `app-button` component as-is — no leading-icon support added to it (spec: out of scope).
- Icon: Heroicons "Shield Check", 24, solid (exact SVG below), colored `text-blue-700`, inside a `bg-blue-50 rounded-full` circular backdrop.
- Visual shell matches `login.html` / `forgot-password.html`: `rounded-2xl bg-white p-10 shadow-2xl`, `max-w-md`, slate/blue palette.

---

### Task 1: AccessDenied component

**Files:**
- Create: `src/app/modules/shared/feature/access-denied/access-denied.ts`
- Create: `src/app/modules/shared/feature/access-denied/access-denied.html`
- Create: `src/app/modules/shared/feature/access-denied/access-denied.css`
- Test: `src/app/modules/shared/feature/access-denied/access-denied.spec.ts`

**Interfaces:**
- Consumes: `Router` (Angular), `Button` from `../../../../shared/ui/button/button` (existing component — `app-button`, inputs: `label`, `variant`, `type`, `fullWidth`; no changes needed to `Button` itself).
- Produces: `AccessDenied` component class with a `goToDashboard(): void` method, exported for the route config in Task 2.

- [ ] **Step 1: Write the failing test**

```typescript
// src/app/modules/shared/feature/access-denied/access-denied.spec.ts
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AccessDenied } from './access-denied';

describe('AccessDenied', () => {
  let router: { navigateByUrl: jest.Mock };

  beforeEach(async () => {
    router = { navigateByUrl: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [AccessDenied],
      providers: [{ provide: Router, useValue: router }],
    }).compileComponents();
  });

  function createComponent() {
    const fixture = TestBed.createComponent(AccessDenied);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the Access Restricted heading and generic body copy', () => {
    const fixture = createComponent();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Access Restricted');
    expect(text).toContain("You don't have permission to view this page");
  });

  it('navigates to the dashboard when Go to Dashboard is clicked', () => {
    const fixture = createComponent();

    fixture.componentInstance.goToDashboard();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- access-denied`
Expected: FAIL — `Cannot find module './access-denied'` (the component doesn't exist yet).

- [ ] **Step 3: Write the component class**

```typescript
// src/app/modules/shared/feature/access-denied/access-denied.ts
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from '../../../../shared/ui/button/button';

@Component({
  selector: 'app-access-denied',
  imports: [Button],
  templateUrl: './access-denied.html',
  styleUrl: './access-denied.css',
})
export class AccessDenied {
  private readonly router = inject(Router);

  goToDashboard(): void {
    this.router.navigateByUrl('/');
  }
}
```

- [ ] **Step 4: Write the template**

```html
<!-- src/app/modules/shared/feature/access-denied/access-denied.html -->
<div class="flex justify-center">
  <div class="w-full max-w-md rounded-2xl bg-white p-10 text-center shadow-2xl">
    <div class="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-blue-50">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-12 text-blue-700">
        <path
          fill-rule="evenodd"
          d="M12.516 2.17a.75.75 0 0 0-1.032 0 11.209 11.209 0 0 1-7.877 3.08.75.75 0 0 0-.722.515A12.74 12.74 0 0 0 2.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 0 0 .374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 0 0-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08Zm3.094 8.016a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
          clip-rule="evenodd"
        />
      </svg>
    </div>

    <h1 class="text-2xl font-bold text-slate-900">Access Restricted</h1>
    <p class="mt-3 text-sm text-slate-500">
      You don't have permission to view this page. If you believe this is a mistake,
      contact your administrator.
    </p>

    <div class="mt-8">
      <app-button label="Go to Dashboard" (clicked)="goToDashboard()" />
    </div>
  </div>
</div>
```

- [ ] **Step 5: Write the (empty) CSS file**

```css
/* src/app/modules/shared/feature/access-denied/access-denied.css */
/* Styling is handled with Tailwind utility classes in access-denied.html */
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- access-denied`
Expected: PASS — both tests green.

- [ ] **Step 7: Commit**

```bash
git add src/app/modules/shared/feature/access-denied/
git commit -m "feat: add AccessDenied component"
```

---

### Task 2: Register the /access-denied route

**Files:**
- Modify: `src/app/app.routes.ts:10-29` (the `MainLayout` children array)

**Interfaces:**
- Consumes: `AccessDenied` from Task 1 (lazy-imported by path, not by direct class import, matching every other route entry in this file).
- Produces: nothing consumed by later tasks — this is the last task in this plan.

- [ ] **Step 1: Add the route entry**

In `src/app/app.routes.ts`, add a new child route to the `MainLayout` children array
(alongside `''`, `'users'`, `'settings/mfa'`):

```typescript
      {
        path: 'access-denied',
        loadComponent: () =>
          import('./modules/shared/feature/access-denied/access-denied').then(
            (m) => m.AccessDenied,
          ),
      },
```

The full children array becomes:

```typescript
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./modules/dashboard/feature/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./modules/platform-users/feature/platform-users-list/platform-users-list').then(
            (m) => m.PlatformUsersList,
          ),
      },
      {
        path: 'settings/mfa',
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
    ],
```

- [ ] **Step 2: Verify the app still builds**

Run: `npm run build`
Expected: build succeeds with no errors (confirms the lazy-import path resolves).

- [ ] **Step 3: Manual smoke check**

Run: `npm start`, sign in, then navigate the browser directly to
`https://admin.localhost:4200/access-denied`.
Expected: the Access Restricted card renders inside the normal app shell (navbar +
sidebar visible), and clicking "Go to Dashboard" returns to `/`.

- [ ] **Step 4: Commit**

```bash
git add src/app/app.routes.ts
git commit -m "feat: register /access-denied route"
```

---

## Self-Review Notes

- **Spec coverage:** trigger (permission-gated route) → Task 2 wires the route the
  guards already redirect to. Content (icon/heading/body/button) → Task 1. Route
  path `/access-denied` kept as-is → Task 2. Rendered inside `MainLayout` → Task 2
  (child of the `MainLayout` route, not `AuthLayout`). Generic message, no guard
  changes, no `Button` icon support → explicitly not touched by either task.
- **Placeholder scan:** no TBD/TODO; every step has literal code.
- **Type consistency:** `AccessDenied` class name and `goToDashboard()` method name
  match between Task 1 (definition) and Task 2 (route's `.then((m) => m.AccessDenied)`).
