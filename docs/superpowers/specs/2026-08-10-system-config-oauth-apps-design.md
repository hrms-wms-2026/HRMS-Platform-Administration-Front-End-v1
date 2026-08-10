# System Config: Platform OAuth Apps Design

## Problem

Second sub-project of the System Config pillar (after Service Keys, kept
on its own unmerged branch `feature/system-config-service-keys`). No
frontend exists yet for managing the platform's OAuth app credentials
(GitHub, Google, Microsoft, Zoom) — the apps ONEVO registers with each
provider to power admin SSO, user OAuth login, and calendar integration.

## Why this isn't Service Keys with different labels

The backend's shape is meaningfully different, and the UI needs to reflect
that rather than copy Service Keys' table:

- Service Keys is an **open-ended catalog** — rows only exist once
  created, and `POST` creates a new one.
- OAuth Apps is a **fixed catalog of exactly 4 providers**
  (github/google/microsoft/zoom), backend-owned via
  `PlatformOAuthProviderCatalog`. `GET /admin/v1/system-config/oauth-apps`
  always returns all 4, whether configured or not. There is deliberately
  no create endpoint — only `PUT` (upsert/configure) an already-approved
  provider slug.
- Verification terminology differs: Service Keys has `/verify` (implies a
  live check). OAuth Apps has `/validate-config`, and its response DTO's
  `VerificationType` is always `"local"` — it is a structural check only,
  no live GitHub/Google/Microsoft/Zoom API call. The UI must not call this
  "Verify" or imply a live connectivity test.

## Approach (decided after discussion)

A **Provider Hub + Detail Drawer** pattern, not a card grid and not a flat
table:

- **Landing page** (`oauth-apps-list`): a 4-card overview, one per
  provider, read-only — logo/name, Configured/Not Configured, Active/
  Inactive, Last Verified. No credential fields ever appear here.
- **Detail Drawer** (`oauth-app-detail-drawer`): clicking any card opens a
  right-side slide-in drawer scoped to that one provider. All
  credential-touching actions live here: view backend-owned scopes/
  capabilities, edit `AppName`/`LogoUrl`/`ClientId`, submit a new
  `ClientSecret` (write-only), Rotate Secret, Validate Config, Activate/
  Deactivate.

This mirrors an already-existing pattern in this codebase —
`UserProfileDrawer` (`src/app/modules/platform-users/feature/user-profile-drawer/`)
— which is reused as the structural template: `input.required<T>()` +
`effect()` to reload on selection change, `closed`/`updated` outputs, a
`w-96` right-side slide-in panel with backdrop-click-to-close.

## Backend (already built, zero backend work)

Controller: `src/ONEVO.Api/Controllers/Admin/DevPlatform/SystemConfig/PlatformOAuthAppsController.cs`

| Method | Route | Purpose |
|---|---|---|
| GET | `/admin/v1/system-config/oauth-apps` | All 4 provider cards, always (no secrets) |
| GET | `/admin/v1/system-config/oauth-apps/{provider}` | One provider's detail (no secrets) |
| PUT | `/admin/v1/system-config/oauth-apps/{provider}` | Configure (upsert) — all fields optional |
| POST | `/admin/v1/system-config/oauth-apps/{provider}/rotate-secret` | New credential version |
| POST | `/admin/v1/system-config/oauth-apps/{provider}/activate` | `isActive = true` |
| POST | `/admin/v1/system-config/oauth-apps/{provider}/deactivate` | `isActive = false` |
| POST | `/admin/v1/system-config/oauth-apps/{provider}/validate-config` | Local structural check only |

**Response DTO** (`PlatformOAuthAppDto`):

```csharp
class PlatformOAuthAppDto {
  string Provider; string DisplayName; string? AppName; string? LogoUrl;
  bool Configured; bool IsActive; string? ClientId;
  string AuthorizationUrl; string TokenUrl; string[] DefaultScopes; string[] Capabilities;
  bool ClientSecretRequired; bool HasActiveCredential; int? ActiveCredentialVersion;
  bool HasPrivateKey; DateTimeOffset? LastVerifiedAt; DateTimeOffset? UpdatedAt;
}
class OAuthAppValidateConfigResultDto {
  string Provider; string Status; string VerificationType; string Message; DateTimeOffset? VerifiedAt;
}
```

`AuthorizationUrl`, `TokenUrl`, `DefaultScopes`, `Capabilities` are
backend-owned and always present (even unconfigured) — the drawer renders
them as read-only reference info, never as editable fields.

**Request DTOs:**

```csharp
class ConfigurePlatformOAuthAppRequest {
  string? AppName; string? LogoUrl; string? ClientId; string? ClientSecret; string? PrivateKey; bool? IsActive;
}
class RotatePlatformOAuthAppSecretRequest { string ClientSecret; string? PrivateKey; }
```

