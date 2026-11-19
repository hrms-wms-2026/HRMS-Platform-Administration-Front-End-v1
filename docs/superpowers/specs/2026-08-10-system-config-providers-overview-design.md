# System Config: Providers Overview Design

## Problem

The System Config pillar now has (or will have) three per-family detail
screens: Service Keys, OAuth Apps, and eventually Payment Gateways. There
is no single place to see the whole pillar's configuration health at a
glance. This spec adds that overview.

## Scope

A single, purely read-only screen listing every provider the platform
knows about, grouped by family, showing configured/active/last-verified
status. No create/edit/delete/activate actions of any kind — this screen
only reads.

## Backend (already built, zero backend work)

`GET /admin/v1/system-config/providers`
(`src/ONEVO.Api/Controllers/Admin/DevPlatform/SystemConfig/PlatformProvidersController.cs`),
permission `platform.system_config.read` only.

Response — `IReadOnlyList<PlatformProviderCardDto>`:

```csharp
class PlatformProviderCardDto {
  Guid Id; string ProviderKey; string DisplayName; string ProviderFamily;
  bool Configured; bool ConfigurationActive; DateTimeOffset? LastVerifiedAt;
}
```

This is a **unified, cross-cutting list** — one flat array spanning every
family in the pillar, not a per-family endpoint. `ProviderFamily` values
(`src/ONEVO.Domain/.../PlatformProviders/Entities/PlatformProvider.cs`,
`PlatformProviderFamilies`):

| Raw value | What it covers | Has a detail screen? |
|---|---|---|
| `oauth_app` | GitHub/Google/Microsoft/Zoom | Yes — OAuth Apps (`feature/system-config-oauth-apps`, unmerged) |
| `transactional_email` | SendGrid, Resend | Yes — Service Keys (`feature/system-config-service-keys`, unmerged) |
| `infrastructure` | Cloudflare | Yes — Service Keys |
| `object_storage` | Cloudflare R2 | Yes — Service Keys |
| `ai_verification` | AWS Rekognition | Yes — Service Keys |
| `payment_gateway` | Stripe/Paddle/PayHere configs | **No** — Payment Gateways module is deferred; this overview is the *only* place a payment gateway's status is currently visible in the frontend |

## Approach

- **Grouped-by-family sections**, not a flat table with a family column —
  6 distinct families read better as labeled sections than as a dense
  table with 6 badge colors.
- **Purely inert rows — no navigation, no click handlers.** The
  `oauth_app`/service-key-family rows *could* deep-link to their detail
  screens, but those routes only exist on other still-unmerged branches;
  wiring `routerLink`s to routes that 404 on this branch in isolation
  would make standalone testing of this branch confusing. Reconciling
  cross-links between the three System Config screens is deferred to
  whichever branch merges last (noted in Out of Scope).
- Family display labels are a small frontend-owned lookup (the backend
  only returns the raw slug, e.g. `"oauth_app"`) — this is presentation
  text, not business logic, so no backend change needed:
  `oauth_app` → "OAuth Apps", `transactional_email` → "Transactional
  Email", `infrastructure` → "Infrastructure", `object_storage` →
  "Object Storage", `ai_verification` → "AI Verification",
  `payment_gateway` → "Payment Gateways". Section order follows this same
  fixed sequence. A family with zero entries is skipped (not rendered as
  an empty heading) — defensive, since today the backend always returns
  at least one entry per family, but this keeps the screen correct if
  that ever changes.

## Frontend Architecture

```
system-config/
  data/
    provider-card.model.ts     // PlatformProviderCard interface
    providers.service.ts       // list()
  feature/
    providers-overview/
      providers-overview.ts/html/spec.ts
```

(Third data/feature area under the existing `system-config` module,
alongside Service Keys and OAuth Apps.)

### `ProvidersOverview`

- Permission gate on `platform.system_config.read` (view-only permission
  — this screen has no `platform.system_config.manage`-gated content at
  all, unlike its siblings).
- Loads the flat list on init, groups it client-side into a
  `computed()` ordered by the fixed family sequence above, skipping
  empty families.
- Per row: Display Name, `Configured`/`Not configured` badge
  (`success`/`neutral`), `Active`/`Inactive` badge (only shown when
  `Configured` is true), Last Verified date or `—`. No buttons, no
  clickable rows, no forms.

## Routing & Navigation

New route: `path: 'system-config/providers'` → `ProvidersOverview`,
added as a sibling under the main-layout route group, next to
`system-config/oauth-apps`. No sidebar change in this spec — same
reasoning as the OAuth Apps spec: the sidebar's single "Settings" entry
(on the still-unmerged Service Keys branch) is the placeholder for a
System Config sub-nav, and reconciling that sub-nav across all three
screens is a single task for whichever branch merges last, not repeated
per screen.

## Testing

- `providers.service.spec.ts`: `HttpTestingController` pattern for
  `list()`.
- `providers-overview.spec.ts`: no-permission gate; loads and groups real
  DTOs into the correct family sections in the correct order; a family
  with no matching entries doesn't render its heading; Configured/Active
  badges reflect the DTO's booleans correctly; Last Verified renders `—`
  for null.

## Out of Scope

- Any create/edit/delete/activate action (this screen is 100% read-only
  by design).
- Deep-linking rows to their detail screens (deferred until Service
  Keys/OAuth Apps/this branch are all merged and a sub-nav can be
  designed holistically).
- Payment Gateways detail screen (separate, deferred sub-project).
