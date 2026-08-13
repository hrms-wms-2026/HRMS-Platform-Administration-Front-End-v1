import { Component, computed, input } from '@angular/core';
import { Skeleton } from '../skeleton/skeleton';

@Component({
  selector: 'app-list-rows-skeleton',
  imports: [Skeleton],
  template: `
    <div class="flex flex-col gap-4" role="status" aria-live="polite" aria-label="Loading content">
      @if (showGroupHeaders()) {
        @for (group of groupIndices(); track group) {
          <div class="flex flex-col gap-2">
            <app-skeleton width="6rem" height="0.625rem" shape="line" tone="soft" />
            <div class="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              @for (row of rowIndices(); track row) {
                <div class="flex items-center justify-between gap-4 px-4 py-3">
                  <app-skeleton
                    [width]="variant() === 'with-icon' ? '40%' : '30%'"
                    height="0.875rem"
                    shape="line"
                  />
                  <div class="flex items-center gap-3">
                    <app-skeleton width="5.5rem" height="1.25rem" shape="pill" />
                    <app-skeleton width="8rem" height="0.75rem" shape="line" tone="soft" />
                  </div>
                </div>
              }
            </div>
          </div>
        }
      } @else {
        <div class="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          @for (row of rowIndices(); track row) {
            <div class="flex items-center gap-3 px-4 py-3">
              @if (variant() === 'with-icon') {
                <app-skeleton width="2rem" height="2rem" shape="circle" />
              }
              @if (variant() === 'selectable') {
                <app-skeleton width="1rem" height="1rem" shape="block" />
              }
              <div class="flex-1">
                <app-skeleton width="45%" height="0.875rem" shape="line" />
                <div class="mt-1">
                  <app-skeleton width="30%" height="0.75rem" shape="line" tone="soft" />
                </div>
              </div>
              @if (variant() === 'selectable') {
                <app-skeleton width="4rem" height="1.25rem" shape="pill" />
              } @else if (variant() === 'with-icon') {
                <app-skeleton width="5.5rem" height="1.25rem" shape="pill" />
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ListRowsSkeleton {
  readonly rows = input(4);
  readonly groups = input(2);
  readonly showGroupHeaders = input(false);
  readonly variant = input<'simple' | 'with-icon' | 'selectable'>('simple');

  protected readonly rowIndices = computed(() =>
    Array.from({ length: this.rows() }, (_, index) => index),
  );

  protected readonly groupIndices = computed(() =>
    Array.from({ length: this.groups() }, (_, index) => index),
  );
}
