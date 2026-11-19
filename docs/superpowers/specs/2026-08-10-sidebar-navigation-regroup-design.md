# Sidebar Navigation Regroup Design

## Problem

The sidebar is a flat list of 8 single-level links with one generic
"Platform" section label. As the System Config pillar grew to three real
screens (Service Keys, OAuth Apps, Providers Overview) plus a deferred
fourth (Payment Gateways), a single "Settings" link pointing at just one
of those screens became misleading — it hid the other two entirely and
gave no indication there was more underneath.

This is the first of a five-part enterprise-shell redesign (full context
captured below); this spec covers **only** the static sidebar regrouping.
The remaining four parts (collapse-to-icon-rail + flyout mini-menu, top
navbar breadcrumbs, global search, notifications/help) are separate
future sub-projects, deliberately out of scope here.

## Full Redesign Context (for reference — not all built here)

The user's complete navigation proposal, decomposed into 5 independent
pieces, of which this spec builds **only Piece 1**:

1. **Sidebar regroup** (this spec) — reorganize the flat list into
   labeled sections, no new interaction/state.
2. Sidebar collapse-to-icon-rail with hover tooltips and a flyout
   mini-menu on a collapsed group's icon click.
3. Top navbar breadcrumbs (parent segment clickable, current page not).
4. Top navbar global search (Ctrl+K) — needs backend investigation
   before any design/build (does a search endpoint exist?).
5. Top navbar notifications + help icons — notifications need a real
   backend data source (no dummy badge counts); needs investigation.

The user's own explicit constraint governs all five: **do not show nav
items for modules without a usable screen, and do not invent routes or
clickable UI for unavailable features.** Concretely: Integrations,
Support Center, and System Control pillars have no frontend screens yet
and must not appear in the sidebar at all (not even as disabled
placeholders) until they do.

## Scope (this spec)

Purely a static template restructure of
`src/app/layouts/main-layout/sidebar/sidebar.html` (+ trivial
`sidebar.spec.ts` updates). No new component state, no backend calls, no
new routes (all routes used here already exist and are merged).

## Final Structure

```
PLATFORM
  Dashboard             → /                          (existing)
  Tenants                → /tenants                   (existing)

ACCESS CONTROL
  Users                   → /users                     (existing)
  Roles                   → /roles                     (existing)

SUBSCRIPTION & BILLING
  Subscription Plans      → /subscription-plans        (existing)

PLATFORM CONFIGURATION
  Providers Overview      → /system-config/providers    (existing)
  Service Keys            → /system-config/service-keys (existing)
  OAuth Apps               → /system-config/oauth-apps   (existing)
  Payment Gateways         (disabled — see below)

SECURITY & COMPLIANCE
  Audit Logs               → /audit-logs                (existing)
```

Every link above already exists and is merged to `development` — this
spec only re-files them under new section labels, using the exact same
route strings as today's flat list.

## Section Labels

Each group gets the same subtle heading style already used for
"Platform" today (`text-xs font-semibold uppercase tracking-wide
text-slate-400`) — five labels total instead of one. Child items get a
small additional left indent (`pl-2` beyond the existing `px-3`) so the
grouping reads visually without needing new component logic — this is a
purely presentational nesting, not a collapsible tree.

## Payment Gateways Row

Confirmed with the user: **plain disabled row, no badge, no "Coming
Soon" text** — matches this exact codebase's own pre-existing "disabled
sidebar item" convention (used for Audit Logs and Settings before those
screens were built, earlier this session):

```html
<span data-sidebar-item class="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400">
  <svg>...</svg>
  Payment Gateways
</span>
```

Non-clickable `<span>`, greyed text, no `routerLink`, no decoration
beyond the existing disabled-item look.

## Testing

`sidebar.spec.ts` updates:
- Section-label test extends from asserting just `"Platform"` to
  asserting all five labels are present: `"Platform"`, `"Access
  Control"`, `"Subscription & Billing"`, `"Platform Configuration"`,
  `"Security & Compliance"`.
- Navigable-links test extends its `hrefs` assertions to also include
  `/system-config/providers` and `/system-config/oauth-apps` (currently
  only asserts `/system-config/service-keys`).
- New test: "Payment Gateways" renders as a non-navigable item (same
  assertion pattern the codebase already used for Audit Logs/Settings
  before they were built — the item's text is present but it has no
  `<a>` element).

## Out of Scope

- Collapse-to-rail interaction, hover tooltips, flyout mini-menu (Piece
  2, future spec).
- Top navbar changes of any kind (Pieces 3–5, future specs).
- Any nav entry for Integrations, Support Center, or System Control
  (no screens exist).
- Reordering or renaming any *existing* route — this spec only changes
  which section label a link sits under, never the route itself.
