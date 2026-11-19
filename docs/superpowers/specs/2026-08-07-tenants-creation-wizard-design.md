# Tenants Creation Wizard — Design

## Context

The Tenants module (list, detail, status actions) shipped earlier as a deliberately scoped-down
first pass, deferring tenant creation. The backend has always had full creation/provisioning
support built (`TenantsController`); this spec covers building the frontend wizard against it,
plus two gaps discovered while re-reading those contracts in detail:

1. **Dead end after creation.** A newly created tenant lands in `provisioning` status.
   `TenantDetail`'s `ACTIONS_BY_STATUS` map (`tenant-detail.ts:19-34`) only offers `Cancel` for
   that status — there is currently no way to activate a tenant once created. Confirming
   provisioning requires `GetProvisioningSummary` + `ConfirmProvisioning`, neither of which is
   wired into the frontend yet.
2. **No admin-facing subscription-plan list.** `ListSubscriptionPlansQuery` is only wired to
   `ONEVO.Api/Controllers/Tenant/Billing/SubscriptionPlansController.cs`, gated on
   `[Authorize(Policy = "TenantPolicy")]` — unusable from an admin session. The admin
   `SubscriptionPlansController` (`admin/v1/subscription-plans`) only has Create/Update/Archive,
   no List. A companion backend endpoint is needed so the wizard can offer real plans.

