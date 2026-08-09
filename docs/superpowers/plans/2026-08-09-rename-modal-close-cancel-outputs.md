# Rename Modal.close / ConfirmationDialog.cancel Outputs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename `Modal`'s `close` output to `closed` and `ConfirmationDialog`'s `cancel` output to `cancelled`, updating every call site, so the `@angular-eslint/no-output-native` lint override in `eslint.config.js` can be deleted and the rule goes back to its default `error` severity with a clean tree.

**Architecture:** Pure rename across 2 component files, 1 spec file, and 1 consumer template. No new behavior, no new tests — existing tests already cover the emit behavior and just need their property names updated to match.

**Tech Stack:** Angular 21 (`output()` signal-based outputs), Jest, `ng lint` (`@angular-eslint`).

## Global Constraints

- No behavior change — this is a rename only. Every existing passing test must still pass after the rename, just referencing the new property names.
- `<app-modal>` has exactly one consumer in the codebase (`ConfirmationDialog`). `<app-confirmation-dialog>` has exactly two consumers, both in `tenant-detail.html`. No other files reference `.close` or `.cancel` on these components.
- Repo root: `C:\Users\User\OneDrive\Desktop\onexso\platform-administration`. Branch: create fresh off up-to-date `origin/development`.

---

### Task 1: Rename `Modal.close` → `Modal.closed`

**Files:**
- Modify: `src/app/shared/ui/modal/modal.ts`

**Interfaces:**
- Produces: `Modal.closed: OutputEmitterRef<void>` (was `Modal.close`) — Task 2 binds to this renamed output.

- [ ] **Step 1: Create the branch**

```bash
git fetch origin development
git checkout -b fix/rename-modal-close-cancel-outputs origin/development
```

- [ ] **Step 2: Rename the output in `modal.ts`**

Replace the full file content:

```typescript
import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-modal',
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-slate-900/50" (click)="closed.emit()"></div>
        <div class="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
          @if (title()) {
            <h2 class="mb-4 text-lg font-semibold text-slate-900">{{ title() }}</h2>
          }
          <ng-content></ng-content>
        </div>
      </div>
    }
  `,
})
export class Modal {
  readonly open = input.required<boolean>();
  readonly title = input<string>('');
  readonly closed = output<void>();
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/shared/ui/modal/modal.ts
git commit -m "refactor: rename Modal.close output to closed"
```

Note: this commit alone leaves `confirmation-dialog.ts` referencing the now-nonexistent `(close)` binding — it will not compile until Task 2 lands. That's expected; Task 2 follows immediately.

---

### Task 2: Rename `ConfirmationDialog.cancel` → `ConfirmationDialog.cancelled`

**Files:**
- Modify: `src/app/shared/ui/confirmation-dialog/confirmation-dialog.ts`
- Modify: `src/app/shared/ui/confirmation-dialog/confirmation-dialog.spec.ts`

**Interfaces:**
- Consumes: `Modal.closed` (from Task 1).
- Produces: `ConfirmationDialog.cancelled: OutputEmitterRef<void>` (was `ConfirmationDialog.cancel`) — Task 3 binds to this renamed output.

- [ ] **Step 1: Rename in `confirmation-dialog.ts`**

Replace the full file content:

```typescript
import { Component, input, output } from '@angular/core';
import { Modal } from '../modal/modal';
import { Button, ButtonVariant } from '../button/button';

@Component({
  selector: 'app-confirmation-dialog',
  imports: [Modal, Button],
  template: `
    <app-modal [open]="open()" [title]="title()" (closed)="cancelled.emit()">
      <p class="text-sm text-slate-600">{{ message() }}</p>
      <div class="mt-6 flex justify-end gap-3">
        <app-button label="Cancel" variant="secondary" (clicked)="cancelled.emit()" />
        <app-button [label]="confirmLabel()" [variant]="confirmVariant()" (clicked)="confirm.emit()" />
      </div>
    </app-modal>
  `,
})
export class ConfirmationDialog {
  readonly open = input.required<boolean>();
  readonly title = input('Are you sure?');
  readonly message = input.required<string>();
  readonly confirmLabel = input('Confirm');
  readonly confirmVariant = input<ButtonVariant>('danger');
  readonly confirm = output<void>();
  readonly cancelled = output<void>();
}
```

- [ ] **Step 2: Update `confirmation-dialog.spec.ts`**

In the test `'emits confirm and cancel'`, change line 40 from:

```typescript
    component.cancel.subscribe(() => (cancelled = true));
```

to:

```typescript
    component.cancelled.subscribe(() => (cancelled = true));
```

(The local `cancelled` boolean variable is unrelated and already correctly named — only the `component.cancel` property access changes.)

- [ ] **Step 3: Run the spec**

Run: `npx jest confirmation-dialog.spec.ts`
Expected: PASS (3 tests) — confirms the renamed output still fires correctly through Modal's renamed `closed` output and the Cancel button's `clicked` handler.

- [ ] **Step 4: Commit**

```bash
git add src/app/shared/ui/confirmation-dialog/confirmation-dialog.ts src/app/shared/ui/confirmation-dialog/confirmation-dialog.spec.ts
git commit -m "refactor: rename ConfirmationDialog.cancel output to cancelled"
```

Note: `tenant-detail.html` (Task 3) still binds `(cancel)=` at this point and will not compile until Task 3 lands.

---

### Task 3: Update `tenant-detail.html` consumers

**Files:**
- Modify: `src/app/modules/tenants/feature/tenant-detail/tenant-detail.html:100` and `:112`

**Interfaces:**
- Consumes: `ConfirmationDialog.cancelled` (from Task 2).

- [ ] **Step 1: Update both `<app-confirmation-dialog>` bindings**

Find (lines 92–114):

```html
  @if (pendingAction(); as action) {
    <app-confirmation-dialog
      [open]="true"
      [title]="action.label + ' tenant?'"
      message="Are you sure you want to {{ action.label.toLowerCase() }} this tenant?"
      [confirmLabel]="action.label"
      [confirmVariant]="action.confirmVariant"
      (confirm)="confirmAction()"
      (cancel)="cancelAction()"
    />
  }

