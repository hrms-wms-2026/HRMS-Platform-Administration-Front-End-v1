# System Config: Platform Service Keys Design

## Problem

The "Platform Configuration" pillar has no frontend yet. The backend already
fully implements a `system-config` area spanning four resource types
(Service Keys, OAuth Apps, Payment Gateways, Providers) with ~20 endpoints
handling sensitive credential material (API keys, OAuth secrets, payment
gateway credentials). This is too large for one plan, so it is decomposed
into one sub-project per resource type. This spec covers the first:
**Platform Service Keys**.

## Scope

A screen for platform admins to manage ONEVO-owned service credentials
(Resend, SendGrid, Cloudflare, Cloudflare R2, AWS Rekognition) — the
platform-wide API keys the backend itself uses to talk to third-party
services, not per-tenant integration credentials.

Out of scope for this spec (separate future sub-projects): OAuth Apps,
Payment Gateways, a general Providers landing page. Also out of scope:
Configuration Templates (a different, unrelated feature — tenant-onboarding
module/permission bundles, not platform-wide settings).

## Backend (already built, zero backend work)

Controller: `src/ONEVO.Api/Controllers/Admin/DevPlatform/SystemConfig/PlatformServiceKeysController.cs`

| Method | Route | Purpose |
|---|---|---|
| GET | `/admin/v1/system-config/service-keys` | List all service keys (no secrets) |
| GET | `/admin/v1/system-config/service-keys/{serviceKey}` | Get one (no secrets) |
| POST | `/admin/v1/system-config/service-keys` | Create — encrypts `apiKey` before storage |
| PUT | `/admin/v1/system-config/service-keys/{serviceKey}` | Update `displayName` only |
| POST | `/admin/v1/system-config/service-keys/{serviceKey}/rotate-key` | Replace the encrypted key |
| POST | `/admin/v1/system-config/service-keys/{serviceKey}/verify` | Verify the saved key (no body); stamps `lastVerifiedAt` |
| POST | `/admin/v1/system-config/service-keys/{serviceKey}/activate` | Set `isActive = true` |
| POST | `/admin/v1/system-config/service-keys/{serviceKey}/deactivate` | Set `isActive = false` |

Controller: `src/ONEVO.Api/Controllers/Admin/DevPlatform/SystemConfig/SystemConfigProviderOptionsController.cs`

| Method | Route | Purpose |
|---|---|---|
| GET | `/admin/v1/system-config/service-key-providers` | Dropdown options for the Create flow |

**Response DTOs** (`PlatformServiceKeyResponses.cs`, `ProviderOptionDto.cs`):

```csharp
class PlatformServiceKeyDto {
  Guid Id; string ServiceKey; string DisplayName; bool IsActive;
  DateTimeOffset? LastVerifiedAt; Guid UpdatedById; DateTimeOffset UpdatedAt;
}
class ServiceKeyVerificationResultDto {
  bool Success; DateTimeOffset CheckedAt; string Message;
}
class ProviderOptionDto {
  string ProviderKey; string DisplayName; bool Configured; bool IsActive;
}
```

**Request DTOs:**

```csharp
class CreatePlatformServiceKeyRequest { string ServiceKey; string DisplayName; string ApiKey; }
class UpdatePlatformServiceKeyRequest { string DisplayName; }
class RotatePlatformServiceKeyRequest { string ApiKey; }
```

**Security constraint that shapes the whole design:** neither the plaintext
nor the encrypted API key is ever present in any response. The frontend
must never attempt to display, cache, or pre-fill a key value — the API key
input field only ever *sends* a value (on Create and Rotate), never
receives one.

**Known backend validation/conflict rules the UI must handle:**
- Create: 409 if `serviceKey` already exists ("...already exists. Use
  rotate-key to replace its credential.").
- Create: 409 if the provider is a transactional-email provider
  (SendGrid/Resend) and another transactional-email provider is already
  active — the operator must deactivate the existing one first; the
  backend never auto-deactivates.
- Create: 400 for invalid slug, missing/too-long display name, missing API
  key, or a `serviceKey` that isn't an active provider in the catalog.

## Permissions

- `platform.system_config.read` — view the list.
- `platform.system_config.manage` — create, update, rotate, verify,
  activate, deactivate. Marked `isSensitive: true` in the backend catalog.

## Frontend Architecture

Mirrors the Roles module's flat list pattern (no detail page — the
resource has too few editable fields to justify one).

