# Navbar Search + Notification Placeholders Design

## Problem

The full navigation mockup shows a search bar (Ctrl+K) and a
notification bell in the top navbar. Neither has real backend support
yet: a background investigation this session confirmed no unified
search endpoint exists (only 3 of ~15 entity types have any
server-side search filter, and there is no full-text search
infrastructure), and there is no notification/unread-count data source
either. Building either as a working feature is a separate, larger
piece of work.

The user wants these visible in the navbar for demo purposes, but the
project's standing rule is that no dummy/mock functionality ships,
even under demo pressure — a control that *looks* interactive but
silently does nothing on click is exactly that. This spec follows the
same resolution already used for Payment Gateways in the sidebar: a
plainly disabled control, not a fake-functional one and not a "Coming
Soon" badge (that badge style was explicitly rejected earlier this
session in favor of a plain disabled state).

## Scope

Two elements added to `navbar.html`, both natively disabled (not just
visually greyed):

1. **Search input** — placed between the breadcrumb and the
   right-hand group, `<input type="text" disabled>` with placeholder
   text "Search tenants, users, settings..." and a "Ctrl+K" hint
   rendered next to it, `title="Coming soon"` for a tooltip on hover.
2. **Notification bell** — placed to the left of the profile menu,
   `<button type="button" disabled>` containing a bell SVG icon, no
   badge/count (a fake unread number would itself be dummy data).

Native `disabled` is used for both (not just CSS styling) so they are
correctly announced as unavailable to screen readers and cannot
receive focus or clicks — no click handler is wired to either.

## Out of Scope

- Help icon and `+Add` quick-action button — not requested.
- Any real search or notification functionality — deferred until the
  backend work each depends on exists (a unified search endpoint;
  a real notification/unread-count data source).

## Testing

`navbar.spec.ts` additions:
- Search input renders with the `disabled` attribute and the expected
  placeholder text.
- Notification button renders with the `disabled` attribute.
- Existing profile-menu, logo, and breadcrumb assertions are
  unaffected.
