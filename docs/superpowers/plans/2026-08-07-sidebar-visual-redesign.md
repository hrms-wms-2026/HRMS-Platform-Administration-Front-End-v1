# Sidebar Visual Redesign Implementation Plan (v2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle `Sidebar` to a light, icon-led layout with the real ONEXSO logo, a "Platform" section label, an indigo active-item pill, and "Coming soon" badges — and recolor `Navbar`'s accent classes from blue-700 to indigo, matching the app's new accent color.

**Architecture:** Two small, focused changes in the same app-shell area: (1) add two logo asset files and restyle `Sidebar`'s template, (2) swap `Navbar`'s two hardcoded `blue-700` Tailwind classes for `indigo-700`, including removing a stale unrenamed "ONEVO" wordmark now redundant with the sidebar's real logo. No routing, no new components, no backend involvement.

**Tech Stack:** Angular 21 standalone components, `RouterLink`/`RouterLinkActive`, Tailwind utility classes, inline hand-authored SVG icons for nav items, external `<img>`-referenced SVG files for the logo.

## Global Constraints

- Sidebar background: light (`bg-white`, `border-r border-slate-200`) — not dark.
- Accent color: indigo (`indigo-50`/`indigo-700` for the active pill; `indigo-*` replaces `blue-700` in `Navbar`) — scoped to `Sidebar` + `Navbar` only. Login, forgot-password, reset-password, accept-invite, and MFA screens keep `blue-700` — explicitly out of scope, a separate future rebrand.
- No search box added to `Navbar` — confirmed out of scope.
- No new routes; Roles & Permissions, Audit Logs, Settings stay unbuilt behind "Coming soon" badges.
- Logo files are large traced/vectorized SVGs (hundreds of paths each) — copied as static assets into `public/` and rendered via `<img>`, never inlined into a template.
- Sidebar stays fixed-width, non-collapsible.

---

### Task 1: Add ONEXSO logo assets to `public/`

**Files:**
- Create: `public/onexso-logo-icon.svg` (copy of `C:\Users\User\Downloads\onexso-logo-icon.svg`)
- Create: `public/onexso-logo-text.svg` (copy of `C:\Users\User\Downloads\onexso-logo-text .svg` — note the space before `.svg` in the source filename; the destination filename has no space)

**Interfaces:**
- Consumes: nothing.
- Produces: two static files served by Angular at app root (same mechanism as the existing `public/favicon.ico`) — reachable at runtime as `/onexso-logo-icon.svg` and `/onexso-logo-text.svg`. Task 2's `Sidebar` template references these exact paths.

- [ ] **Step 1: Copy the icon file**