  @if (pendingActivation()) {
    <app-confirmation-dialog
      [open]="true"
      title="Activate tenant?"
      message="This will activate the tenant and make it available to its users. Continue?"
      confirmLabel="Confirm & Activate"
      confirmVariant="indigo"
      (confirm)="confirmActivation()"
      (cancel)="cancelActivation()"
    />
  }
```

Replace with:

```html
  @if (pendingAction(); as action) {
    <app-confirmation-dialog
      [open]="true"
      [title]="action.label + ' tenant?'"
      message="Are you sure you want to {{ action.label.toLowerCase() }} this tenant?"
      [confirmLabel]="action.label"
      [confirmVariant]="action.confirmVariant"
      (confirm)="confirmAction()"
      (cancelled)="cancelAction()"
    />
  }

  @if (pendingActivation()) {
    <app-confirmation-dialog
      [open]="true"
      title="Activate tenant?"
      message="This will activate the tenant and make it available to its users. Continue?"
      confirmLabel="Confirm & Activate"
      confirmVariant="indigo"
      (confirm)="confirmActivation()"
      (cancelled)="cancelActivation()"
    />
  }
```

- [ ] **Step 2: Run the tenant-detail spec**

Run: `npx jest tenant-detail.spec.ts`
Expected: PASS (all existing tests) — these tests exercise `cancelAction()`/`cancelActivation()` indirectly through the dialog's cancel button, which now round-trips through `cancelled` instead of `cancel`.

- [ ] **Step 3: Commit**

```bash
git add src/app/modules/tenants/feature/tenant-detail/tenant-detail.html
git commit -m "refactor: update tenant-detail to bind ConfirmationDialog's cancelled output"
```

---

### Task 4: Remove the lint override and run full verification

**Files:**
- Modify: `eslint.config.js`

**Interfaces:**
- Consumes: the completed rename from Tasks 1–3 (nothing left for `@angular-eslint/no-output-native` to flag).

- [ ] **Step 1: Delete the override in `eslint.config.js`**

Find (inside the `**/*.ts` files block's `rules`):

```javascript
      // Modal/ConfirmationDialog already ship `close`/`cancel` outputs used across many
      // consumers (Roles, Tenants, User Profile Drawer, etc.) — renaming needs its own
      // dedicated, tested pass rather than being folded into unrelated tooling work.
      '@angular-eslint/no-output-native': 'warn',
```

Delete these 4 lines entirely (comment + rule). The rule falls back to its default `error` severity from `angular.configs.tsRecommended`.

- [ ] **Step 2: Run full verification**

```bash
npm run lint
```
Expected: no `@angular-eslint/no-output-native` errors anywhere (the only two components that ever triggered it are now renamed). Note: this repo has other **pre-existing, unrelated** lint errors in `tenant-wizard.html` (`label-has-associated-control`) — those are a separately tracked issue and must NOT be touched here; confirm the output contains no `no-output-native` entries, not that the lint run is 100% clean overall.

```bash
npm test
```
Expected: PASS, same count as before this branch started (no new failures).

```bash
npm run build
```
Expected: builds cleanly.

- [ ] **Step 3: Commit**

```bash
git add eslint.config.js
git commit -m "chore: remove no-output-native override, Modal/ConfirmationDialog renamed"
```

---

## Final Step

After Task 4, use superpowers:finishing-a-development-branch to verify the full test suite one more time and present merge/PR/keep options.
