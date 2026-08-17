# Platform Administration — Frontend Guide

Angular 21 (zoneless, signals, standalone components) admin frontend for the ONEVO platform.
This file exists so both Claude and any developer picks up the same conventions — read it before
adding new modules, services, or changing auth/permission code.

## Stack

- Angular 21, zoneless change detection, standalone components only (no NgModules)
- `@ngrx/signals` for state stores (not NgRx Store/Effects)
- Tailwind CSS v4 for styling (`@custom-variant dark (&:where(.dark, .dark *));` in
  `src/styles.css` — no `tailwind.config.js`, no component-scoped CSS files unless truly needed)
- Jest for unit tests, Playwright for e2e
- Session auth via HttpOnly cookies (`withCredentials: true` on every HTTP call) — **no tokens in
  localStorage/sessionStorage, ever**

## Folder structure

```
src/app/
├── core/
│   ├── auth/                AuthService, SessionService, SessionInitializerService, models
│   ├── permissions/          PermissionStore (NgRx Signal Store) — see Permissions section below
│   ├── guards/                authGuard, permissionGuard, entitlementGuard, roleGuard
│   ├── config/                 api-endpoints.ts (every backend route, one place)
│   ├── interceptors/            csrf.interceptor.ts, error.interceptor.ts, logging, etc.
│   ├── theme/                    ThemeService (light/dark, localStorage + prefers-color-scheme)
│   └── services/                   circuit-breaker, error-handler, logger, notification
├── layouts/
│   ├── auth-layout/          shell for /auth/* (login, mfa-verify, forgot/reset-password, invite)
│   └── main-layout/           shell for the authenticated app
│       ├── navbar/              logo, breadcrumb, search (disabled), notifications, profile menu,
│       │                        mobile hamburger button
│       ├── sidebar/              permission-filtered nav sections, off-canvas on mobile
│       ├── breadcrumb/            route-data-driven (see Navigation shell section)
│       ├── profile-menu/           theme toggle lives here
│       ├── logout-confirm-modal/
│       └── mobile-nav.service.ts  shared open/close + isDesktop state for navbar ⇄ sidebar
├── modules/                  one folder per business domain, each with feature/<screen-name>/
│   ├── tenants, platform-users, roles, subscription-plans, invoices,
│   ├── configuration-templates, role-templates, system-config, audit-logs,
│   ├── legal-compliance, module-catalog, dashboard, auth
├── shared/
│   ├── directives/            PermissionDirective (*appPermission — NOT fail-open, see below)
│   └── ui/                     Button, Modal, ConfirmationDialog, Table, Pagination, StatusBadge,
│                                EmptyState, ErrorBanner, TableSkeleton + domain skeleton variants,
│                                DateRangePicker, SearchableSelect, Loader, ToastContainer
└── environments/             environment.ts (dev), environment.prod.ts, environment.staging.ts
```

Rule of thumb: if it talks to the backend or holds app-wide state → `core/`. If it's a screen for
one business domain → `modules/<domain>/feature/<name>`. If it's dumb/reusable UI → `shared/ui/`.

## Logging

Only log at meaningful points — failures, auth/session state transitions, permission denials.
Never log routine success paths or every function entry/exit; excess logging buries the signal
you actually need when debugging a real issue.

Always gate with `environment.enableDebugLogs`, following the pattern already in
[`login.ts`](src/app/modules/auth/feature/login/login.ts):

```typescript
private logDebug(message: string, details: Record<string, unknown>): void {
  if (!environment.enableDebugLogs) return;
  console.debug(`[ComponentName] ${message}`, details);
}
```

HTTP-level logging (request/response, duration, correlation-id) belongs in the interceptor chain
(`core/interceptors/`), not scattered `console.log` calls per service.

## Data flow

### App bootstrap (session restore on page load)
```
provideAppInitializer (app.config.ts)
  → SessionInitializerService.initialize()
    → AuthService.loadContext()  [GET /admin/v1/auth/me, withCredentials]
      → success: SessionService.setSession() + PermissionStore.setAuthorizationContext()
      → failure (no cookie / 401): silently continue, isAuthenticated() stays false
  → router activates → authGuard on `/` redirects to /auth/login if not authenticated
```
`SessionInitializerService` wraps this call in a 3s `timeout()` so a hung backend never blocks
the shell from rendering the login screen.

