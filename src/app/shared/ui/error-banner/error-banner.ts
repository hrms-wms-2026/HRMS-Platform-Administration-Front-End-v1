import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-error-banner',
  template: `
    <div
      class="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-6 py-8 text-center"
      role="alert"
    >
      <p class="text-sm font-medium text-red-700">{{ message() }}</p>
      <button
        type="button"
        (click)="retry.emit()"
        class="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
      >
        Retry
      </button>
    </div>
  `,
})
export class ErrorBanner {
  readonly message = input.required<string>();
  readonly retry = output<void>();
}
