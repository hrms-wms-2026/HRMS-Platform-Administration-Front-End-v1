# Navbar Profile Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the navbar's standalone email/badge/Security-link/Logout-button row with a single profile avatar that opens a dropdown containing identity info, a Settings link, and Logout.

**Architecture:** A new `ProfileMenu` component owns the avatar button, the dropdown panel, outside-click/Escape-to-close behavior, and the existing logout-confirmation flow (moved from `Navbar`, not rewritten). `Navbar` becomes a thin host with no injected services, rendering only `<app-profile-menu />`.

**Tech Stack:** Angular 21 (signals, `HostListener`), Jest.

## Global Constraints

- No new settings page — the dropdown's "Settings" entry points to the existing `/settings/mfa` route (currently reachable via the navbar's standalone "Security" link, which is removed).
- The sidebar's disabled "Settings" placeholder is out of scope — do not touch `sidebar.html`.
- No avatar photo upload — avatar shows initials derived from the real authenticated user's email via `SessionService.currentUser`, matching the existing 2-letter initials convention already used in `LogoutConfirmModal` (`email.slice(0, 2).toUpperCase()`), not a fabricated or hardcoded name.
- Repo root: `C:\Users\User\OneDrive\Desktop\onexso\platform-administration`. Branch: `feature/navbar-profile-menu` (already created off up-to-date `origin/development`, spec already committed there).

---

### Task 1: `ProfileMenu` component

**Files:**
- Create: `src/app/layouts/main-layout/profile-menu/profile-menu.ts`
- Create: `src/app/layouts/main-layout/profile-menu/profile-menu.html`
- Create: `src/app/layouts/main-layout/profile-menu/profile-menu.spec.ts`

**Interfaces:**
- Consumes: `SessionService.currentUser` (existing, returns `Signal<CurrentUser | null>` where `CurrentUser = { id: string; email: string; platformRole: string }`), `AuthService.logout(): Observable<void>` (existing), `LogoutConfirmModal` (existing component at `../logout-confirm-modal/logout-confirm-modal`, inputs `email: string | null`, `platformRole: string | null`, outputs `confirmed`, `cancelled`).
- Produces: `ProfileMenu` component, selector `app-profile-menu`, no inputs/outputs. Task 2 consumes this selector directly in `navbar.html`.

- [ ] **Step 1: Write the failing spec**

```typescript
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ProfileMenu } from './profile-menu';
import { AuthService } from '../../../core/auth/auth.service';
import { SessionService } from '../../../core/auth/session.service';

describe('ProfileMenu', () => {
  let authService: { logout: jest.Mock };
  let router: Router;
  let sessionService: SessionService;

  beforeEach(async () => {
    authService = { logout: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [ProfileMenu],
      providers: [{ provide: AuthService, useValue: authService }, provideRouter([]), SessionService],
    }).compileComponents();

    sessionService = TestBed.inject(SessionService);
    sessionService.setSession({
      userId: 'u1',
      email: 'dapiyshanth1908@gmail.com',
      platformRole: 'Platform Super Admin',
      expiresAt: '',
      mfaRequired: false,
      permissions: [],
      scopes: {},
      entitlements: [],
    });

    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  function createComponent() {
    const fixture = TestBed.createComponent(ProfileMenu);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the first two letters of the real user email as initials', () => {
    const fixture = createComponent();
    expect(fixture.nativeElement.textContent).toContain('DA');
  });

  it('is closed by default and opens when the avatar button is clicked', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    expect(component['open']()).toBe(false);

    const avatarButton: HTMLButtonElement = fixture.nativeElement.querySelector('[data-profile-avatar]');
    avatarButton.click();

    expect(component['open']()).toBe(true);
  });

  it('closes when a click happens outside the component', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['open'].set(true);

    document.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(component['open']()).toBe(false);
  });

  it('closes when Escape is pressed', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['open'].set(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(component['open']()).toBe(false);
  });

  it('has a Settings link pointing to /settings/mfa', () => {
    const fixture = createComponent();
    fixture.componentInstance['open'].set(true);
    fixture.detectChanges();

    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('[data-profile-settings-link]');
    expect(link.getAttribute('href')).toBe('/settings/mfa');
  });

  it('closes the dropdown and shows the logout confirmation modal on Logout click, without logging out immediately', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['open'].set(true);

    component['onLogoutClicked']();

    expect(component['open']()).toBe(false);
    expect(component['showLogoutConfirm']()).toBe(true);
    expect(authService.logout).not.toHaveBeenCalled();
  });

  it('logs out and navigates to login when the logout confirmation is confirmed', () => {
    authService.logout.mockReturnValue(of(undefined));
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['onLogoutClicked']();

    component['onLogoutConfirmed']();

    expect(component['showLogoutConfirm']()).toBe(false);
    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/auth/login');
  });

  it('closes the logout confirmation modal without logging out when cancelled', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['onLogoutClicked']();

    component['onLogoutCancelled']();

    expect(component['showLogoutConfirm']()).toBe(false);
    expect(authService.logout).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `npx jest profile-menu.spec`
Expected: FAIL — `Cannot find module './profile-menu'`

- [ ] **Step 3: Write `profile-menu.ts`**

```typescript
import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { SessionService } from '../../../core/auth/session.service';
import { StatusBadge } from '../../../shared/ui/status-badge/status-badge';
import { LogoutConfirmModal } from '../logout-confirm-modal/logout-confirm-modal';

