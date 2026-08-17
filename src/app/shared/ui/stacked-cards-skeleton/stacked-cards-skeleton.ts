import { Component, computed, input } from '@angular/core';
import { Skeleton } from '../skeleton/skeleton';

@Component({
  selector: 'app-stacked-cards-skeleton',
  imports: [Skeleton],
  template: `
    <div class="flex flex-col gap-3" role="status" aria-live="polite" aria-label="Loading options">
      @for (card of cardIndices(); track card) {
        <div class="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <div class="flex flex-col gap-2">
            <app-skeleton width="8rem" height="0.875rem" shape="line" />
            <app-skeleton width="12rem" height="0.75rem" shape="line" tone="soft" />
          </div>
          <app-skeleton width="5rem" height="0.875rem" shape="pill" />
        </div>
      }
    </div>
  `,
})
export class StackedCardsSkeleton {
  readonly cards = input(3);

  protected readonly cardIndices = computed(() =>
    Array.from({ length: this.cards() }, (_, index) => index),
  );
}
