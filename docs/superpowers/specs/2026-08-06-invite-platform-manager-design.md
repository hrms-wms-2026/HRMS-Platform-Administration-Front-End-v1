# Invite Platform Manager — Design (Frontend)

## Goal

First of three sub-projects under "Invite Platform Manager & Configure Access".
Replaces `platform-users-list`'s "Invite Manager" button stub
(`onInviteManagerClicked()`, currently just shows an "Invite Manager is coming soon."
toast) with a real invite form, and shows pending invites in the same users table.

Companion backend spec: `HRMS-Backend-v1` repo,
`docs/superpowers/specs/2026-08-06-invite-platform-manager-design.md`.

## Scope

Frontend only. Explicitly **out of scope**: the accept-invite screen (separate
sub-project — the email link points at `/auth/accept-invite?token=...`, but that
route/screen is built later, not here) and any role-editing UI for already-active
users ("Configure Access" sub-project).

## Existing pieces this builds on

- `platform-users-list.ts` / `.html`
  (`src/app/modules/platform-users/feature/platform-users-list/`): the list screen,
  `canInvite` computed signal already gated on `permissionStore.hasPermission('platform.accounts.manage')`,
  `statusFilter` signal currently typed `'all' | 'active' | 'inactive'`.
- `PlatformUsersService` (`src/app/modules/platform-users/data/platform-users.service.ts`)
  and `PlatformUser` model — the `list()` call this screen already uses.
- Shared UI: `Button`, `StatusBadge`, `Loader`, `ErrorBanner`, `EmptyState`,
  `Pagination` (`src/app/shared/ui/`) — reuse as-is, no new shared components needed
  for the modal shell (build a page-local modal, not a new shared primitive).
- `NotificationService` — already used for the "coming soon" toast; reuse for
  success/error toasts on invite submit.

## Changes

### `PlatformUser` model / `Status` field

`isActive: boolean` becomes `status: 'active' | 'inactive' | 'pending'` (matches the
backend response change in the companion spec). `platform-users-list.ts`'s
`statusFilter` signal type and its `matchesStatus` computed logic in `filteredUsers`
extend to the third value.

### `PlatformUsersService`

Two new methods, following the existing method style in that service:
- `invite(email: string, fullName: string, roleIds: string[]): Observable<void>` —
  `POST /admin/v1/platform-access/users/invite`.
- `revokeInvite(inviteId: string): Observable<void>` —
  `POST /admin/v1/platform-access/invites/{inviteId}/revoke`.

A third method to fetch the role list for the invite form's multi-select:
- `listRoles(): Observable<PlatformRoleSummary[]>` — `GET /admin/v1/platform-access/roles`
  (id + name only, matching what the role checkboxes need).

### Invite modal

New standalone component, `src/app/modules/platform-users/feature/invite-manager-modal/invite-manager-modal.ts`
(+ `.html`, `.spec.ts`), following the reactive-forms pattern already used by
`forgot-password.ts` (`FormBuilder.nonNullable.group`, `Validators`, a `loading` /
`errorMessage` signal pair).

- Fields: email (required, email format), full name (required), roles
  (checkbox list populated from `listRoles()`, at least one required — form-level
  validator, since the backend also enforces this and the UI should catch it first).
- Submit → `PlatformUsersService.invite(...)`. On success: close the modal, show a
  success toast via `NotificationService`, and refresh `platform-users-list`'s user
  list so the new pending row appears immediately.
- On error: inline error message in the modal (reuse the same
  `role="alert"` banner pattern from `login.html`), not a toast — the user needs to
  see it while still looking at the form to fix it (e.g. duplicate email).

### `platform-users-list.ts` changes

- `onInviteManagerClicked()` opens the invite modal (a `visible` signal toggling the
  modal component in the template) instead of showing the "coming soon" toast.
- On the modal's successful-invite output, call the existing `loadUsers()` to refresh.
- Pending rows: `StatusBadge` already takes a status string — pass `'pending'` through
  for invite rows and give it a distinct color in `StatusBadge` if it doesn't already
  handle a third state (check `shared/ui/status-badge/status-badge.ts` at
  implementation time; extend its variant map if needed, rather than special-casing
  pending styling inline in `platform-users-list.html`).
- Pending rows get a "Revoke" action instead of whatever action real users get in that
  row (e.g. no "view details" for a row with no real account yet) — exact per-row
  action-menu wiring is an implementation detail for the plan, not fixed here.

## Testing

- `invite-manager-modal.spec.ts`: form validation (email format, full name required,
  at least one role required), successful submit calls `PlatformUsersService.invite`
  with the right arguments and emits a success event, failed submit shows the inline
  error and does not close the modal.
- `platform-users-list.spec.ts` additions: clicking "Invite Manager" opens the modal;
  a successful invite (simulated via the modal's output) triggers a list reload;
  pending rows render with the "pending" status badge and a revoke action.

## Out of scope (explicitly deferred to other sub-projects)

- `/auth/accept-invite` screen.
- Role-editing UI for existing active users.
- Resend-invite UI.