### Login (with MFA)
```
Login component .submit()
  → AuthService.login({email, password})   [POST /admin/v1/auth/login, withCredentials]
    → mfa_required: true  → redirect to /auth/mfa-verify with the challenge
    → MfaVerify component .submit()
      → AuthService.verifyMfa({challenge, code})  [POST /admin/v1/auth/mfa/verify]
        → maps backend wire response → AuthContext (see mapping pattern below)
        → success: SessionService.setSession() + PermissionStore.setAuthorizationContext()
                   → router.navigateByUrl('/')
        → error: errorMessage signal set from HttpErrorResponse.status
```
TOTP codes are time-based (±90s window server-side) — "Invalid or expired code" after a backend
restart usually means the MFA *challenge* went stale, not the code; re-login from scratch rather
than retrying the same challenge.

### Logout
```
AuthService.logout()   [POST /admin/v1/auth/logout, withCredentials]
  → tap(): SessionService.clearSession() + PermissionStore.clear()
```

### Route protection
```
authGuard          → SessionService.isAuthenticated() → else redirect /auth/login
permissionGuard     → PermissionStore.canAccess(route.data['permission']) → else /access-denied
entitlementGuard    → PermissionStore.hasEntitlement(route.data['entitlement']) → else /access-denied
roleGuard           → SessionService.currentUser().platformRole vs route.data['roles'] → else /access-denied
```

## Permissions

Permission codes used in `route.data['permission']` and the sidebar nav config must match
`PlatformPermissionCatalog.cs` in the backend **exactly** (e.g. `platform.tenants.read`,
`platform.system_config.manage`) — don't invent new codes on the frontend.

**`PermissionStore.canAccess(permission?)` fails open**, unlike `hasPermission()`:
- no `permission` passed → always allowed (used for `Dashboard` and `/settings/mfa`, which stay
  reachable regardless of granular permissions)
- `permissions` array is empty (nothing loaded yet) → allowed
- `permissions` array is non-empty and lacks the code → denied → `/access-denied`

This is deliberate, not a bug: `canAccess` is what `permissionGuard` and the sidebar's visibility
filter both use, so a user whose role legitimately has zero platform permissions loaded isn't
locked out of the whole app. **`*appPermission` (the structural directive, for hiding in-page
manage buttons) still uses strict `hasPermission()` — no fail-open there.** That asymmetry is
intentional: route/nav-level gating protects navigation, in-page action buttons stay hidden until
a real permission is confirmed.

## Backend integration conventions

- **All endpoint paths live in `core/config/api-endpoints.ts`** — never hardcode a path string in
  a service.
- **Base URL comes from `environment.apiUrl`** (`https://localhost:7229/admin/v1` in dev) — never
  concatenate host/port elsewhere.
- **This app talks to the Admin API (`/admin/v1/...`), not the Tenant API (`/api/v1/...`).** They
  are separate controllers on the same backend. Hitting `/api/v1/*` from this app returns
  `400 Tenant context is not resolved` — that error means the request went to the wrong API
  surface, not that credentials are wrong.
- **Backend wire shape ≠ frontend model shape.** The admin API returns snake_case
  (`platform_user_id`, `platform_role`, `expires_at`); our models use camelCase. Map explicitly at
  the service boundary — see `toAuthContext()` in
  [`auth.service.ts`](src/app/core/auth/auth.service.ts) — never let snake_case leak past
  `AuthService`.
- A `404` from a guessed path is not proof a feature doesn't exist on the backend — the endpoint
  may simply live on a branch that hasn't merged to `development` yet. Check the backend repo's
  branches/PRs before concluding an endpoint is missing.