All 4 Phase-1 providers have `ClientSecretRequired = true`; none currently
use `PrivateKey` (it exists for future providers). The drawer treats
`PrivateKey` as an optional, collapsed/secondary field — not a primary
input every provider needs.

**Security constraint:** identical to Service Keys — no plaintext or
encrypted secret is ever returned. `ClientSecret`/`PrivateKey` inputs are
write-only (sent on Configure/Rotate, never displayed, never pre-filled).

## Permissions

Same as Service Keys: `platform.system_config.read` (view),
`platform.system_config.manage` (configure/rotate/activate/deactivate/
validate).

## Frontend Architecture

```
system-config/
  data/
    oauth-app.model.ts           // OAuthApp, OAuthAppValidateConfigResult interfaces
    oauth-apps.service.ts        // list, configure, rotateSecret, setActive, validateConfig
  feature/
    oauth-apps-list/
      oauth-apps-list.ts/html/spec.ts
    oauth-app-detail-drawer/
      oauth-app-detail-drawer.ts/html/spec.ts
```

(Same top-level `system-config` module as Service Keys — this is its
second data/feature area, not a new module.)

### `OAuthAppsList`

- Permission gate on `platform.system_config.read`.
- Loads all 4 cards on init (`list()` always returns exactly 4, backend
  guarantees the shape — no empty-state needed).
- Each card: provider display name, `Configured`/`Not Configured` badge
  (`neutral`/`success` tone), `Active`/`Inactive` badge (only shown when
  configured), Last Verified date or `—`.
- Clicking a card sets a `selectedProvider` signal, opening the drawer.

### `OAuthAppDetailDrawer`

- `readonly provider = input.required<string>()`.
- `effect()` reloads the provider's detail (`GET .../{provider}`) whenever
  `provider()` changes — mirrors `UserProfileDrawer`'s constructor
  `effect()` exactly.
- Read-only reference block: Authorization URL, Token URL, Default
  Scopes, Capabilities (all backend-owned, rendered as plain text/badges,
  never inputs).
- Editable reactive form: App Name, Logo URL, Client ID, Client Secret
  (password input, write-only) — submit calls the `configure()` upsert;
  works identically whether the provider was previously configured or
  not (no separate create/edit mode branching needed, since `PUT` is
  always an upsert).
- "Rotate Secret" — a small inline section (not a nested modal, to avoid
  drawer-inside-modal nesting) with its own Client Secret input, calls
  `rotateSecret()`.
- "Validate Configuration" button — calls `validateConfig()`, shows the
  result via `NotificationService`. Labeled **"Validate Configuration"**,
  not "Verify", and its result toast is prefixed to make the local-only
  nature explicit, e.g. `"Local check: {message}"` — so operators don't
  mistake it for a live connectivity test against GitHub/Google/
  Microsoft/Zoom.
- Activate/Deactivate toggle button, same pattern as Service Keys'
  row-level toggle.
- All manage-gated actions (`configure`, `rotate-secret`, `validate-config`,
  `activate`/`deactivate`) hidden behind `platform.system_config.manage`;
  read-only reference info remains visible to `platform.system_config.read`
  holders.

## Routing & Navigation

New route: `path: 'system-config/oauth-apps'` → `OAuthAppsList`, added as
a child alongside `system-config/service-keys` (once that branch merges)
under the main-layout route group.

The sidebar doesn't get a second top-level "OAuth Apps" entry — the
existing (still-unmerged, on `feature/system-config-service-keys`)
"Settings" sidebar link points at `/system-config/service-keys`. This spec
does **not** change sidebar navigation; reconciling a proper System Config
sub-nav (tabs or a settings-shell layout covering Service Keys + OAuth
Apps + future Payment Gateways) is deferred to whichever of these two
branches merges second, since it needs both screens to exist to design
sensibly. For now this route is reachable directly by URL and by clicking
through from wherever it's linked once integrated — not blocking this
spec's implementation or testing.

## Testing

- `oauth-apps.service.spec.ts`: `HttpTestingController` pattern for all 5
  methods (list, configure, rotateSecret, setActive, validateConfig).
- `oauth-apps-list.spec.ts`: no-permission gate; loads and renders all 4
  provider cards with correct Configured/Active state; clicking a card
  opens the drawer with the right provider.
- `oauth-app-detail-drawer.spec.ts`: loads provider detail on `provider`
  input change; renders backend-owned scopes/capabilities as read-only;
  manage-gated actions hidden without `platform.system_config.manage`;
  configure submits the upsert payload; rotate-secret submits correctly;
  validate-config shows the local-check-labeled result; activate/
  deactivate toggles; closes on backdrop click / close button.

## Out of Scope

- Payment Gateways, Providers landing page (future System Config
  sub-projects).
- A unified System Config sub-navigation shell tying Service Keys + OAuth
  Apps together (deferred until both exist and can be designed together).
- Any live provider API call for validation (the backend deliberately
  doesn't do this; the frontend must not imply otherwise).
