# Sidebar & Top Bar Visual Redesign — Design

## Goal

Restyle the existing app shell (`Sidebar` + `Navbar` inside `MainLayout`) to look like
a modern icon-led sidebar instead of today's plain-text link list, inspired by a
reference screenshot of a sibling product's navigation. This is a **visual/structural
restyle only** — no new pages, routes, or features.

## Scope

- In scope: `Sidebar` component styling (background, icons, active state, "Coming
  soon" badges on unbuilt items).
- Out of scope: `Navbar` content/structure (stays exactly as-is — no search box was
  requested), any new pages behind Roles & Permissions / Audit Logs / Settings, the
  "No permission to view page" empty state (separately flagged, deferred), and mobile/
  responsive collapse behavior (not requested; sidebar keeps its current fixed-width,
  always-visible layout).

## Current state

`src/app/layouts/main-layout/sidebar/sidebar.html` renders 5 items as plain text
links inside a white `<aside>`:

- Dashboard (`/`) and Users (`/users`) — real `routerLink`s, active state via
  `routerLinkActive="bg-blue-50 text-blue-700"`.
- Roles & Permissions, Audit Logs, Settings — rendered as plain `<span>`s
  (`cursor-not-allowed`, gray text), not links, since those areas aren't built yet.

`src/app/layouts/main-layout/navbar/navbar.ts`/`.html` — top bar with user
email/role badge, a "Security" link, and the Logout button (with the confirmation
modal built in this session). Not changed by this spec.

## Design

### Sidebar background and layout

- Background changes from white to the app's existing brand blue (`bg-blue-700` —
  same shade already used for the "ONEVO"/"ONEXSO" wordmark in the navbar and login
  screen, so the sidebar now carries that brand color instead of introducing a new
  one).
- Width, padding, and non-collapsible fixed-sidebar behavior stay as they are today
  (`w-56` in the navbar's case; sidebar currently has no explicit width — this spec
  keeps it a fixed-width column, no responsive collapse).

### Nav items

Each of the 5 items gets a small inline SVG icon before its label (no icon library
dependency exists in this repo — `shared/ui/empty-state/empty-state.ts` already
inlines SVG by hand, so these follow that same convention):

| Item | Icon | Link state |
|---|---|---|
| Dashboard | grid/home outline | real `routerLink="/"` (unchanged) |
| Users | people outline | real `routerLink="/users"` (unchanged) |
| Roles & Permissions | shield/lock outline | disabled, "Coming soon" badge |
| Audit Logs | document/list outline | disabled, "Coming soon" badge |
| Settings | gear outline | disabled, "Coming soon" badge |

- **Active item** (Dashboard or Users, whichever route is current): a filled
  `bg-blue-900` pill (darker than the `bg-blue-700` sidebar background, for contrast)
  behind white, `font-semibold` icon+label — today's `bg-blue-50 text-blue-700`
  doesn't read against a dark-blue background, so it's replaced, not reused.
- **Inactive-but-real item** (whichever of Dashboard/Users isn't current): icon+label
  in a lighter, low-contrast tone against the blue background (e.g. `text-blue-100`),
  hover state slightly brighter.
- **Disabled items** (Roles & Permissions, Audit Logs, Settings): icon+label in a
  muted tone (e.g. `text-blue-300`), `cursor-not-allowed` as today, plus a small
  pill-shaped "Coming soon" badge to the right of the label (light background, small
  text — same idea as the reference screenshot's tab-level badges). These stay
  `<span>`s, not `routerLink`s — no routes exist for them yet.

### Navbar

No changes. Confirmed explicitly: no search box, keep today's content (email/role
badge, Security link, Logout with confirmation modal).

## Testing

- New `sidebar.spec.ts` (no existing coverage for this component):
  - Dashboard link has `routerLink="/"` and Users link has `routerLink="/users"`.
  - Roles & Permissions, Audit Logs, and Settings render as non-navigable elements
    (no `routerLink` attribute) and each shows a "Coming soon" badge.
  - Mirrors this repo's existing TestBed conventions (see `navbar.spec.ts` for the
    `ActivatedRoute` provider pattern needed by `RouterLink`/`RouterLinkActive`).
- `navbar.spec.ts`: unchanged, no new cases needed (component isn't touched).
- Manual check: build the app, visually confirm active-state pill renders correctly
  on both `/` and `/users`, and that "Coming soon" badges are legible against the
  blue background.