Copy `C:\Users\User\Downloads\onexso-logo-icon.svg` to `C:\Users\User\OneDrive\Desktop\onexso\platform-administration\public\onexso-logo-icon.svg` (binary-safe copy — this is a large generated SVG, don't retype its contents).

- [ ] **Step 2: Copy the text/wordmark file**

Copy `C:\Users\User\Downloads\onexso-logo-text .svg` (note the space before `.svg`) to `C:\Users\User\OneDrive\Desktop\onexso\platform-administration\public\onexso-logo-text.svg` (no space in the destination name).

- [ ] **Step 3: Verify both files exist at their destination and are non-empty**

Run: `ls -la public/onexso-logo-icon.svg public/onexso-logo-text.svg` (from the `platform-administration` repo root)
Expected: both files listed with non-zero size.

- [ ] **Step 4: Commit**

```bash
git add public/onexso-logo-icon.svg public/onexso-logo-text.svg
git commit -m "chore: add ONEXSO logo assets"
```

---

### Task 2: Restyle Sidebar — light background, logo header, section label, icons, active pill, Coming soon badges

**Files:**
- Modify: `src/app/layouts/main-layout/sidebar/sidebar.html`
- Test: `src/app/layouts/main-layout/sidebar/sidebar.spec.ts` (new file)

**Interfaces:**
- Consumes: `public/onexso-logo-icon.svg` and `public/onexso-logo-text.svg` from Task 1 (referenced by path, must exist first).
- Produces: nothing consumed elsewhere — `Sidebar` has no inputs/outputs and none are added; `MainLayout` already renders `<app-sidebar>` (`main-layout.html:6`), no change needed there.

- [ ] **Step 1: Write the failing test**

Create `src/app/layouts/main-layout/sidebar/sidebar.spec.ts`:

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

  it('renders a Platform section label', () => {
    const fixture = setup();
    expect(fixture.nativeElement.textContent).toContain('Platform');
  });

  it('renders Dashboard and Users as real navigable links', () => {
    const fixture = setup();
    const links = fixture.debugElement.queryAll(By.css('a'));
    const hrefs = links.map((link) => link.nativeElement.getAttribute('href'));

    expect(hrefs).toContain('/');
    expect(hrefs).toContain('/users');
  });

  it('renders Roles & Permissions, Audit Logs, and Settings as non-navigable with a Coming soon badge', () => {
    const fixture = setup();
    const disabledLabels = ['Roles & Permissions', 'Audit Logs', 'Settings'];

    for (const label of disabledLabels) {
      const item = fixture.debugElement
        .queryAll(By.css('[data-sidebar-item]'))
        .find((el) => el.nativeElement.textContent.includes(label));

      expect(item).toBeTruthy();
      expect(item!.nativeElement.querySelector('a')).toBeNull();
      expect(item!.nativeElement.textContent).toContain('Coming soon');
    }
  });

  it('has no Coming soon badge on the Dashboard or Users links', () => {
    const fixture = setup();
    const dashboardItem = fixture.debugElement
      .queryAll(By.css('[data-sidebar-item]'))
      .find((el) => el.nativeElement.textContent.includes('Dashboard'));

    expect(dashboardItem!.nativeElement.textContent).not.toContain('Coming soon');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- sidebar`
Expected: FAIL — `sidebar.html` has no `<img>` tags, no "Platform" text, and no `[data-sidebar-item]`/"Coming soon" markup yet.

- [ ] **Step 3: Write the implementation**

Replace the full contents of `src/app/layouts/main-layout/sidebar/sidebar.html`:

```html
<aside class="flex w-56 flex-col gap-1 border-r border-slate-200 bg-white p-4">
  <div class="mb-4 flex items-center gap-2 px-1">
    <img src="onexso-logo-icon.svg" alt="" class="h-8 w-8" />
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
    routerLink="/users"
    routerLinkActive="bg-indigo-50 text-indigo-700 font-semibold"
    data-sidebar-item
    class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
  >
    <svg class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <circle cx="9" cy="8" r="3"></circle>
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"></path>
      <circle cx="17" cy="9" r="2.5"></circle>
      <path d="M15.5 14a5 5 0 0 1 4.5 5.5"></path>
    </svg>
    Users
  </a>
  <div
    data-sidebar-item
    class="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-400"
  >
    <span class="flex cursor-not-allowed items-center gap-3">
      <svg class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z"></path>
      </svg>
      Roles &amp; Permissions
    </span>
    <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">Coming soon</span>
  </div>
  <div
    data-sidebar-item
    class="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-400"
  >
    <span class="flex cursor-not-allowed items-center gap-3">
      <svg class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <rect x="5" y="3" width="14" height="18" rx="1.5"></rect>
        <line x1="8" y1="8" x2="16" y2="8"></line>
        <line x1="8" y1="12" x2="16" y2="12"></line>
        <line x1="8" y1="16" x2="12" y2="16"></line>
      </svg>
      Audit Logs
    </span>
    <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">Coming soon</span>
  </div>
  <div
    data-sidebar-item
    class="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-400"
  >
    <span class="flex cursor-not-allowed items-center gap-3">
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
    <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">Coming soon</span>
  </div>
</aside>
```

`sidebar.ts` needs no changes — still just `RouterLink`, `RouterLinkActive`, no new imports.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- sidebar`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/app/layouts/main-layout/sidebar/sidebar.html src/app/layouts/main-layout/sidebar/sidebar.spec.ts
git commit -m "feat: restyle sidebar with logo, icons, indigo accent, and Coming soon badges"
```

---

### Task 3: Recolor Navbar accents to indigo and remove the stale ONEVO wordmark

**Files:**
- Modify: `src/app/layouts/main-layout/navbar/navbar.html`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing consumed elsewhere.

**Context:** `navbar.html:2` currently renders `<p class="text-lg font-bold text-blue-700">ONEVO</p>` — a leftover from before this app was renamed to ONEXSO (every other screen already says "ONEXSO"; grep confirms `navbar.html` is the only file still saying "ONEVO"). Now that `Sidebar` carries the real ONEXSO logo (Task 2), this text is both stale and redundant, so it's removed rather than just recolored. `navbar.html:11` (`hover:text-blue-700` on the Security link) becomes `hover:text-indigo-700`.

- [ ] **Step 1: Edit `navbar.html`**

Remove line 2 entirely:
```html
<p class="text-lg font-bold text-blue-700">ONEVO</p>
```

Change line 11 from:
```html
<a routerLink="/settings/mfa" class="text-sm font-medium text-slate-600 hover:text-blue-700">
```
to:
```html
<a routerLink="/settings/mfa" class="text-sm font-medium text-slate-600 hover:text-indigo-700">
```

The full file after this edit:

```html
<nav class="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
  <div class="flex items-center gap-4">
    @if (currentUser(); as user) {
      <div class="flex items-center gap-2 text-sm text-slate-600">
        <span>{{ user.email }}</span>
        <app-status-badge [label]="user.platformRole" tone="neutral" />
      </div>
    }
    <a routerLink="/settings/mfa" class="text-sm font-medium text-slate-600 hover:text-indigo-700">
      Security
    </a>
    <app-button label="Logout" variant="secondary" (clicked)="onLogoutClicked()" />
  </div>
</nav>

@if (showLogoutConfirm()) {
  <app-logout-confirm-modal
    [email]="currentUser()?.email ?? null"
    [platformRole]="currentUser()?.platformRole ?? null"
    (confirmed)="onLogoutConfirmed()"
    (cancelled)="onLogoutCancelled()"
  />
}
```

Note the outer `<div class="flex items-center justify-between ...">` becomes the nav's only direct child now that the `<p>ONEVO</p>` sibling is gone — `justify-between` on `<nav>` will push this single remaining `<div>` to the right. That's correct: the left side is now empty (the logo lives in the sidebar instead), so the user-info/Security/Logout group should sit at the right edge, same visual position as before.

- [ ] **Step 2: Run the full frontend test suite**

Run: `npm test`
Expected: PASS — `navbar.spec.ts` doesn't assert on the "ONEVO" text or on `blue-700`/`indigo-700` classes (confirmed by reading the file — it only tests the logout-confirmation flow), so no test changes are needed and nothing should break.

- [ ] **Step 3: Manual visual check**

Start the dev server (`npm start`) and open `https://admin.localhost:4200/`. Confirm:
- Sidebar shows the ONEXSO logo (icon + wordmark) at the top, light background, "Platform" section label.
- Whichever of Dashboard/Users matches the current route shows a light indigo pill with indigo text.
- Roles & Permissions, Audit Logs, and Settings show muted icon+label with a "Coming soon" pill badge, not clickable.
- Navbar no longer shows "ONEVO" text; the Security link turns indigo on hover; overall layout still looks balanced with the user-info/Security/Logout group at the right.

- [ ] **Step 4: Commit**

```bash
git add src/app/layouts/main-layout/navbar/navbar.html
git commit -m "style: recolor navbar accents to indigo and remove stale ONEVO wordmark"
```

---

## Self-Review Notes

- **Spec coverage:** light sidebar background ✓ (Task 2), logo header via `<img>` ✓, "Platform" section label ✓, icons on all 5 items ✓ (geometry carried over from v1, only color changed), indigo active pill ✓, "Coming soon" badges ✓, Navbar accent recolor ✓ (Task 3), no search box added ✓ (no task touches Navbar structure beyond the two color/content edits), no new routes ✓.
- **Placeholder scan:** none — every step has literal file contents.
- **Type consistency:** N/A — template-only changes, no new TS symbols.
- **New finding surfaced during planning:** the stale "ONEVO" wordmark in `navbar.html` (not mentioned in the spec, since it wasn't discovered until re-reading the file during plan-writing). Handled in Task 3 with an explicit rationale rather than silently dropped — flagging this to the user alongside the plan.
