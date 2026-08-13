import { Component, input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  template: `
    <div
      class="animate-pulse rounded bg-slate-200 dark:bg-slate-700"
      [style.width]="width()"
      [style.height]="height()"
    ></div>
  `,
})
export class Skeleton {
  readonly width = input('100%');
  readonly height = input('1rem');
}