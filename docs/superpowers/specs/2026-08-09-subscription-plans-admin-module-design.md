# Subscription Plans Admin Module — Design

**Context:** Part of the "Platform Administration" pillar's Subscription & Billing sub-feature, needed for an internal review demo (~38 hours out at design time). Backend CRUD for subscription plans already exists: `Create`/`Update`/`Archive` merged to `development`; `List` (PR #47, branch `feature/admin-subscription-plans-list`) and `GetById` (branch `feature/admin-subscription-plan-detail-endpoint`, built as a companion piece to this design) are on unmerged branches and need merging before this module works end-to-end against a real running backend.

**Standing rule:** No dummy/mock data anywhere — every screen built here must be fully functional against the real backend endpoints listed below, matching this session's established TDD/testing rigor.

## Backend API surface (all under `AdminPolicy`)

| Method | Path | Permission | Body / Response |
|---|---|---|---|
| GET | `/admin/v1/subscription-plans` | `platform.subscriptions.read` | → `SubscriptionPlanSummaryDto[]` |
| GET | `/admin/v1/subscription-plans/{id}` | `platform.subscriptions.read` | → `SubscriptionPlanDetailDto` |
| POST | `/admin/v1/subscription-plans` | `platform.subscriptions.manage` | `CreateSubscriptionPlanRequest` → `SubscriptionPlanDetailDto` (409 if `code` exists, 400 if unknown module keys) |
| PATCH | `/admin/v1/subscription-plans/{id}` | `platform.subscriptions.manage` | `UpdateSubscriptionPlanRequest` (partial) |
| DELETE | `/admin/v1/subscription-plans/{id}` | `platform.subscriptions.manage` | 204, soft-delete (`isActive = false`) |
| GET | `/admin/v1/modules/catalog` | `platform.modulecatalog.read` | → `ModuleCatalogListDto[]` (already merged) — powers the Module Keys picker |

**Field validation** (server-authoritative, mirrored client-side): `name` required ≤100 chars; `code` required ≤20 chars, `^[a-z0-9_]+$`, immutable after create; `tier` required ≤50 chars; `companySizeRange` required, `^\d+(-\d+|\+)$`; `moduleKeys` ≥1 entry; `currency` required, exactly 3 chars; `trialPeriodDays`/`unpaidGracePeriodDays` ≥0; override prices and AI token limit optional, no range constraint.

## Data layer

Extend (not replace) the existing `src/app/modules/subscription-plans/data/` files — `SubscriptionPlanSummary`/`list()` stay unchanged since the Tenant Wizard already depends on them:

- `subscription-plan.model.ts` — add `SubscriptionPlanDetail`, `CreateSubscriptionPlanRequest`, `UpdateSubscriptionPlanRequest`.
- `subscription-plans.service.ts` — add `getById(id)`, `create(request)`, `update(id, request)`, `archive(id)`.
- `api-endpoints.ts` — extend `subscriptionPlans` with `byId`, `create`, `update`, `archive`.
- New `src/app/modules/module-catalog/data/module-catalog.model.ts` + `module-catalog.service.ts` — thin wrapper over `GET /admin/v1/modules/catalog`.

## Routes and navigation

- `/subscription-plans` (list), `/subscription-plans/new` (create), `/subscription-plans/:id` (detail/edit) added to `app.routes.ts`, under the existing `authGuard`-protected shell.
- Sidebar (`sidebar.html`): new active "Subscription Plans" nav item, same visual pattern as Tenants/Users/Roles.

## Components

Mirrors the Tenants module's List + Create + Detail structure:

- **`subscription-plans-list`** — table of all plans (Name, Code, Tier, Company Size, effective price, Currency, Active/Archived badge). "Create Plan" button gated by `platform.subscriptions.manage`; row click navigates to detail. View gated by `platform.subscriptions.read` (same `canView`/`ngOnInit` guard pattern as `RolesList`).
- **`subscription-plan-form`** — shared reactive-form component, `mode: 'create' | 'edit'` input, reused by both the create page and the detail page's edit state (10 of 11 fields overlap; only `code` is create-only/disabled-on-edit). Fields: Name, Code, Tier (free text), Company Size (dropdown, reuses `COMPANY_SIZE_OPTIONS` from `tenant-options.ts`), Module Keys (multi-select checkboxes populated from `module-catalog.service.ts`), Currency (dropdown, reuses `CURRENCY_CODE_OPTIONS`), Override Monthly Price, Override Annual Price, AI Token Limit (all optional numbers), Trial Period Days, Unpaid Grace Period Days.
- **`subscription-plan-create`** (route `/subscription-plans/new`) — hosts the form in create mode; on success navigates to `/subscription-plans/:id` for the new plan.
- **`subscription-plan-detail`** (route `/subscription-plans/:id`) — view mode showing all `SubscriptionPlanDetail` fields; an edit toggle switches to the shared form pre-filled with current values; Archive action (gated by `platform.subscriptions.manage`) uses `ConfirmationDialog` with `(cancel)="..."`/`(confirm)="..."` bindings, matching `development`'s current (not-yet-renamed) `ConfirmationDialog` API — the pending `fix/rename-modal-close-cancel-outputs` branch will need a small follow-up rename commit here once merged, not designed around now.

## Error handling

- List/detail fetch failures → existing `ErrorBanner` + retry pattern (matches Roles/Tenants).
- Create/Update failures → `NotificationService.error()` with the server's message; 409 (duplicate code) and 400 (unknown module keys) surface directly since the backend already returns human-readable `Problem` details.
- Archive failure → `NotificationService.error()`, dialog stays open for retry.

## Testing

Jest specs for every new/extended file — service specs (HTTP call shape, matching `platform-roles.service.spec.ts`'s `HttpTestingController` pattern), component specs for list/form/create/detail (loading/error/permission-gating states, matching `roles-list.spec.ts`/`role-detail.spec.ts`), targeting this session's established ~90% coverage bar. No e2e impact — none of these routes are in the public-route e2e scope from item #13.
