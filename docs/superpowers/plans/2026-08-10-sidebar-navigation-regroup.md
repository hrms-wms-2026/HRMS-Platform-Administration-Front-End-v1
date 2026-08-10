# Sidebar Navigation Regroup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the sidebar's flat 8-item list into 5 labeled sections (Platform, Access Control, Subscription & Billing, Platform Configuration, Security & Compliance), fixing the previous "Settings" link that hid two of the three built System Config screens.

**Architecture:** Pure static template restructure. No new component state, no backend calls, no new routes — every link already exists and is merged. `Sidebar` stays a fully stateless component.

**Tech Stack:** Angular 21, Jest.

## Global Constraints

- No new routes, no route renames — only which section label a link sits under changes.
- Payment Gateways renders as a plain disabled row (grey, non-clickable `<span>`, no badge, no "Coming Soon" text) — matches this codebase's existing pre-built-screen disabled-item convention.
- No nav entry anywhere for Integrations, Support Center, or System Control — those pillars have no screens yet.
- Repo root: `C:\Users\User\OneDrive\Desktop\onexso\platform-administration`. Branch: `feature/sidebar-navigation-regroup` (already created off up-to-date `origin/development`, spec already committed there).

---

### Task 1: Regroup the sidebar

**Files:**
- Modify: `src/app/layouts/main-layout/sidebar/sidebar.html`
- Modify: `src/app/layouts/main-layout/sidebar/sidebar.spec.ts`

**Interfaces:**
- None — `Sidebar` (`sidebar.ts`) is unchanged, still a stateless component with no inputs/outputs.

- [ ] **Step 1: Replace `sidebar.spec.ts`**

