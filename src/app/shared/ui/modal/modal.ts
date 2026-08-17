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
