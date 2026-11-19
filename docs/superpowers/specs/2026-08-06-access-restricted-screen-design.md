# Access Restricted Screen — Design

## Goal

Give `permissionGuard` and `entitlementGuard` a real destination. Both guards already
redirect to `/access-denied` when a logged-in admin user lacks the permission or
module entitlement required for a route (`src/app/core/guards/permission.guard.ts`,
`src/app/core/guards/entitlement.guard.ts`), but no route or component exists at that
path yet — navigating there currently 404s inside the Angular router.

## Trigger

A logged-in Platform Administration user navigates (directly via URL, or via a link
that assumes a permission they don't have) to a route gated by `permissionGuard` or
`entitlementGuard`, and the check fails. This is **not** an authentication problem
(the user is logged in) and **not** a tenant/subscription-entitlement problem on the
customer-facing product — it's specific to the admin console's own RBAC.

## Scope

Frontend-only, `platform-administration` repo. No backend changes. No changes to the
guards' logic — they already redirect correctly; this spec only adds the screen they
redirect to.

## Route

- Path: `/access-denied` (kept as-is — this is what the guards already reference, and
  renaming would mean editing both guards for a cosmetic difference between the
  user-facing heading and the URL segment).
- Registered under `MainLayout`'s children in `app.routes.ts`, alongside `''`,
  `'users'`, `'settings/mfa'` — so it stays behind `authGuard` (must still be logged
  in) and keeps the nav/sidebar chrome visible. A user who lands here because of a
  bad link or bookmark isn't stranded — they can still use the sidebar to go anywhere
  else they're permitted to.
- Lazy-loaded, matching the existing route style (`loadComponent: () => import(...)`).

## Component

New standalone component: `src/app/modules/shared/feature/access-denied/access-denied.ts`
(+ `.html`, `.css`, `.spec.ts`), following the existing module layout convention seen
in `modules/auth/feature/forgot-password/`.

### Content

- Icon: Heroicons "Shield Check" (24, solid), `text-blue-700`, sized `size-12`,
  centered inside a `bg-blue-50 rounded-full` circular backdrop — reuses the app's
  existing primary blue rather than introducing a new color.
- Heading: "Access Restricted" — `text-2xl font-bold text-slate-900`.
- Body copy (generic — no permission code is surfaced, so no internal RBAC detail
  leaks to the UI and no route-state plumbing is needed in the guards):
  > You don't have permission to view this page. If you believe this is a mistake,
  > contact your administrator.
  - `text-sm text-slate-500`.
- Single action: **"Go to Dashboard"** button, `app-button` (existing shared
  component, `primary` variant, no icon — `app-button` doesn't currently support a
  leading icon and adding that support is out of scope here), `routerLink="/"`.

### Visual shell

Centered card, `rounded-2xl bg-white p-10 shadow-2xl max-w-md`, matching the visual
language already used by `login.html` and the other auth-flow screens (Tailwind
utility classes, same slate/blue palette, same card radius and shadow depth). Rendered
inside `MainLayout`'s `<router-outlet>`, so the top navbar and sidebar frame it exactly
like every other authenticated page.

## Testing

- `access-denied.spec.ts`: component renders the heading/body copy, and clicking
  "Go to Dashboard" navigates to `/`. Follows the existing spec style used by
  `forgot-password.spec.ts` / `reset-password.spec.ts`.
- No new guard tests needed — `permissionGuard`/`entitlementGuard` behavior is
  unchanged; this only fills in what they already point at.

## Out of scope

- Passing the specific missing permission/entitlement to the screen (rejected during
  design — generic message chosen to avoid leaking internal permission codes and to
  avoid touching the guards).
- Icon/leading-icon support on the shared `app-button` component.
- Any change to `authGuard`, `permissionGuard`, or `entitlementGuard` logic.
