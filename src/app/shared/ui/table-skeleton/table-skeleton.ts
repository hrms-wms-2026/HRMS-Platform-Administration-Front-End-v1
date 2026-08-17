import { Component, computed, input } from '@angular/core';
import { Skeleton } from '../skeleton/skeleton';

@Component({
  selector: 'app-table-skeleton',
  imports: [Skeleton],
  template: `
    <div class="flex flex-col gap-4" role="status" aria-live="polite" aria-label="Loading content">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-slate-200 dark:border-slate-700">
              @for (width of columns(); track $index) {
                <th class="py-2 pr-4">
                  <app-skeleton height="0.75rem" [width]="width" shape="line" tone="soft" />
                </th>
              }
            </tr>
          </thead>
          <tbody>
            @for (row of rowIndices(); track row) {
              <tr class="border-b border-slate-100 dark:border-slate-800">
                @for (width of columns(); track $index) {
                  <td class="py-3 pr-4">
                    <app-skeleton
                      [height]="$index === 0 ? '1.25rem' : '0.875rem'"
                      [width]="width"
                      [shape]="$index === columns().length - 1 ? 'pill' : 'line'"
                      [tone]="$index === 0 ? 'default' : 'soft'"
                    />
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if (showPagination()) {
        <div class="flex items-center justify-end gap-2">
          <app-skeleton width="5.5rem" height="2.25rem" shape="pill" />
          <app-skeleton width="5.5rem" height="2.25rem" shape="pill" />
        </div>
      }
    </div>
  `,
})
export class TableSkeleton {
  readonly rows = input(8);
  readonly columns = input(['5.5rem', '12rem', '4.5rem', '100%', '8rem']);
  readonly showPagination = input(true);

  protected readonly rowIndices = computed(() =>
    Array.from({ length: this.rows() }, (_, index) => index),
  );
}
