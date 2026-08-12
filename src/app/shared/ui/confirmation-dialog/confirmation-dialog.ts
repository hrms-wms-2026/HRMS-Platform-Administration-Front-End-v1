import { Component, input, output } from '@angular/core';
import { Modal } from '../modal/modal';
import { Button, ButtonVariant } from '../button/button';

@Component({
  selector: 'app-confirmation-dialog',
  imports: [Modal, Button],
  template: `
    <app-modal [open]="open()" [title]="title()" (closed)="cancelled.emit()">
      <p class="text-sm text-slate-600 dark:text-slate-300">{{ message() }}</p>
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
