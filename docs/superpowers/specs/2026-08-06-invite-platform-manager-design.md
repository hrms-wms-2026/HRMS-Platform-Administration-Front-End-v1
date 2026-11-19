# Invite Platform Manager — Design (Frontend, v2)

## Goal

Sub-project 2 of "Invite Platform Manager & Configure Access". Replaces
`platform-users-list`'s "Invite Manager" button stub with a real invite form, shows
pending invites in the same users table, and builds the invited person's
accept-invite experience (unauthenticated: set password → access activated).

Companion backend spec: `HRMS-Backend-v1` repo, same filename under
`docs/superpowers/specs/`.

**Release rule (from the backend spec):** invite-sending and invite-acceptance ship
together — this spec covers both, in that order, as two tasks in the implementation
plan.

## Scope

Frontend only. Out of scope: role creation/permission-editing UI ("Configure Access").

## Existing pieces this builds on

- `platform-users-list.ts`/`.html`: `canInvite` computed signal already gated on
  `platform.accounts.manage`; `statusFilter` signal currently
  `'all' | 'active' | 'inactive'`.
- `PlatformUsersService` / `PlatformUser` model.
- Auth-flow screens (`forgot-password`, `reset-password`) under
  `modules/auth/feature/` — the accept-invite screens follow the exact same
  reactive-forms + signals + `AuthLayout` pattern, since the invited person isn't
  logged in, same as those two.
- `AuthLayout` (`layouts/auth-layout/`) — accept-invite renders inside this, not
  `MainLayout`, matching login/forgot-password/reset-password.

## Changes

### `PlatformUser` model / `Status` field

`isActive: boolean` → `status: 'active' | 'inactive' | 'pending'` (matches the backend
response change). `statusFilter` signal type and `filteredUsers`'s `matchesStatus`
logic extend to the third value.

### `PlatformUsersService`

- `invite(email: string, fullName: string, roleIds: string[]): Observable<void>` —
  `POST /admin/v1/platform-access/users/invite`.
- `revokeInvite(inviteId: string): Observable<void>` —
  `POST /admin/v1/platform-access/invites/{inviteId}/revoke`.
- `listRoles(): Observable<PlatformRoleSummary[]>` —
  `GET /admin/v1/platform-access/roles` (id + name, for the invite form's role
  checkboxes).

### `AuthService` (new methods, unauthenticated — mirrors `forgotPassword`/`resetPassword`)

- `acceptInvite(token: string, password: string): Observable<void>` —
  `POST /admin/v1/auth/accept-invite`.

### Invite modal

New standalone component,
`src/app/modules/platform-users/feature/invite-manager-modal/invite-manager-modal.ts`
(+ `.html`, `.spec.ts`), reactive-forms pattern from `forgot-password.ts`
(`FormBuilder.nonNullable.group`, `loading`/`errorMessage` signals).

- Fields: email (required, email format), full name (required), roles (checkboxes
  from `listRoles()`, at least one required — client-side validator backing the
  backend's own rejection).
- Submit → `PlatformUsersService.invite(...)`. Success: close modal, success toast via
  `NotificationService`, `platform-users-list`'s `loadUsers()` refresh so the new
  pending row appears.
- Error: inline banner in the modal (same `role="alert"` pattern as `login.html`), not
  a toast — user needs to see it while fixing the form (e.g. duplicate email).

### `platform-users-list.ts` changes

- `onInviteManagerClicked()` opens the modal instead of the "coming soon" toast.
- Modal's successful-invite output triggers `loadUsers()`.
- `StatusBadge` gets a third variant for `'pending'` (check
  `shared/ui/status-badge/status-badge.ts`'s variant map at implementation time;
  extend it there rather than special-casing pending styling inline in the list
  template).
- Pending rows get a "Revoke" action instead of whatever action real users get in
  that row.

### Accept-invite screens (new `auth` module screens, mirroring `forgot-password`/`reset-password`)

Two screens, both under `modules/auth/feature/`, both routed under the existing
`AuthLayout` children in `app.routes.ts` (alongside `login`, `mfa-verify`,
`forgot-password`, `reset-password`):

1. **`accept-invite`** (`path: 'accept-invite'`) — reads `?token=` from the route,
   shows a set-password form (password + confirm-password fields, same validators
   `ResetPassword` already uses — check `reset-password.ts` for the exact rule set
   and reuse it rather than redefining password strength rules in a second place).
   Submit → `AuthService.acceptInvite(token, password)`.
   - Success: navigate to a confirmation state (either a third route,
     `access-activated`, or a `submitted` signal flipping the same component's
     template to a success view — follow whichever `forgot-password.ts` already
     established for its own post-submit state, for consistency within the module).
   - Error states, distinct messages (matches the backend's distinct usability-check
     messages, unlike the generic reset-password error): "This invitation has already
     been accepted", "This invitation has been revoked", "This invitation has
     expired", "Invitation not found" (bad/tampered token) — each with a "Go to
     sign in" link, since none of them are retryable from this screen.
2. Confirmation view: "Access activated" message + a "Sign in" button/link to
   `/auth/login`. No auto-login (backend spec's explicit decision) — the person signs
   in normally with the password they just set.

## Testing

- `invite-manager-modal.spec.ts`: form validation (email format, full name required,
  at least one role required), successful submit calls the service correctly and
  emits a success event, failed submit shows the inline error without closing.
- `platform-users-list.spec.ts` additions: "Invite Manager" opens the modal;
  successful invite triggers reload; pending rows show the pending badge + revoke
  action.
- `accept-invite.spec.ts`: renders the set-password form with the token from the
  route; each of the four distinct error cases (not found / accepted / revoked /
  expired) renders its specific message; successful submit shows the confirmation
  view.

## Out of scope

- Role creation / permission-editing UI.
- Resend-invite UI.
