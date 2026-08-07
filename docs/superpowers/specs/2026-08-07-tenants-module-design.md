# Tenants Module — Design (List, Detail, Status Actions)

## Goal

First sub-project of the "Tenants" module: let a platform admin see, search, and
manage the lifecycle status of existing tenants. Replaces the currently-disabled
"Tenants" concept in the app (there's no sidebar entry for it yet — this adds one)
with a working list + detail screen backed by an already-complete backend API.

## Scope

Frontend only — the backend (`TenantsController`, `ListTenantsQuery`,
`GetTenantByIdQuery`, `ChangeTenantStatusCommand`) already exists, is fully built,
and needs no changes for this sub-project.

**In scope:** tenant list (search, status filter, pagination), tenant detail view,
status transitions (suspend/unsuspend/activate/cancel).

**Out of scope (future sub-project — the tenant creation wizard):** creating a new
tenant, editing draft fields (`PATCH /admin/v1/tenants/{id}`), the provisioning
checklist (`GET .../provisioning-summary`, `PATCH .../provision/confirm`), and
tenant-owner invite (`POST .../invite-admin`). All of these only apply to a tenant
still in the `Provisioning` step, which nothing in this sub-project can create yet.
Also out of scope: the `plan_code` list filter (would need a separate "list plans"
endpoint just to populate its dropdown — not worth the extra scope for a first pass).

## Backend contract (existing, unchanged)

- `GET /admin/v1/tenants?search=&status=&plan_code=&page=&page_size=` — requires
  `platform.tenants.read`. Returns `TenantListResponseDto { Items: TenantListItemDto[], Total, Page, PageSize }`,
  where `TenantListItemDto = { Id, Name, Slug, Status, CreatedAt }`.
- `GET /admin/v1/tenants/{id}` — requires `platform.tenants.read`. Returns
  `TenantDetailDto` (snake_case JSON): `id, company_name, slug, industry_profile,
  company_size_range, status, subscription_plan_id, settings_json,
  legal_entity_name, registration_number, country, currency, created_at, updated_at`.
- `PATCH /admin/v1/tenants/{id}/status` — requires `platform.tenants.manage`. Body:
  `{ action: string, reason?: string }`. Returns `204` on success, `409` if the
  action doesn't apply to the tenant's current status.

**Valid status transitions** (from `ChangeTenantStatusCommandHandler`, action names
are case-insensitive on the backend):

| Current status | Available actions | Resulting status |
|---|---|---|
| `Provisioning` | `cancel` | `Cancelled` |
| `Trial` | `activate` (or `unsuspend`, same effect) | `Active` |
| `Trial` | `suspend` | `Suspended` |
| `Active` | `suspend` | `Suspended` |
| `Active` | `cancel` | `Cancelled` |
| `Suspended` | `unsuspend` (or `activate`, same effect) | `Active` |
| `Suspended` | `cancel` | `Cancelled` |
| `Cancelled` | *(none — terminal state)* | — |

For the UI, each status maps to exactly one "primary" action label to avoid
offering two buttons that do the same thing:
- `Provisioning` → **Cancel**
- `Trial` → **Activate**, **Suspend**
- `Active` → **Suspend**, **Cancel**
- `Suspended` → **Unsuspend**, **Cancel**
- `Cancelled` → no buttons

## Design

### Sidebar

`src/app/layouts/main-layout/sidebar/sidebar.html` gets a new real (non-"Coming
soon") item, **Tenants**, inserted between Dashboard and Users — matching the icon +
`routerLinkActive` pattern already used for those two. Icon: a simple building/
briefcase outline (new inline SVG, same convention as the existing icons).

### Route

`src/app/app.routes.ts` gains two children under the existing guarded `MainLayout`
route group:
- `tenants` → `TenantsList` (new: `modules/tenants/feature/tenants-list/`)
- `tenants/:id` → `TenantDetail` (new: `modules/tenants/feature/tenant-detail/`)

### Data layer

New `modules/tenants/data/` folder, mirroring `modules/platform-users/data/`:
- `tenant.model.ts` — `TenantListItem { id, name, slug, status, createdAt }` and
  `TenantDetail { id, companyName, slug, industryProfile, companySizeRange, status,
  subscriptionPlanId, settingsJson, legalEntityName, registrationNumber, country,
  currency, createdAt, updatedAt }` (camelCase on the frontend; the service maps the
  snake_case detail response).
- `tenants.service.ts` — `list(params): Observable<TenantListResponse>`,
  `getById(id): Observable<TenantDetail>`,
  `changeStatus(id, action, reason?): Observable<void>`.
- `api-endpoints.ts` gains `tenants.list`, `tenants.byId(id)`, `tenants.status(id)`.

### TenantsList component

`modules/tenants/feature/tenants-list/` — same shape as `PlatformUsersList`:
signals for `search`, `statusFilter`, `page`; a `canView` computed gated on
`platform.tenants.read` (same inline "No permission to view page" pattern as
Users, since the dedicated redesign of that state is still a separate deferred
item); table rendering `Name / Slug / Status / Created At`; clicking a row
navigates to `/tenants/{id}`.

### TenantDetail component

`modules/tenants/feature/tenant-detail/` — reads `:id` from the route, calls
`TenantsService.getById`, renders the Company Identity fields read-only (same
labeled-field layout convention as the invite modal / settings-style forms already
in the app), a status badge, and the action buttons table above ("Suspend",
"Cancel", etc., whichever apply to the current status). `canManage` computed gated
on `platform.tenants.manage` controls whether the action buttons render at all
(view-only for someone with only `platform.tenants.read`).

Each action button opens the existing, currently-unused
`shared/ui/confirmation-dialog` component with an optional reason `<textarea>`,
confirming calls `TenantsService.changeStatus(id, action, reason)`, then reloads
the detail view to reflect the new status (and re-evaluates which action buttons
are now valid).

## Testing

- **Frontend:** component tests for `TenantsList` (search/status filtering,
  pagination, permission-gated empty state, row-click navigation) and
  `TenantDetail` (renders detail fields, shows the correct action buttons per
  status, confirmation dialog wiring, reload-after-status-change), mirroring
  `platform-users-list.spec.ts` and `invite-manager-modal.spec.ts` conventions.
  `tenants.service.spec.ts` for the three service methods (`HttpTestingController`).
- **Backend:** none needed — existing `TenantsAdminApiIntegrationTests.cs` already
  covers this API surface.