A third gap was found and explicitly ruled **out of scope**: the tenant-facing web app
(`front end-org/Hrms--Web-application---front-end---v1`) has no "Accept Invite" / set-password
page — `app.routes.ts` only has `login`, `legal-consent`, `continue` under `/auth`. The owner
invite email this wizard triggers will queue and send correctly (that part of the backend
already works end-to-end), but the invited owner currently has nowhere to land. This is a
separate, much larger initiative (the tenant app's entire onboarding flow) and is **not**
built as part of this feature — flagged here for a future session.

## Scope

1. **Backend:** `GET /admin/v1/subscription-plans` — list active plans for the admin console.
2. **Frontend — Tenants Creation Wizard:** a 4-step flow at `/tenants/new` (Company Details →
   Subscription → Owner Invite → Review), ending in `POST /admin/v1/tenants`.
3. **Frontend — Provisioning Checklist:** added to the existing `TenantDetail` page, shown when
   `status === 'provisioning'`. Surfaces `GetProvisioningSummary` and a "Confirm & Activate"
   action calling `ConfirmProvisioning`.

Deferred (not part of this feature): tenant-side invite-acceptance page, editing an in-progress
draft's owner invite after creation, trial/grace-period day overrides in the wizard (the backend
supports per-tenant overrides on `SubscriptionInfoRequest`, but the wizard uses the selected
plan's defaults — no UI for overriding them).

## Backend Contract Reference

All DTOs below are camelCase over the wire (default ASP.NET Core serialization, no
`JsonPropertyName` overrides) **except** `TenantDetailDto`, which already uses explicit
snake_case property names (established in the original Tenants module spec) — this
inconsistency predates this feature and is called out here so the data-layer mapping code in
Task work matches each endpoint correctly instead of assuming one convention everywhere.

### `GET /admin/v1/subscription-plans` (new)

- Auth: `AdminPolicy` + `platform.subscriptions.read` (mirrors `SubscriptionsManage` used by the
  existing Create/Update/Archive actions on the same controller — read permission already exists
  in `PlatformPermissionCatalog`).
- Reuses the existing `ListSubscriptionPlansQuery`/`ListSubscriptionPlansQueryHandler` — this is
  routing/authorization only, no new query logic.
- Response: `IReadOnlyList<SubscriptionPlanSummaryDto>`:
  ```
  { id, name, code, tier, companySizeRange, effectiveMonthlyPrice, effectiveAnnualPrice, currency, isActive }
  ```

### `GET /admin/v1/tenants/validate?slug=&company_name=&email_domain=&registration_number=&country=`

Response `TenantValidationResponseDto`:
```
{ valid: boolean, conflicts: [{ field, message }], warnings: [{ field, message }] }
```
Any subset of query params may be sent; the wizard will call this on-blur for `slug` (debounced)
during Step 1.

### `POST /admin/v1/tenants`

Request body (`CreateTenantRequest`, snake_case):
```
{
  company_name, slug, industry_profile, company_size_range,
  legal_entity_name, registration_number, country, timezone, currency,
  subscription: { plan_id, billing_cycle, commercial_model, trial_period_days?, unpaid_grace_period_days? },
  owner_invite: { email, first_name, last_name, completion_methods?, allow_google_email_mismatch?, allowed_email_domains? }
}
```
- `billing_cycle`: `"monthly"` | `"annual"`.
- `commercial_model`: free text on the backend; the wizard sends `"standard"` (no UI for this —
  every plan created through this wizard uses the same commercial model; a dedicated field can be
  added later if a second model is ever needed).
- `trial_period_days` / `unpaid_grace_period_days`: omitted — handler falls back to the plan's
  defaults.
- `owner_invite` is **required** in the wizard (see Open Question resolution below), so this is
  always populated.
- Supports the `Idempotency-Key` header (optional on the backend, but the wizard always sends
  one — a client-generated UUID per wizard session — so a double-click or a retried request after
  a network blip on the Create button doesn't create two tenants).

Response `CreateTenantDraftResponseDto` (201, camelCase):
```
{ tenantId, status: "provisioning", nextStep: "owner_invite", ownerInvite: { userId, inviteExpiresAt, deliveryStatus } }
```
On success, the wizard navigates to `/tenants/{tenantId}`.

### `GET /admin/v1/tenants/{id}/provisioning-summary`

Response `ProvisioningSummaryDto` (camelCase):
```
{
  tenantId, status,
  sections: {
    tenantDetails, subscription, modules, roles, settings, ownerInvite
  } // each: { complete: boolean, summary: {...}, missingFields: [] }
  canActivate: boolean,
  blockingErrors: [{ code, message, section }],
  warnings: [{ code, message, section }]
}
```

### `PATCH /admin/v1/tenants/{id}/provision/confirm`

Request: `{ confirm: true }`. Response: `204` on success. On `422`, the controller itself
re-fetches and returns the `ProvisioningSummaryDto` body (so the frontend can render the
blocking-errors list directly from the error response without a second round-trip).

## Frontend Design

### Data layer

- `src/app/modules/tenants/data/tenant.model.ts` — add `SubscriptionPlanSummary`,
  `TenantValidationResult`, `CreateTenantRequest` (mirrors the wizard's collected form state),
  `ProvisioningSummary` and its nested section/issue types.
- `src/app/modules/tenants/data/tenants.service.ts` — add `validate(params)`, `create(request)`
  (attaches a generated `Idempotency-Key` header), `getProvisioningSummary(id)`,
  `confirmProvisioning(id)`.
- New `src/app/modules/subscription-plans/data/subscription-plans.service.ts` — `list()` only.
  Kept as its own small module (mirrors how `roles`/`platform-users` are separate data modules)
  since Subscriptions is its own eventual admin section, not a sub-concern of Tenants.

### Step 1 — Company Details

Plain HTML `<input>`/`<select>` elements styled like the rest of the app (this codebase does not
have a shared form-control component yet — `tenants-list.html` and `platform-users-list.html`
both use native elements directly, so the wizard follows that same convention rather than
introducing a new UI primitive).

- Company Name, Slug (auto-slugified from the name via a simple lowercase/hyphenate transform,
  then freely editable — editing breaks the auto-link so typing a name afterwards won't clobber a
  manually chosen slug), Legal Entity Name, Registration Number (optional).
- Industry Profile / Company Size Range: curated `<select>` option lists (backend enforces no
  fixed enum — `NotEmpty` + max length only — so these are curated for UX/data-quality, the same
  rationale the tenant app's `general-settings-options.ts` uses for its curated dropdowns).
  Industry: Office/IT, Healthcare, Retail, Manufacturing, Education, Finance, Hospitality, Other.
  Company Size: 1-10, 11-50, 51-200, 201-500, 500+.
- Country: ISO-3166-1 alpha-3 dropdown via the `i18n-iso-countries` package (already a dependency
  of the tenant-facing app for the same purpose; adding it to `platform-administration` too).
- Timezone / Currency: `Intl.supportedValuesOf('timeZone' | 'currency')` — no new dependency.
- Slug conflict check: on blur, debounced (400ms) call to `validate({ slug })`; conflicts render
  inline under the field. Not a hard gate on the Next button — the authoritative check happens at
  Create time regardless (matches how `Validate` is also non-blocking server-side, just advisory).

### Step 2 — Subscription

- Fetches `SubscriptionPlansService.list()` on step entry; renders active plans as selectable
  cards (name, tier, price for both cycles, company size range).
- Billing cycle: Monthly/Annual radio, applies to whichever plan is selected.
- No trial/grace-period override fields (see Scope).

### Step 3 — Owner Invite (required)

- Email, First Name, Last Name — required fields, standard email format validation client-side.
- No completion-method/domain-restriction UI — omitted from the request, so the handler's
  `NormalizeCompletionMethods` fallback (`password` + `google`) applies.

### Step 4 — Review & Create

- Read-only summary of all three previous steps, grouped under their step headings.
- "Create Tenant" button calls `create()`. Errors (409 slug conflict, 400 validation) render via
  the existing `error.error?.detail` pattern used across the app; the user stays on Step 4 to
  retry rather than losing their input.
- On success: `notificationService.success('Tenant created.')`, navigate to `/tenants/{tenantId}`.

### Step navigation & state

A single `TenantWizard` component owns all form state (plain signals per field, one object per
step) and renders the active step as a child; no router sub-routes per step (keeps back/forward
simple — an internal `currentStep` signal, not the URL). Leaving the wizard via the browser back
button or a nav link away is not guarded (no "unsaved changes" prompt) — matches how no other
form in this app currently guards navigation.

### TenantDetail — Provisioning Checklist

- New section rendered above the existing status-action buttons, only when
  `tenant().status === 'provisioning'`.
- Fetches `getProvisioningSummary(id)` alongside `loadTenant()`.
- Renders each of the 6 sections with a complete/incomplete indicator and its `missingFields`
  when incomplete; `blockingErrors` and `warnings` lists at the top if non-empty.
- "Confirm & Activate" button — `variant="indigo"`, disabled when `canActivate` is false. On
  click, calls `confirmProvisioning(id)`. On success, reloads both the tenant and the summary
  (status flips away from `provisioning`, so the checklist section disappears and the normal
  `ACTIONS_BY_STATUS` set takes over). On `422`, the summary in component state is replaced with
  the one embedded in the error response body, so the blocking-errors list updates without a
  second fetch.
- This reuses the existing `ConfirmationDialog` component for the confirm step, matching the
  pattern already used for the other status actions on this page.

## Testing

Standard TDD per existing convention in this codebase: data-layer service specs (HttpTestingController),
component specs per step covering validation/navigation/submission, and the provisioning-checklist
addition to `tenant-detail.spec.ts`. Backend: a validator/handler test for the new list-plans
controller route (thin — the query/handler are already tested; this is authorization + routing).
