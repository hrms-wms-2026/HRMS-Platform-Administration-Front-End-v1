import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-modal',
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          class="fixed inset-0 bg-slate-900/50"
          role="button"
          tabindex="0"
          aria-label="Close dialog"
          (click)="closed.emit()"
          (keydown.enter)="closed.emit()"
          (keydown.space)="$event.preventDefault(); closed.emit()"
        ></div>
        <div class="relative z-10 w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl">
          @if (title()) {
            <h2 class="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">{{ title() }}</h2>
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