### CSRF cookie/header names (verified against live backend)
The admin API does **not** use the Angular-default `XSRF-TOKEN` cookie / `X-XSRF-TOKEN` header
convention. It sets a cookie named **`admin_csrf`** on login and expects it echoed back as an
**`X-CSRF-Token`** header on mutating requests (see backend's `CsrfProtectionMiddleware.cs`).
[`csrf.interceptor.ts`](src/app/core/interceptors/csrf.interceptor.ts) uses these exact names —
don't "helpfully" change them back to the Angular default. The session cookie itself
(`admin_session`) is HttpOnly and not readable from `document.cookie`, by design — only the CSRF
cookie needs to be JS-readable, for the double-submit-cookie pattern to work.

## Navigation shell (navbar / sidebar / breadcrumb)

- **Sidebar** (`layouts/main-layout/sidebar/`) is driven by a typed `NAV_SECTIONS` config in
  `sidebar.ts` — `{ label, route, icon, permission?, exact? }` items grouped into
  `{ label, indent, items }` sections. A `computed()` filters items via
  `PermissionStore.canAccess()` and drops any section left with zero visible items. Icons are
  plain inline SVGs selected via `@switch (item.icon)` in the template — add a new `@case` there
  when adding a nav item, don't introduce an icon-library dependency.
- **Breadcrumb** (`layouts/main-layout/breadcrumb/`) reads `route.data['breadcrumb']`
  (`{ section?, parent?: {label, route}, page }`) off the deepest activated route on every
  `NavigationEnd`. Every routed screen should set this in `app.routes.ts`.
- **Responsive shell**: `MobileNavService` (`layouts/main-layout/mobile-nav.service.ts`) is the
  single source of truth for whether the sidebar is open on mobile, shared between `Navbar` (the
  hamburger button, `lg:hidden`) and `Sidebar` (the off-canvas drawer + backdrop). Below `lg:`
  (1024px) the sidebar is `fixed`/off-canvas, closes on backdrop click, Escape, or any nav-link
  click. At `lg:` and above it's `position: static` with no overlay and no ARIA dialog semantics —
  `isDesktop` (via `matchMedia('(min-width: 1024px)')`, guarded for jsdom) gates `role="dialog"` /
  `aria-modal` / `aria-hidden` so they never leak onto the desktop layout.

## Component conventions

- `inject()` at class-field level, not constructor injection.
- Signals for local component state (`signal()`, `computed()`), not RxJS subjects, unless the
  value is inherently a stream (HTTP calls, router events).
- Reactive forms (`FormBuilder.nonNullable.group(...)`) for anything with validation, with inline
  `@if (control.invalid && control.touched) { <p>...</p> }` error rendering — a form that silently
  refuses to advance with no visible error is a real, recurring bug class here, not a hypothetical.
- Styling: Tailwind utility classes in the template; component `.css` files stay empty/minimal.
  Every new class needs a `dark:` counterpart — this app is dark-mode-complete, not dark-mode-optional.
- No `NgModule` — every component is standalone with an explicit `imports` array.

## Responsive design

**Every screen must be usable from mobile width up — this is not optional per feature, it's a
baseline requirement for every screen we build.** This is an admin panel so desktop is the primary
use case, but a screen that visibly breaks on a phone/tablet is not done. The shell itself
(navbar/sidebar) is responsive — see Navigation shell above; this section is about screen content.

Mobile-first with Tailwind breakpoints — write the base (unprefixed) classes for the smallest
screen, then override upward with `sm:` (≥640px) `md:` (≥768px) `lg:` (≥1024px) `xl:` (≥1280px):

```html
<!-- wrong: fixed width breaks below 320px -->
<div class="w-[320px] flex gap-8">

<!-- right: fluid on mobile, constrained on larger screens -->
<div class="w-full max-w-md flex flex-col gap-4 sm:flex-row sm:gap-8">
```

Concrete rules:
- No fixed pixel widths/heights on containers — use `w-full`, `max-w-*`, `min-h-*` instead.
- Multi-column layouts (`flex-row`, `grid-cols-N`) stack to a single column below `md:` unless the
  content genuinely needs side-by-side even on mobile.
- Data tables: wrap in an `overflow-x-auto` container rather than letting the table shrink columns
  unreadably.
- Touch targets (buttons, inputs) stay at least `py-2.5`/`h-10`-equivalent — don't shrink tap
  targets on mobile to save space.
- Verify with the browser preview's `resize_window` at `mobile` (375×812), `tablet` (768×1024), and
  a real `lg:`-or-above width (the `desktop` preset can resolve below 1024px depending on the pane
  container — set an explicit `width`/`height` ≥1024 if you need to verify desktop-only behavior)
  before calling any screen done.