```
service-keys/
  data/
    service-key.model.ts        // ServiceKey, ProviderOption interfaces
    service-keys.service.ts     // list, listProviders, create, update,
                                 // rotateKey, verify, setActive
  feature/
    service-keys-list/
      service-keys-list.ts/html/spec.ts
    add-service-key-modal/
      add-service-key-modal.ts/html/spec.ts
    rotate-service-key-modal/
      rotate-service-key-modal.ts/html/spec.ts
```

### `ServiceKeysList`

- Permission gate on `platform.system_config.read` (mirrors
  `AuditLogsList`'s `canView` pattern).
- Loads and renders a table: Service Key, Display Name, Status badge
  (Active/Inactive), Last Verified (`—` if null, else formatted date),
  Updated At.
- Row actions, each gated on `platform.system_config.manage` (hidden
  entirely without it, mirroring `SubscriptionPlanDetail`'s
  `canManage`-gated Edit/Archive buttons):
  - **Verify** — calls verify, shows the returned `message` as a toast
    (success or error tone based on `success`).
  - **Activate / Deactivate** — single toggle button reflecting current
    `isActive`, calls the matching endpoint, reloads the row.
  - **Rotate Key** — opens `RotateServiceKeyModal`.
  - **Edit Name** — inline-editable display name (click to edit, blur/enter
    to save via the update endpoint) — no modal needed, single field.
- "Add Service Key" button (manage-gated) opens `AddServiceKeyModal`.

### `AddServiceKeyModal`

- On open, calls `listProviders()` and renders a dropdown of
  `ProviderOptionDto` entries. Options where `configured === true` are
  disabled (already have a key — the operator should use Rotate instead),
  matching the backend's own conflict rule instead of duplicating it
  client-side with a hardcoded list.
- Fields: provider dropdown (sets `serviceKey`), Display Name text input,
  API Key password-type input (never displayed back, cleared on
  close/submit).
- Submit calls `create()`; surfaces the backend's error `detail` message
  verbatim on 400/409 (matches `SubscriptionPlanDetail`'s
  `error.error?.detail ?? fallback` convention), including the
  transactional-email-conflict message.

### `RotateServiceKeyModal`

- Single API Key password-type input, no pre-filled value (nothing to
  pre-fill — the backend never returns it).
- Submit calls `rotateKey(serviceKey, apiKey)`, closes on success, parent
  list reloads to reflect updated `updatedAt`.

## Routing & Navigation

New route: `path: 'system-config/service-keys'` → `ServiceKeysList`, added as
a child under the existing `''` (main-layout) route group in
`app.routes.ts`, alongside `audit-logs` and `subscription-plans`.

The sidebar's existing disabled "Settings" placeholder
(`src/app/layouts/main-layout/sidebar/sidebar.html`) is converted to an
active link pointing at `/system-config/service-keys`, following the exact
same disabled-span-to-`routerLink`-anchor conversion pattern used for
Subscription Plans and Audit Logs earlier this session. This is the first
screen under what will become a broader "System Config" area as OAuth
Apps/Payment Gateways sub-projects are added later — those will likely
need their own sub-nav (tabs or a settings-shell layout), but that's
out of scope here; for this spec, "Settings" just links straight to the
Service Keys list.

## Testing

- `service-keys.service.spec.ts`: `HttpTestingController` pattern for all
  7 service methods (list, listProviders, create, update, rotateKey,
  verify, activate, deactivate) — mirrors `audit-logs.service.spec.ts`.
- `service-keys-list.spec.ts`: no-permission gate hides the page; loads and
  displays real rows; manage-gated actions hidden without
  `platform.system_config.manage`; verify shows success/error toast;
  activate/deactivate toggles; opens Add/Rotate modals.
- `add-service-key-modal.spec.ts`: loads and renders provider options;
  already-configured providers are disabled in the dropdown; submit calls
  create with correct payload; displays backend conflict/validation error
  messages verbatim.
- `rotate-service-key-modal.spec.ts`: submit calls rotateKey with the typed
  value; closes on success.

## Out of Scope

- OAuth Apps, Payment Gateways, Providers landing page (separate future
  sub-projects under the same System Config pillar).
- Configuration Templates (unrelated feature).
- Any UI attempt to display or cache a plaintext/encrypted key value — the
  backend never returns one, so there is nothing to build here.
