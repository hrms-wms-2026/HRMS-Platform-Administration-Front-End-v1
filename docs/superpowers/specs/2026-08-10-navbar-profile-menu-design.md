# Navbar Profile Menu Design

## Problem

The top navbar currently shows the logged-in user's email, a role badge, a
standalone "Security" link, and a standalone "Logout" button side by side
(`src/app/layouts/main-layout/navbar/navbar.html`). This is cluttered and
doesn't match the conventional pattern of a single profile-avatar entry
point for account-related actions.

## Goal

Replace the email/badge/Security/Logout row with a single profile avatar in
the top-right corner. Clicking the avatar opens a dropdown containing the
user's identity (email + role badge), a **Settings** entry, and **Logout**.

## Scope

- New `ProfileMenu` component that owns the avatar, the dropdown, and the
  existing logout-confirmation flow.
- `Navbar` becomes a thin host that renders `ProfileMenu` and no longer
  holds any auth/session/router logic itself.
- The existing standalone "Security" link is removed; its destination
  (`/settings/mfa`) becomes the dropdown's "Settings" entry instead — no new
  settings page is being built, this is a relabel + relocation of an
  existing route.
- The sidebar's separate disabled "Settings" placeholder item is explicitly
  **out of scope** for this change — it stays as-is.
- No avatar photo upload — this app has no photo-upload feature anywhere.
  The avatar is a colored circle with the first letter of the real
  authenticated user's email, derived from the existing `currentUser()`
  signal (`SessionService.currentUser`). No hardcoded placeholder name or
  initial.

## Architecture

```
Navbar (thin host)
  └── ProfileMenu
        ├── avatar button (initial letter, click toggles dropdown)
        └── dropdown panel (shown when open)
              ├── email + role badge (read-only header)
              ├── "Settings" link → /settings/mfa
              ├── "Logout" action → opens LogoutConfirmModal (existing component, reused as-is)
```

`ProfileMenu` is a self-contained interactive unit: it owns its own
open/closed state, the outside-click/Escape-to-close behavior, and the
existing logout-confirmation flow that used to live in `Navbar`. `Navbar`'s
only remaining job is to be the `<nav>` shell and render `ProfileMenu`
inside it — it no longer injects `AuthService`, `SessionService`, or
`Router` directly.

## Components

### `ProfileMenu` (new)

**Files:**
- `src/app/layouts/main-layout/profile-menu/profile-menu.ts`
- `src/app/layouts/main-layout/profile-menu/profile-menu.html`
- `src/app/layouts/main-layout/profile-menu/profile-menu.spec.ts`

**State:**
- `currentUser = sessionService.currentUser` (existing signal, unchanged source)
- `initial = computed(() => this.currentUser()?.email?.charAt(0).toUpperCase() ?? '?')`
- `open = signal(false)` — dropdown open/closed
- `showLogoutConfirm = signal(false)` — moved here verbatim from `Navbar`

**Behavior:**
- Clicking the avatar toggles `open`.
- Clicking outside the component (via a `HostListener` on `document:click`,
  checking `elementRef.contains(target)`) closes the dropdown when open.
- Pressing `Escape` while open closes the dropdown (`HostListener` on
  `document:keydown.escape`).
- Clicking "Settings" closes the dropdown (`open.set(false)`) and navigates
  via `routerLink` as normal — no extra logic needed since `routerLink`
  handles navigation declaratively.
- Clicking "Logout" closes the dropdown and sets `showLogoutConfirm.set(true)`,
  reusing the exact same `onLogoutClicked` / `onLogoutCancelled` /
  `onLogoutConfirmed` methods currently in `Navbar` (moved, not rewritten —
  same `AuthService.logout()` + navigate-to-login behavior).

### `Navbar` (simplified)

**Files (modified):**
- `src/app/layouts/main-layout/navbar/navbar.ts`
- `src/app/layouts/main-layout/navbar/navbar.html`
- `src/app/layouts/main-layout/navbar/navbar.spec.ts`

After this change, `Navbar` has no injected services and no protected
methods — it is purely `<nav>` markup hosting `<app-profile-menu />`.

## Data Flow

`SessionService.currentUser` is the single source of truth for the signed-in
user (already exists, unchanged). `ProfileMenu` reads it the same way
`Navbar` used to — no new service, no new state duplication.

## Error Handling

No new error paths are introduced. The logout error path (network failure
on `authService.logout()`) is copied verbatim from the existing `Navbar`
implementation, which already navigates to `/auth/login` on both success
and error.

## Testing

`profile-menu.spec.ts` covers:
- Renders the correct initial letter derived from a real `currentUser()` email.
- Dropdown is closed by default; clicking the avatar opens it.
- Clicking outside the component closes an open dropdown.
- Pressing Escape closes an open dropdown.
- The "Settings" entry has `routerLink="/settings/mfa"`.
- Clicking "Logout" closes the dropdown and shows `LogoutConfirmModal`
  (does not log out immediately).
- Confirming inside `LogoutConfirmModal` still calls `authService.logout()`
  and navigates to `/auth/login` (same assertions as the current
  `navbar.spec.ts` logout test, relocated).

`navbar.spec.ts` is trimmed to a single smoke test: it renders and hosts
`ProfileMenu`.

## Out of Scope

- Sidebar's disabled "Settings" placeholder (separate, pre-existing item).
- Any new settings page/content beyond the existing MFA/security page.
- Avatar photo upload.
