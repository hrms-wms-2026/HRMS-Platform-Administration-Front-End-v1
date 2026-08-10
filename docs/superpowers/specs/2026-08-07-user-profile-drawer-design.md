# User Profile Drawer — Design (Info + Role Editing)

## Goal

Replace the current no-op row click in the Users list with a slide-over drawer
showing the clicked user's profile: identity info, status, and an editable role
checklist. First sub-project of "User profile drawer" — session management
(active sessions list, revoke) is a deferred follow-up.

## Scope

**In scope:** a `UserProfileDrawer` component opened by clicking a Users-list row,
showing user info (name, email, status, created/last-login) and an editable role
checklist, saveable via the existing `UpdatePlatformUserRolesCommand`.

**Out of scope (future sub-project):** active session list + revoke actions
(`GET /users/{id}/sessions`, `POST /users/{id}/sessions/{sessionId}/revoke`,
`POST /users/{id}/sessions/revoke-all` — all already backend-ready, `platform.security.manage`-gated, just not built into this pass).

**Small required backend fix (not purely additive — see below):**
`PlatformUserDetailResponse` and `PlatformAccessMapper.MapDetail` are stale —
they predate this session's earlier change of `PlatformUser.Status` from a
boolean `IsActive` to a three-state string (`pending`/`active`/`inactive`).
Currently `MapDetail` crams `user.FullName` into the DTO's `FirstName` slot,
leaves `LastName` always `null`, and collapses `Status` back into a boolean
(`IsActive = Status == "active"`), which means a `Pending` user and a genuinely
`Inactive` user would be indistinguishable through this endpoint — the exact bug
the list-response DTO (`PlatformUserResponse`) already had fixed earlier this
session. This sub-project fixes the *detail* response the same way.

## Backend contract

### Fix: `PlatformUserDetailResponse` (`DTOs/Responses/PlatformUserDetailResponse.cs`)

Before:
```csharp
public record PlatformUserDetailResponse(
    Guid Id, string Email, string? FirstName, string? LastName, bool IsActive,
    DateTimeOffset CreatedAt, DateTimeOffset? LastLoginAt,
    IReadOnlyList<PlatformRoleResponse> Roles);
```

After:
```csharp
public record PlatformUserDetailResponse(
    Guid Id, string Email, string FullName, string Status,
    DateTimeOffset CreatedAt, DateTimeOffset? LastLoginAt,
    IReadOnlyList<PlatformRoleResponse> Roles);
```

`PlatformAccessMapper.MapDetail(PlatformUser, IEnumerable<PlatformRole>)` updates
to pass `user.FullName` and `user.Status` directly (same pattern as the existing
`Map(PlatformUser, string)` overload used for the list response).

### Existing, unchanged

- `GET /admin/v1/platform-access/users/{platformUserId}` — requires
  `platform.accounts.read`. Returns the fixed `PlatformUserDetailResponse`
  above (camelCase JSON, no property overrides: `id, email, fullName, status,
  createdAt, lastLoginAt, roles: [{ id, name, description, isSystemRole,
  createdAt }]`).
- `PUT /admin/v1/platform-access/users/{platformUserId}/roles` — requires
  `platform.roles.manage` (**not** `platform.accounts.manage` — confirmed
  from `UpdatePlatformUserRolesCommandHandler`, which checks
  `RolesManage` explicitly). Body: `{ roleIds: string[] }`. Returns `204`.
  Server-side lockout-prevention check applies here too
  (`ValidateUserRoleLockoutPreventionAsync`), same pattern as the Roles module's
  permission-editing save — the frontend surfaces `error.detail`, no client-side
  replication.

## Design

### Trigger

`PlatformUsersList`'s table rows get a click handler that opens the drawer with
the clicked user's `id`, instead of doing nothing. Existing row content/columns
are unchanged.

### UserProfileDrawer component

New `modules/platform-users/feature/user-profile-drawer/`. A fixed-position
right-side slide-over panel (custom markup — a backdrop `<div>` plus a `w-96
h-full` panel sliding from the right — not the existing centered `Modal`
component, whose layout doesn't fit a drawer), opened/closed via an `open` input
and `closed` output, matching the existing `LogoutConfirmModal`/
`InviteManagerModal` convention of self-contained overlay components (not
reusing `Modal`/`ConfirmationDialog` directly, same as those two).

Contents:
- Header: avatar-style initials circle (reusing the same `initials()` helper
  logic already in `PlatformUsersList`), full name, email, status badge
  (reusing the same tone mapping already used in the Users list table:
  `pending` → warning, `active` → success, `inactive` → danger).
- Meta: Created At, Last Login (or "Never" if null).
- Role checklist: fetches `PlatformUsersService.listRoles()` (existing,
  `{ id, name }` — already used by the invite-manager modal, no need for the
  richer `PlatformRolesService` from the separate, not-yet-merged Roles module),
  pre-checked against the user's current `roles` from the detail response,
  diff-tracked the same way `RoleDetail` tracks `hasChanges`. "Save Changes"
  button gated on `platform.roles.manage`, disabled until something changes.
  Saving calls the roles-update endpoint, shows a success/error notification via
  `NotificationService`, and reloads the drawer's data on success.
- View-only fallback: if the viewer lacks `platform.roles.manage`, the checklist
  still renders (reflecting current roles) but every checkbox is disabled and no
  Save button shows — same read-vs-manage split as `RoleDetail`.

### Data layer changes

`PlatformUsersService` gains two methods:
- `getUserById(id): Observable<PlatformUserDetail>` —
  `GET /platform-access/users/{id}`.
- `updateUserRoles(id, roleIds: string[]): Observable<void>` —
  `PUT /platform-access/users/{id}/roles`.

New `PlatformUserDetail` interface in `platform-user.model.ts`:
`{ id, email, fullName, status, createdAt, lastLoginAt, roles: PlatformRoleSummary[] }`
(reuses the existing `PlatformRoleSummary` model).

## Testing

- **Backend:** no existing unit test covers `GetPlatformUserDetailQueryHandler`
  or `PlatformAccessMapper.MapDetail` (confirmed — grepping the test tree finds
  nothing). Add a new one asserting `MapDetail` returns `FullName`/`Status`
  correctly (e.g. a `Pending` user maps to `Status: "pending"`, not collapsed to
  a boolean).
- **Frontend:** `platform-users.service.spec.ts` gains cases for the two new
  methods. New `user-profile-drawer.spec.ts` covering: loads user detail on
  open, renders info fields, pre-checks current roles, tracks changes, saves
  and reloads on success, shows backend error detail on failure, disables
  checkboxes/hides Save when the viewer lacks `platform.roles.manage`.
  `platform-users-list.spec.ts` gains a case confirming row click opens the
  drawer with the right user id.
