import { Component, computed, input } from '@angular/core';
import { Skeleton } from '../skeleton/skeleton';

@Component({
  selector: 'app-drawer-content-skeleton',
  imports: [Skeleton],
  template: `
    <div role="status" aria-live="polite" aria-label="Loading content">
      @if (showAvatar()) {
        <div class="flex items-center gap-3">
          <app-skeleton width="3rem" height="3rem" />
          <div class="flex-1">
            <app-skeleton width="60%" height="0.875rem" />
            <div class="mt-2">
              <app-skeleton width="80%" height="0.75rem" />
            </div>
          </div>
        </div>
        <div class="mt-3">
          <app-skeleton width="4.5rem" height="1.25rem" />
        </div>
      }

      <div class="mt-4 grid grid-cols-2 gap-3">
        @for (field of fieldIndices(); track field) {
          <div>
            <app-skeleton width="4rem" height="0.625rem" />
            <div class="mt-2">
              <app-skeleton width="80%" height="0.875rem" />
            </div>
          </div>
        }
      </div>

      @if (showForm()) {
        <div class="mt-6 flex flex-col gap-4">
          <app-skeleton width="5rem" height="1.25rem" />
          <div class="rounded-lg border border-slate-100 dark:border-slate-800 p-3">
            <app-skeleton width="100%" height="4rem" />
          </div>
          @for (field of formFieldIndices(); track field) {
            <div>
              <app-skeleton width="30%" height="0.75rem" />
              <div class="mt-2">
                <app-skeleton width="100%" height="2.5rem" />
              </div>
            </div>
          }
        </div>
      }

      @if (showCheckboxSection()) {
        <div class="mt-6 border-t border-slate-100 dark:border-slate-800 pt-4">
          <app-skeleton width="4rem" height="0.625rem" />
          <div class="mt-3 flex flex-col gap-3">
            @for (item of checkboxIndices(); track item) {
              <div class="flex items-center gap-2">
                <app-skeleton width="1rem" height="1rem" />
                <app-skeleton width="50%" height="0.875rem" />
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class DrawerContentSkeleton {
  readonly showAvatar = input(true);
  readonly fieldCount = input(2);
  readonly showCheckboxSection = input(true);
  readonly showForm = input(false);
  readonly checkboxCount = input(4);
  readonly formFieldCount = input(3);

  protected readonly fieldIndices = computed(() =>
    Array.from({ length: this.fieldCount() }, (_, index) => index),
  );

  protected readonly checkboxIndices = computed(() =>
    Array.from({ length: this.checkboxCount() }, (_, index) => index),
  );

  protected readonly formFieldIndices = computed(() =>
    Array.from({ length: this.formFieldCount() }, (_, index) => index),
  );
}
