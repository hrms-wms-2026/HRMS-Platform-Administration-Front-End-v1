import { Component, computed, input } from '@angular/core';

export type SkeletonShape = 'line' | 'block' | 'circle' | 'pill';
export type SkeletonTone = 'default' | 'soft' | 'accent';

@Component({
  selector: 'app-skeleton',
  template: `
    <div
      aria-hidden="true"
      [class]="surfaceClasses()"
      [style.width]="width()"
      [style.height]="height()"
      [style.border-radius]="radius() ?? null"
    ></div>
  `,
  styles: [
    `
      @keyframes skeleton-shimmer {
        0% {
          background-position: 200% 0;
        }
        100% {
          background-position: -200% 0;
        }
      }

      @media (prefers-reduced-motion: no-preference) {
        .skeleton-shimmer {
          animation: skeleton-shimmer 1.8s ease-in-out infinite;
        }
      }
    `,
  ],
})
export class Skeleton {
  readonly width = input('100%');
  readonly height = input('1rem');
  readonly shape = input<SkeletonShape>('line');
  readonly radius = input<string | undefined>(undefined);
  readonly tone = input<SkeletonTone>('default');
  readonly animated = input(true);

  readonly surfaceClasses = computed(() => {
    const classes = ['overflow-hidden', 'bg-[length:200%_100%]'];

    if (!this.radius()) {
      const shapeClasses: Record<SkeletonShape, string> = {
        line: 'rounded',
        block: 'rounded-md',
        circle: 'rounded-full aspect-square',
        pill: 'rounded-full',
      };
      classes.push(shapeClasses[this.shape()]);
    }

    const toneClasses: Record<SkeletonTone, string> = {
      default:
        'bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800',
      soft: 'bg-gradient-to-r from-slate-50 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900',
      accent:
        'bg-gradient-to-r from-slate-100 via-indigo-100/70 to-slate-100 dark:from-slate-800 dark:via-indigo-900/35 dark:to-slate-800',
    };
    classes.push(toneClasses[this.tone()]);

    if (this.animated()) {
      classes.push('skeleton-shimmer');
    }

    return classes.join(' ');
  });
}
