# Sidebar & Top Bar Visual Redesign — Design (v2)

## Goal

Restyle the existing app shell (`Sidebar` + `Navbar` inside `MainLayout`) to a light,
icon-led sidebar with an indigo/violet accent and the real ONEXSO logo, replacing
today's plain white sidebar with unstyled text links. This is a **visual/structural
restyle only** — no new pages, routes, or features.

## Revision note

This supersedes the v1 design in this same file (dark `bg-blue-700` solid sidebar,
approved 2026-08-07 but never implemented — the plan was written but execution was
interrupted before any code changed). The user reviewed a second reference screenshot
(a different, more polished SaaS product) and preferred its light theme + indigo
accent over the original dark-blue direction, and supplied the actual ONEXSO logo
assets to use instead of a text wordmark. v1's decisions on scope (Sidebar + Navbar
only, no search box, no new routes) still hold; only the visual treatment changes.

## Scope

- In scope: `Sidebar` component styling (background, icons, active state, "Coming
  soon" badges, logo header, section label) and `Navbar` component's accent color
  (any `blue-700`/`blue-*` usage switches to the matching `indigo-*` shade).
- Out of scope: `Navbar` structure/content (still no search box — confirmed in v1 and
  unchanged by this revision), any new pages behind Roles & Permissions / Audit Logs /
  Settings, the "No permission to view page" empty state (separately flagged,
  deferred), mobile/responsive collapse behavior (not requested), and any other
  screen's blue-700 usage (login, forgot-password, reset-password, accept-invite,
  MFA screens — explicitly confirmed to stay as-is, a separate future rebrand).

## Current state

`src/app/layouts/main-layout/sidebar/sidebar.html` renders 5 items as plain text
links/spans inside a white `<aside>`, no icons, no header, no section grouping:

- Dashboard (`/`) and Users (`/users`) — real `routerLink`s, active state via
  `routerLinkActive="bg-blue-50 text-blue-700"`.
- Roles & Permissions, Audit Logs, Settings — plain `<span>`s (`cursor-not-allowed`,
  gray text), not links.

`src/app/layouts/main-layout/navbar/navbar.html` — top bar with user email/role
badge, a "Security" link, and the Logout button (with the confirmation modal built
earlier this session). Structure unchanged by this spec; only accent color classes
change.

## Logo assets

User supplied two SVG files (large traced/vectorized exports, hundreds of path
elements each — not hand-authored, not suitable to inline into a component
template):

- `C:\Users\User\Downloads\onexso-logo-icon.svg` — the circular "C+X" mark alone.
- `C:\Users\User\Downloads\onexso-logo-text.svg` — the "ONEXSO" wordmark alone
  (867×186 viewBox, dark-blue/light-blue fills already baked into the paths).

Both get copied as-is into `public/` (Angular serves this directory's contents at the
app root, same as `public/favicon.ico` today) and rendered via plain `<img>` tags —
**not** inlined as raw SVG markup, since the path count would bloat the component
template for no benefit (the colors are already fixed in the file; no `currentColor`
theming is needed or possible with these particular exports).

- `public/onexso-logo-icon.svg`
- `public/onexso-logo-text.svg`

## Design

### Sidebar background and header

- Background: light (`bg-white`, with a `border-r border-slate-200` to separate it
  from the main content area) — not dark, reversing v1's `bg-blue-700` decision.
- Header area at the top of the `<aside>`: `<img src="onexso-logo-icon.svg">` (small,
  e.g. `h-8 w-8`) next to `<img src="onexso-logo-text.svg">` (e.g. `h-5`, width auto)
  side by side. Static, non-interactive — no workspace-switcher card, since
  platform-administration has no multi-workspace concept to switch between.
- Below the header: one section label, `<p class="...uppercase text-xs font-semibold text-slate-400">Platform</p>`,
  above the 5 nav items — matches the reference's section-label pattern even though
  there's only one section (5 items don't need more than one grouping right now; more
  labels can be added later if the nav grows).

### Nav items

Each of the 5 items keeps its inline SVG icon (same shapes decided in v1 — grid,
people, shield, document, gear/sliders — geometry unchanged, only recolored):

| Item | Icon | Link state |
|---|---|---|
| Dashboard | grid/home outline | real `routerLink="/"` (unchanged) |
| Users | people outline | real `routerLink="/users"` (unchanged) |
| Roles & Permissions | shield/lock outline | disabled, "Coming soon" badge |
| Audit Logs | document/list outline | disabled, "Coming soon" badge |
| Settings | gear/sliders outline | disabled, "Coming soon" badge |

- **Active item** (Dashboard or Users, whichever route is current): light indigo pill
  — `bg-indigo-50 text-indigo-700 font-semibold` — behind icon+label. Replaces both
  v1's dark pill and the original `bg-blue-50 text-blue-700`, since the accent color
  itself is changing to indigo.
- **Inactive-but-real item**: icon+label in `text-slate-600`, hover
  `hover:bg-slate-50`.
- **Disabled items** (Roles & Permissions, Audit Logs, Settings): icon+label in
  `text-slate-400`, `cursor-not-allowed`, plus a small pill badge to the right of the
  label reading "Coming soon" (`bg-slate-100 text-slate-500`, small rounded-full
  text). Stay `<span>`s, not `routerLink`s — no routes exist for them yet.

### Navbar

Structure and content unchanged (still just user email/role badge, Security link,
Logout with confirmation modal, no search box). Any `blue-700`/`blue-*` Tailwind
classes currently used for accents (e.g. link hover color) switch to the matching
`indigo-*` shade, per the confirmed "Sidebar + top bar only" rebrand scope.

## Testing

- New `sidebar.spec.ts` (no existing coverage for this component):
  - Dashboard link has `routerLink="/"` and Users link has `routerLink="/users"`.
  - Roles & Permissions, Audit Logs, and Settings render as non-navigable elements
    (no `routerLink` attribute) and each shows a "Coming soon" badge.
  - The "Platform" section label renders.
  - Mirrors this repo's existing TestBed conventions — `provideRouter([])` for a real
    `Router`/`ActivatedRoute` so `RouterLink`/`RouterLinkActive` render without
    errors (see `navbar.spec.ts` for the alternate `ActivatedRoute`-mock pattern used
    where `RouterLinkActive` isn't exercised).
- `navbar.spec.ts`: no new cases needed — component structure/logic isn't touched,
  only Tailwind class strings change color.
- Manual check: build the app, visually confirm the logo renders correctly, active-
  state pill renders on both `/` and `/users`, and "Coming soon" badges are legible
  against the light background.
