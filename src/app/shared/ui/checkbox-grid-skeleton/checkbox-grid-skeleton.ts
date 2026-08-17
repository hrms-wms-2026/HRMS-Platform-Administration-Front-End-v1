import { Component, computed, input } from '@angular/core';
import { Skeleton } from '../skeleton/skeleton';

@Component({
  selector: 'app-checkbox-grid-skeleton',
  imports: [Skeleton],
  template: `
    <div
      class="mt-1 grid grid-cols-2 gap-2 rounded-lg border border-slate-200 dark:border-slate-700 p-3"
      role="status"
      aria-live="polite"
      aria-label="Loading options"
    >
      @for (item of itemIndices(); track item) {
        <div class="flex items-center gap-2">
          <app-skeleton width="1rem" height="1rem" shape="block" />
          <app-skeleton width="70%" height="0.875rem" shape="line" />
        </div>
      }
    </div>
  `,
})
export class CheckboxGridSkeleton {
  readonly items = input(6);

  protected readonly itemIndices = computed(() =>
    Array.from({ length: this.items() }, (_, index) => index),
  );
}
