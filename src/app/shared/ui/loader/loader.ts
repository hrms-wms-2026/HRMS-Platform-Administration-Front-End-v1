import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loader',
  template: `
    <div class="flex items-center justify-center gap-2 py-6" role="status" aria-live="polite">
      <span
        class="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-700"
      ></span>
      @if (label()) {
        <span class="text-sm text-slate-500">{{ label() }}</span>
      }
    </div>
  `,
})
export class Loader {
  readonly label = input<string>('');
}
