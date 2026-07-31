# Platform Administration — Frontend Guide

Angular 21 (zoneless, signals, standalone components) admin frontend for the ONEVO platform.
This file exists so both Claude and any developer picks up the same conventions — read it before
adding new modules, services, or changing auth/permission code.

## Stack

- Angular 21, zoneless change detection, standalone components only (no NgModules)
- `@ngrx/signals` for state stores (not NgRx Store/Effects)
- Tailwind CSS v4 for styling (no component-scoped CSS files unless truly needed)
- Jest for unit tests, Playwright for e2e
- Session auth via HttpOnly cookies (`withCredentials: true` on every HTTP call) — **no tokens in
  localStorage/sessionStorage, ever**

## Folder structure

```
src/app/
├── core/                  # singleton services, guards, app-wide config — no UI
│   ├── auth/               AuthService, SessionService, SessionInitializerService, models
│   ├── permissions/         PermissionStore (NgRx Signal Store), permission constants per domain
│   ├── guards/              authGuard, permissionGuard, entitlementGuard, roleGuard
│   └── config/              api-endpoints.ts (all backend routes, one place)
├── layouts/                # shell components (AuthLayout, MainLayout)
├── modules/                # feature modules, one folder per business domain
│   └── <domain>/feature/<feature-name>/   e.g. modules/auth/feature/login
├── shared/                 # reusable, presentation-only — directives, pipes, dumb components
│   └── directives/          e.g. PermissionDirective (*appPermission)
└── environments/           environment.ts (dev), environment.prod.ts
```

Rule of thumb: if it talks to the backend or holds app-wide state → `core/`. If it's a screen for
one business domain → `modules/<domain>/feature/<name>`. If it's dumb/reusable UI → `shared/`.

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

HTTP-level logging (request/response, duration, correlation-id) belongs in the single
`logging.interceptor.ts` (Phase 7), not scattered `console.log` calls per service.

## Data flow

### App bootstrap (session restore on page load)
```
provideAppInitializer (app.config.ts)
  → SessionInitializerService.initialize()
    → AuthService.loadContext()  [GET /auth/context — currently backend-gap, see below]
      → success: SessionService.setSession() + PermissionStore.setAuthorizationContext()
      → failure (no cookie / 401 / 404): silently continue, isAuthenticated() stays false
  → router activates → authGuard on `/` redirects to /auth/login if not authenticated
```

### Login
```
Login component .submit()
  → AuthService.login({email, password})   [POST /auth/login, withCredentials]
    → maps backend wire response → AuthContext (see mapping pattern below)
    → success: SessionService.setSession() + PermissionStore.setAuthorizationContext()
               → router.navigateByUrl('/')
    → error: errorMessage signal set from HttpErrorResponse.status
```

### Logout
```
AuthService.logout()   [POST /auth/logout, withCredentials]
  → tap(): SessionService.clearSession() + PermissionStore.clear()
```

### Route protection
```
authGuard          → SessionService.isAuthenticated() → else redirect /auth/login
permissionGuard     → PermissionStore.hasPermission(route.data['permission']) → else /access-denied
entitlementGuard    → PermissionStore.hasEntitlement(route.data['entitlement']) → else /access-denied
roleGuard           → SessionService.currentUser().platformRole vs route.data['roles'] → else /access-denied
```

`*appPermission="'projects.edit'"` directive hides/shows template blocks the same way, reactively,
via an `effect()` watching `PermissionStore.hasPermission()`.

## Backend integration conventions

- **All endpoint paths live in `core/config/api-endpoints.ts`** — never hardcode a path string in
  a service.
- **Base URL comes from `environment.apiUrl`** — never concatenate host/port elsewhere.
- **This app talks to the Admin API (`/admin/v1/...`), not the Tenant API (`/api/v1/...`).** They
  are separate controllers on the same backend (`AdminAuth` vs tenant-scoped `Auth`). Hitting
  `/api/v1/*` from this app returns `400 Tenant context is not resolved` — that error means the
  request went to the wrong API surface, not that credentials are wrong.
- **Backend wire shape ≠ frontend model shape.** The admin API returns snake_case
  (`platform_user_id`, `platform_role`, `expires_at`); our models use camelCase. Map explicitly at
  the service boundary — see `toAuthContext()` in
  [`auth.service.ts`](src/app/core/auth/auth.service.ts) — never let snake_case leak past
  `AuthService`.
- Verify unfamiliar endpoints against the live swagger doc before wiring them:
  `http://localhost:5139/swagger/admin-v1/swagger.json` (admin surface) vs
  `http://localhost:5139/swagger/v1/swagger.json` (tenant surface). A 404 from a guessed path is
  not proof the feature doesn't exist — check swagger first.

### Known backend gap
There is currently no session-restore endpoint (`GET /admin/v1/auth/me` or `/context`) on the
admin API — only `login`, `logout`, `google-callback` exist under `AdminAuth`. Until backend adds
one, `SessionInitializerService.initialize()` will always fail to restore a session after a page
refresh, even with a valid cookie. This is expected for now, not a frontend bug — don't "fix" it
by guessing a path.

## Component conventions

- `inject()` at class-field level, not constructor injection.
- Signals for local component state (`signal()`, `computed()`), not RxJS subjects, unless the
  value is inherently a stream (HTTP calls, router events).
- Reactive forms (`FormBuilder.nonNullable.group(...)`) for anything with validation.
- Styling: Tailwind utility classes in the template; component `.css` files stay empty/minimal.
- No `NgModule` — every component is standalone with an explicit `imports` array.

## Responsive design

**Every screen must be usable from mobile width up — this is not optional per feature, it's a
baseline requirement for every screen we build.** This is an admin panel so desktop is the primary
use case, but a screen that visibly breaks on a phone/tablet is not done.

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
- Data tables: wrap in a `overflow-x-auto` container rather than letting the table shrink columns
  unreadably — see the artifact-authoring convention of "wide content scrolls in its own
  container."
- Nav/sidebar (once built in Phase 9): collapses to an off-canvas/hamburger pattern below `lg:`,
  not a persistent fixed-width column at every size.
- Touch targets (buttons, inputs) stay at least `py-2.5`/`h-10`-equivalent — don't shrink tap
  targets on mobile to save space.
- Verify with the browser preview's `resize_window` at `mobile` (375×812), `tablet` (768×1024), and
  `desktop` (1280×800) presets before calling any screen done — see
  [`login.html`](src/app/modules/auth/feature/login/login.html)'s `w-full max-w-md` card as the
  reference pattern already in the codebase.
