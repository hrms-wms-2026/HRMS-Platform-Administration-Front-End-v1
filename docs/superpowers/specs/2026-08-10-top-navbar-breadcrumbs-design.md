# Top Navbar Breadcrumbs Design

## Problem

This is Piece 3 of the five-part enterprise-shell redesign. A real
full-width `app-navbar` component already exists
(`src/app/layouts/main-layout/navbar/`), sitting above the sidebar and
main content, but today it renders only the profile-menu, right-aligned
— the rest of the bar is empty. The sidebar carries its own ONEXSO
logo at its own top, duplicating what the original navigation proposal
placed in the shared top bar. Neither breadcrumbs nor the logo's real
home currently exist.

Pieces 4-5 (global search, notifications/help) remain separate future
pieces. Piece 4 specifically needs backend work first — a background
investigation this session confirmed there is no unified cross-entity
search endpoint today (only Tenants, Departments, and Positions have
any server-side search/filter parameter; ~12 other entity types return
unfiltered full lists, and there is no full-text search infrastructure
anywhere in the backend). Piece 4 is blocked until that's addressed and
is explicitly out of scope here.

## Scope

1. Relocate the ONEXSO logo from `sidebar.html` into `navbar.html`
   (left side), matching the original mockup. This touches
   `sidebar.html`, which will require a manual merge-conflict
   resolution later when Piece 2 (`feature/sidebar-collapse-flyout`,
   not yet merged) eventually lands — an accepted, known tradeoff.
2. Build a `Breadcrumb` component and place it in the navbar next to
   the logo, deriving its content from route metadata.
3. No changes to Pieces 4-5's territory (search, notifications, help,
   `+Add`) and no changes to sidebar navigation behavior itself.

## Navbar Restructure

`navbar.html` changes from a single right-aligned `<nav>` to
`justify-between`, with a left group (logo + breadcrumb) and the
existing right group (profile-menu) untouched:

```html
<nav class="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
  <div class="flex items-center gap-6">
    <div class="flex items-center gap-2">
      <img src="onexso-logo-icon.svg" alt="" class="h-7 w-auto" />
      <img src="onexso-logo-text.svg" alt="ONEXSO" class="h-4 w-auto" />
    </div>
    <app-breadcrumb />
  </div>
  <app-profile-menu />
</nav>
```

`sidebar.html`'s logo block (the `<img>` pair at the top of `<aside>`)
is deleted; the sidebar's first visible content becomes its first
section label.

## Breadcrumb Data Model

Breadcrumb content is declared per-route via Angular's route `data`
property in `app.routes.ts` — the same mechanism already used for
guards, keeping breadcrumb config co-located with the routes it
describes rather than a separate lookup table that can drift out of
sync.

Two shapes, matching the two hierarchy cases:

```ts
interface TopLevelBreadcrumb {
  section: string;      // not clickable — no route owns this label
  page: string;          // current page, not clickable
}

interface DetailBreadcrumb {
  section: string;                          // not clickable
  parent: { label: string; route: string };  // clickable — real list route
  page: string;                              // current page, not clickable, static label (no entity name fetch)
}
```

Example route entries:

```ts
{
  path: 'tenants',
  data: { breadcrumb: { section: 'Platform', page: 'Tenants' } },
  loadComponent: () => import(...).then((m) => m.TenantsList),
},
{
  path: 'tenants/:id',
  data: {
    breadcrumb: {
      section: 'Platform',
      parent: { label: 'Tenants', route: '/tenants' },
      page: 'Tenant Details',
    },
  },
  loadComponent: () => import(...).then((m) => m.TenantDetailComponent),
},
```

### Full route → breadcrumb mapping

| Route | Breadcrumb |
|---|---|
| `/` (Dashboard) | Platform / Dashboard |
| `/tenants` | Platform / Tenants |
| `/tenants/new` | Platform / **Tenants**(→/tenants) / New Tenant |
| `/tenants/:id` | Platform / **Tenants**(→/tenants) / Tenant Details |
| `/users` | Access Control / Users |
| `/roles` | Access Control / Roles |
| `/roles/:id` | Access Control / **Roles**(→/roles) / Role Details |
| `/subscription-plans` | Subscription & Billing / Subscription Plans |
| `/subscription-plans/new` | Subscription & Billing / **Subscription Plans**(→/subscription-plans) / New Plan |
| `/subscription-plans/:id` | Subscription & Billing / **Subscription Plans**(→/subscription-plans) / Plan Details |
| `/system-config/providers` | System Config / Providers |
| `/system-config/service-keys` | System Config / Service Keys |
| `/system-config/oauth-apps` | System Config / OAuth Apps |
| `/audit-logs` | Security & Compliance / Audit Logs |
| `/settings/mfa` | Two-Factor Authentication (single segment, no section — reached via the profile menu, not the sidebar) |
| `/access-denied` | *(no breadcrumb rendered — error/utility page)* |

Section labels above use the sidebar's exact current wording
("System Config", not "Platform Configuration") for consistency
between the two navigation surfaces.

## Breadcrumb Component

`src/app/layouts/main-layout/breadcrumb/breadcrumb.ts` reads the
active route on every `NavigationEnd`, walking down
`ActivatedRoute.snapshot` through its deepest child to find the leaf
route's `data['breadcrumb']`, and exposes it as a signal the template
renders:

```html
@if (segments(); as crumb) {
  <nav aria-label="Breadcrumb" class="flex items-center gap-1.5 text-sm text-slate-500">
    @if (crumb.section) {
      <span>{{ crumb.section }}</span>
      <span aria-hidden="true">/</span>
    }
    @if (crumb.parent) {
      <a [routerLink]="crumb.parent.route" class="hover:text-slate-700 hover:underline">{{ crumb.parent.label }}</a>
      <span aria-hidden="true">/</span>
    }
    <span class="font-medium text-slate-900">{{ crumb.page }}</span>
  </nav>
}
```

If a route has no `data['breadcrumb']` entry (shouldn't happen once
every route in the mapping table above is covered, but is a real
possibility for any future route added without updating the table),
the component renders nothing rather than a broken/partial crumb.

## Testing

- `Breadcrumb` component: unit tests using `RouterTestingModule`
  navigating to a representative route from each of the three shapes
  (top-level page, detail page with clickable parent, standalone
  single-segment page), asserting rendered text and the parent link's
  `href` where applicable, and asserting nothing renders for a route
  with no breadcrumb data.
- `Navbar` spec: asserts the logo `<img>` pair now renders inside
  `navbar.html` (moved from the old sidebar spec's assertion).
- `Sidebar` spec: existing logo-render test is removed (logo no longer
  lives there); all other existing sidebar tests are unaffected.

## Out of Scope

- Global search, notifications, help, `+Add` (Pieces 4-5).
- Dynamic entity names in detail-page breadcrumbs (e.g. showing the
  actual tenant's name) — deferred; today's detail-page breadcrumbs use
  a static label per the approved 2-level-plus-clickable-parent design.
- Any change to sidebar collapse/flyout behavior (Piece 2's territory).