@Component({
  selector: 'app-profile-menu',
  imports: [RouterLink, StatusBadge, LogoutConfirmModal],
  templateUrl: './profile-menu.html',
})
export class ProfileMenu {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly sessionService = inject(SessionService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  protected readonly currentUser = this.sessionService.currentUser;
  protected readonly initials = computed(() => {
    const email = this.currentUser()?.email;
    return email ? email.slice(0, 2).toUpperCase() : '?';
  });

  protected readonly open = signal(false);
  protected readonly showLogoutConfirm = signal(false);

  protected toggleOpen(): void {
    this.open.set(!this.open());
  }

  protected closeMenu(): void {
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.elementRef.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.open.set(false);
  }

  protected onLogoutClicked(): void {
    this.closeMenu();
    this.showLogoutConfirm.set(true);
  }

  protected onLogoutCancelled(): void {
    this.showLogoutConfirm.set(false);
  }

  protected onLogoutConfirmed(): void {
    this.showLogoutConfirm.set(false);
    this.authService.logout().subscribe({
      next: () => this.router.navigateByUrl('/auth/login'),
      error: () => this.router.navigateByUrl('/auth/login'),
    });
  }
}
```

- [ ] **Step 4: Write `profile-menu.html`**

```html
<div class="relative">
  <button
    type="button"
    data-profile-avatar
    (click)="toggleOpen()"
    class="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 hover:bg-blue-200"
  >
    {{ initials() }}
  </button>

  @if (open()) {
    <div class="absolute right-0 z-40 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
      @if (currentUser(); as user) {
        <div class="flex items-center gap-3 rounded-lg p-2">
          <span
            class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700"
          >
            {{ initials() }}
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-slate-900">{{ user.email }}</p>
            <app-status-badge [label]="user.platformRole" tone="indigo" />
          </div>
        </div>
        <hr class="my-2 border-slate-100" />
      }
      <a
        routerLink="/settings/mfa"
        data-profile-settings-link
        (click)="closeMenu()"
        class="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
      >
        Settings
      </a>
      <button
        type="button"
        data-profile-logout
        (click)="onLogoutClicked()"
        class="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-50"
      >
        Logout
      </button>
    </div>
  }
</div>

@if (showLogoutConfirm()) {
  <app-logout-confirm-modal
    [email]="currentUser()?.email ?? null"
    [platformRole]="currentUser()?.platformRole ?? null"
    (confirmed)="onLogoutConfirmed()"
    (cancelled)="onLogoutCancelled()"
  />
}
```

- [ ] **Step 5: Run the spec to verify it passes**

Run: `npx jest profile-menu.spec`
Expected: PASS (8 tests)

- [ ] **Step 6: Commit**

```bash
git add src/app/layouts/main-layout/profile-menu
git commit -m "feat: add profile menu with avatar dropdown"
```

---

### Task 2: Simplify `Navbar` to host `ProfileMenu` + full verification

**Files:**
- Modify: `src/app/layouts/main-layout/navbar/navbar.ts`
- Modify: `src/app/layouts/main-layout/navbar/navbar.html`
- Modify: `src/app/layouts/main-layout/navbar/navbar.spec.ts`

**Interfaces:**
- Consumes: `ProfileMenu` (Task 1), selector `app-profile-menu`.

- [ ] **Step 1: Replace `navbar.spec.ts`**

The old spec tested logout logic that now lives in `ProfileMenu` (covered by Task 1's spec). Replace it with a single smoke test:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
});
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `npx jest navbar.spec`
Expected: FAIL — `expect(...).toBeTruthy()` fails because the current `navbar.html` doesn't render an `app-profile-menu` element yet.

- [ ] **Step 3: Replace `navbar.ts`**

```typescript
import { Component } from '@angular/core';
import { ProfileMenu } from '../profile-menu/profile-menu';

@Component({
  selector: 'app-navbar',
  imports: [ProfileMenu],
  templateUrl: './navbar.html',
})
export class Navbar {}
```

- [ ] **Step 4: Replace `navbar.html`**

```html
<nav class="flex items-center justify-end border-b border-slate-200 bg-white px-6 py-3">
  <app-profile-menu />
</nav>
```

- [ ] **Step 5: Run the spec to verify it passes**

Run: `npx jest navbar.spec`
Expected: PASS (1 test)

- [ ] **Step 6: Run full verification**

```bash
npm test
```
Expected: PASS, all suites green (includes Task 1's 8 `ProfileMenu` tests and this task's 1 `Navbar` test).

```bash
npm run lint
```
Expected: no new errors (pre-existing unrelated `tenant-wizard.html`/`modal.ts` issues may still appear — do not touch them).

```bash
npm run build
```
Expected: builds cleanly.

- [ ] **Step 7: Commit**

```bash
git add src/app/layouts/main-layout/navbar
git commit -m "feat: simplify navbar to host the profile menu"
```

---

## Final Step

After Task 2, use superpowers:finishing-a-development-branch to verify the full test suite one more time and present merge/PR/keep options.
