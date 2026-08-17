# Roles & Permissions Module — Design (List, Detail, Permission Editing)

## Goal

First sub-project of the "Roles & Permissions" module: let a platform admin see
existing platform roles and edit which of the 34 catalog permissions each role
grants. Replaces the currently-disabled "Roles & Permissions" sidebar item with a
working list + detail screen backed by an already-complete backend API.

## Scope

Frontend only — the backend (`PlatformAccessController`'s roles/permissions
endpoints) already exists, is fully built, and needs no changes for this
sub-project.

**In scope:** role list (read-only), role detail with an editable, module-grouped
permission checklist, saving permission changes.

**Out of scope (future sub-project):** creating a new role — no backend command
exists for this yet (`CreatePlatformRoleCommand` does not exist; only
`UpdatePlatformRolePermissionsCommand`, which edits an *existing* role, is built).
Also out of scope: renaming/deleting a role (no backend support), and any
tenant-side role/permission management (`GetTenantPermissionCatalogQuery`,
`AdminAssignTenantRolePermissionsCommand` under `DevPlatform/Tenancy` — a
different, unrelated system from platform-admin roles).

## Backend contract (existing, unchanged)

All endpoints live on `PlatformAccessController` (`admin/v1/platform-access`):

- `GET /roles` — requires `platform.roles.read`. Returns
  `PlatformRoleResponse[]`: `{ Id, Name, Description, IsSystemRole, CreatedAt }`.
- `GET /roles/{roleId}` — requires `platform.roles.read`. Returns
  `PlatformRoleDetailResponse`: `{ Id, Name, Description, IsSystemRole, CreatedAt,
  Permissions: string[] }` (the last field is the list of permission codes
  currently granted to this role).
- `GET /permissions` — requires `platform.roles.read`. Returns
  `PlatformPermissionResponse[]`: `{ Code, ModuleKey, Description, IsHighRisk }`
  — the full 34-code catalog across 18 modules.
- `PUT /roles/{roleId}/permissions` — requires `platform.roles.manage`. Body:
  `{ Permissions: string[] }` (the complete new set, not a delta). Returns `204`.

All response property names serialize as **camelCase** (no `JsonPropertyName`
overrides on any of these DTOs, so ASP.NET Core's default Web camelCase policy
applies — same situation as the Tenants list response, different from the
Tenants *detail* response which explicitly overrides to snake_case).

**Server-side safety check:** `UpdatePlatformRolePermissionsCommandHandler` calls
`ValidateRolePermissionLockoutPreventionAsync` before saving, which rejects a
change that would leave zero active platform users holding
`platform.accounts.manage`. The frontend does not replicate this logic — it just
surfaces whatever error message the backend returns if a save is rejected.

## Design

### Sidebar

`src/app/layouts/main-layout/sidebar/sidebar.html`'s "Roles & Permissions" item
changes from a disabled `<span>` to a real `<a routerLink="/roles">`, following
the exact same icon + `routerLinkActive` pattern as the Tenants/Users links added
earlier (the shield icon already used for this item's disabled state carries over
unchanged).

### Routes

`src/app/app.routes.ts` gains two children under the existing guarded
`MainLayout` route:
- `roles` → `RolesList` (new: `modules/roles/feature/roles-list/`)
- `roles/:id` → `RoleDetail` (new: `modules/roles/feature/role-detail/`)

### Data layer

New `modules/roles/data/` folder, mirroring `modules/tenants/data/`:
- `platform-role.model.ts` — `PlatformRole { id, name, description, isSystemRole,
  createdAt }`, `PlatformRoleDetail` (same fields + `permissions: string[]`),
  `PlatformPermission { code, moduleKey, description, isHighRisk }`.
- `platform-roles.service.ts` — `listRoles(): Observable<PlatformRole[]>`,
  `getRoleById(id): Observable<PlatformRoleDetail>`,
  `listPermissions(): Observable<PlatformPermission[]>`,
  `updateRolePermissions(id, permissions: string[]): Observable<void>`.
- `api-endpoints.ts` gains `roles.list`, `roles.byId(id)`, `roles.permissions`,
  `roles.updatePermissions(id)` (reusing the existing `/platform-access/roles`
  and `/platform-access/permissions` paths — no new backend routes).

Note: this is a separate, richer model from the existing
`platform-role-summary.model.ts` (`{ id, name }`, used only by the invite-manager
modal's role checkboxes) — that file and its usage stay untouched.

### RolesList component

Simple table: Name, Description, a "System" badge when `isSystemRole` is true,
Created At. No search/filter/pagination — role counts are small (a handful),
unlike tenants. `canView` computed gated on `platform.roles.read`, same inline
"No permission to view page" pattern used by Users and Tenants. Row click
navigates to `/roles/{id}`.

### RoleDetail component

Header: role name, description, "System Role" badge if applicable. Below it, the
permission checklist: fetches both the role detail (for currently-granted codes)
and the full permission catalog, groups the catalog by `moduleKey` into labeled
sections, renders one checkbox per permission (checked if its code is in the
role's current `permissions`), with a small "High risk" badge next to any
permission where `isHighRisk` is true. Local signal state tracks the
in-progress checked set separately from the loaded role, so a "Save Changes"
button (gated on `platform.roles.manage`, disabled when nothing has changed)
can diff against the original. Saving calls `updateRolePermissions` with the
full new set, shows a success/error notification via the existing
`NotificationService`, and reloads the role detail on success.

## Testing

- **Frontend:** `platform-roles.service.spec.ts` for the four service methods
  (`HttpTestingController`, mirroring `tenants.service.spec.ts`). Component tests
  for `RolesList` (permission gate, load, row-click navigation) and `RoleDetail`
  (loads role + permission catalog, groups by module, toggles checkboxes, save
  button enable/disable logic, save success/error handling), mirroring
  `tenants-list.spec.ts` / `tenant-detail.spec.ts` conventions.
- **Backend:** none needed — this is a pre-existing, already-tested API surface.
