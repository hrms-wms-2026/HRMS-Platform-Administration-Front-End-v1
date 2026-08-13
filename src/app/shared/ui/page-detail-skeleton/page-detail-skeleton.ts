import { Component, computed, input } from '@angular/core';
import { Skeleton } from '../skeleton/skeleton';

@Component({
  selector: 'app-page-detail-skeleton',
  imports: [Skeleton],
  template: `
    <div
      class="flex flex-col gap-4 rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm"
      role="status"
      aria-live="polite"
      aria-label="Loading content"
    >
      <div class="flex items-center justify-between gap-4">
        <div class="flex-1">
          <app-skeleton width="40%" height="1.5rem" />
          @if (showSubtitle()) {
            <div class="mt-2">
              <app-skeleton width="28%" height="0.875rem" />
            </div>
          }
        </div>
        @if (showBadge()) {
          <app-skeleton width="5rem" height="1.25rem" />
        }
      </div>

      <div class="grid gap-4 text-sm" [class]="gridClass()">
        @for (field of fieldIndices(); track field) {
          <div>
            <app-skeleton width="5rem" height="0.625rem" />
            <div class="mt-2">
              <app-skeleton width="70%" height="0.875rem" />
            </div>
          </div>
        }
      </div>

      @if (showContentBlock()) {
        <div>
          <app-skeleton width="6rem" height="0.625rem" />
          <div class="mt-2 rounded-lg border border-slate-100 dark:border-slate-800 p-4">
            <app-skeleton width="100%" height="5rem" />
          </div>
        </div>
      }

      @if (showPermissionsSection()) {
        <div class="flex flex-col gap-6 border-t border-slate-100 dark:border-slate-800 pt-4">
          @for (group of permissionGroupIndices(); track group) {
            <div>
              <app-skeleton width="6rem" height="0.625rem" />
              <div class="mt-3 flex flex-col gap-3">
                @for (item of permissionItemIndices(); track item) {
                  <div class="flex items-start gap-3">
                    <app-skeleton width="1rem" height="1rem" />
                    <div class="flex-1">
                      <app-skeleton width="45%" height="0.875rem" />
                      <div class="mt-1">
                        <app-skeleton width="80%" height="0.75rem" />
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }

      @if (showActionBar()) {
        <div class="flex gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
          <app-skeleton width="5rem" height="2.25rem" />
          <app-skeleton width="5rem" height="2.25rem" />
        </div>
      }
    </div>
  `,
})
export class PageDetailSkeleton {
  readonly fieldCount = input(6);
  readonly columns = input<1 | 2>(2);
  readonly showSubtitle = input(true);
  readonly showBadge = input(true);
  readonly showContentBlock = input(false);
  readonly showPermissionsSection = input(false);
  readonly showActionBar = input(false);

  protected readonly fieldIndices = computed(() =>
    Array.from({ length: this.fieldCount() }, (_, index) => index),
  );

  protected readonly permissionGroupIndices = computed(() => [0, 1]);
  protected readonly permissionItemIndices = computed(() => [0, 1, 2]);

  protected readonly gridClass = computed(() =>
    this.columns() === 2 ? 'grid-cols-2' : 'grid-cols-1',
  );
}
