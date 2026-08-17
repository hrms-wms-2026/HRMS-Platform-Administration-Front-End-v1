import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  template: `
    <div class="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <svg
        class="h-10 w-10 text-slate-300"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M3.75 9.75h16.5M3.75 9.75a2.25 2.25 0 0 1 2.25-2.25h12a2.25 2.25 0 0 1 2.25 2.25M3.75 9.75v7.5a2.25 2.25 0 0 0 2.25 2.25h12a2.25 2.25 0 0 0 2.25-2.25v-7.5"
        />
      </svg>
      <p class="text-sm font-medium text-slate-700">{{ title() }}</p>
      @if (description()) {
        <p class="max-w-xs text-sm text-slate-500">{{ description() }}</p>
      }
    </div>
  `,
})
export class EmptyState {
  readonly title = input('No records found');
  readonly description = input<string>('');
}