```typescript
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { Sidebar } from './sidebar';

describe('Sidebar', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the ONEXSO logo icon and wordmark', () => {
    const fixture = setup();
    const images = fixture.debugElement.queryAll(By.css('img'));
    const srcs = images.map((img) => img.nativeElement.getAttribute('src'));

    expect(srcs).toContain('onexso-logo-icon.svg');
    expect(srcs).toContain('onexso-logo-text.svg');
  });

  it('renders all five section labels', () => {
    const fixture = setup();
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Platform');
    expect(text).toContain('Access Control');
    expect(text).toContain('Subscription & Billing');
    expect(text).toContain('Platform Configuration');
    expect(text).toContain('Security & Compliance');
  });

  it('renders all built screens as real navigable links', () => {
    const fixture = setup();
    const links = fixture.debugElement.queryAll(By.css('a'));
    const hrefs = links.map((link) => link.nativeElement.getAttribute('href'));

    expect(hrefs).toContain('/');
    expect(hrefs).toContain('/tenants');
    expect(hrefs).toContain('/users');
    expect(hrefs).toContain('/roles');
    expect(hrefs).toContain('/subscription-plans');
    expect(hrefs).toContain('/system-config/providers');
    expect(hrefs).toContain('/system-config/service-keys');
    expect(hrefs).toContain('/system-config/oauth-apps');
    expect(hrefs).toContain('/audit-logs');
  });

  it('renders Payment Gateways as non-navigable', () => {
    const fixture = setup();
    const item = fixture.debugElement
      .queryAll(By.css('[data-sidebar-item]'))
      .find((el) => el.nativeElement.textContent.includes('Payment Gateways'));

    expect(item).toBeTruthy();
    expect(item!.nativeElement.querySelector('a')).toBeNull();
    expect(item!.nativeElement.tagName.toLowerCase()).toBe('span');
  });
});
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `npx jest sidebar.spec`
Expected: FAIL — current `sidebar.html` doesn't have the new section labels or the `/system-config/providers`/`/system-config/oauth-apps` links yet.

- [ ] **Step 3: Replace `sidebar.html`**

```html
<aside class="flex w-56 flex-col gap-1 overflow-y-auto border-r border-slate-200 bg-white p-4">
  <div class="mb-4 flex items-center gap-2 px-1">
    <img src="onexso-logo-icon.svg" alt="" class="h-8 w-auto" />
    <img src="onexso-logo-text.svg" alt="ONEXSO" class="h-5 w-auto" />
  </div>

  <p class="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Platform</p>

  <a
    routerLink="/"
    routerLinkActive="bg-indigo-50 text-indigo-700 font-semibold"
    [routerLinkActiveOptions]="{ exact: true }"
    data-sidebar-item
    class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
  >
    <svg class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="8" height="8" rx="1.5"></rect>
      <rect x="13" y="3" width="8" height="8" rx="1.5"></rect>
      <rect x="3" y="13" width="8" height="8" rx="1.5"></rect>
      <rect x="13" y="13" width="8" height="8" rx="1.5"></rect>
    </svg>
    Dashboard
  </a>
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

  <p class="mb-1 mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Access Control</p>

  <a
    routerLink="/users"
    routerLinkActive="bg-indigo-50 text-indigo-700 font-semibold"
    data-sidebar-item
    class="flex items-center gap-3 rounded-lg px-3 py-2 pl-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
  >
    <svg class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <circle cx="9" cy="8" r="3"></circle>
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"></path>
      <circle cx="17" cy="9" r="2.5"></circle>
      <path d="M15.5 14a5 5 0 0 1 4.5 5.5"></path>
    </svg>
    Users
  </a>
  <a
    routerLink="/roles"
    routerLinkActive="bg-indigo-50 text-indigo-700 font-semibold"
    data-sidebar-item
    class="flex items-center gap-3 rounded-lg px-3 py-2 pl-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
  >
    <svg class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z"></path>
    </svg>
    Roles
  </a>

  <p class="mb-1 mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Subscription &amp; Billing</p>

  <a
    routerLink="/subscription-plans"
    routerLinkActive="bg-indigo-50 text-indigo-700 font-semibold"
    data-sidebar-item
    class="flex items-center gap-3 rounded-lg px-3 py-2 pl-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
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

  <p class="mb-1 mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Platform Configuration</p>

  <a
    routerLink="/system-config/providers"
    routerLinkActive="bg-indigo-50 text-indigo-700 font-semibold"
    data-sidebar-item
    class="flex items-center gap-3 rounded-lg px-3 py-2 pl-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
  >
    <svg class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <rect x="4" y="4" width="16" height="4" rx="1"></rect>
      <rect x="4" y="10" width="16" height="4" rx="1"></rect>
      <rect x="4" y="16" width="16" height="4" rx="1"></rect>
    </svg>
    Providers Overview
  </a>
  <a
    routerLink="/system-config/service-keys"
    routerLinkActive="bg-indigo-50 text-indigo-700 font-semibold"
    data-sidebar-item
    class="flex items-center gap-3 rounded-lg px-3 py-2 pl-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
  >
    <svg class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <line x1="4" y1="6" x2="20" y2="6"></line>
      <circle cx="9" cy="6" r="2" fill="currentColor" stroke="none"></circle>
      <line x1="4" y1="12" x2="20" y2="12"></line>
      <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none"></circle>
      <line x1="4" y1="18" x2="20" y2="18"></line>
      <circle cx="11" cy="18" r="2" fill="currentColor" stroke="none"></circle>
    </svg>
    Service Keys
  </a>
  <a
    routerLink="/system-config/oauth-apps"
    routerLinkActive="bg-indigo-50 text-indigo-700 font-semibold"
    data-sidebar-item
    class="flex items-center gap-3 rounded-lg px-3 py-2 pl-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
  >
    <svg class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path d="M9 12h6"></path>
      <path d="M8 8h1a4 4 0 0 1 0 8H8"></path>
      <path d="M16 8h-1a4 4 0 0 0 0 8h1"></path>
    </svg>
    OAuth Apps
  </a>
  <span
    data-sidebar-item
    class="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 pl-4 text-sm font-medium text-slate-400"
  >
    <svg class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <rect x="3" y="6" width="18" height="12" rx="2"></rect>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
    Payment Gateways
  </span>

  <p class="mb-1 mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Security &amp; Compliance</p>

  <a
    routerLink="/audit-logs"
    routerLinkActive="bg-indigo-50 text-indigo-700 font-semibold"
    data-sidebar-item
    class="flex items-center gap-3 rounded-lg px-3 py-2 pl-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
  >
    <svg class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <rect x="5" y="3" width="14" height="18" rx="1.5"></rect>
      <line x1="8" y1="8" x2="16" y2="8"></line>
      <line x1="8" y1="12" x2="16" y2="12"></line>
      <line x1="8" y1="16" x2="12" y2="16"></line>
    </svg>
    Audit Logs
  </a>
</aside>
```

- [ ] **Step 4: Run the spec to verify it passes**

Run: `npx jest sidebar.spec`
Expected: PASS (5 tests)

- [ ] **Step 5: Run full verification**

```bash
npm test
```
Expected: PASS, all suites green.

```bash
npm run lint
```
Expected: no new errors (pre-existing unrelated `tenant-wizard.html`/`modal.ts`/`user-profile-drawer.html`/`oauth-app-detail-drawer.html` issues may still appear — do not touch them).

```bash
npm run build
```
Expected: builds cleanly.

- [ ] **Step 6: Commit**

```bash
git add src/app/layouts/main-layout/sidebar/sidebar.html src/app/layouts/main-layout/sidebar/sidebar.spec.ts
git commit -m "feat: regroup sidebar navigation into labeled sections"
```

---

## Final Step

After Task 1, use superpowers:finishing-a-development-branch to verify the full test suite one more time and present merge/PR/keep options.
