import { Component, computed, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';

export type MetricCardTone = 'default' | 'success' | 'warning' | 'danger' | 'indigo';

@Component({
  selector: 'app-metric-card',
  imports: [NgTemplateOutlet, RouterLink],
  templateUrl: './metric-card.html',
})
export class MetricCard {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly hint = input('');
  readonly tone = input<MetricCardTone>('default');
  readonly link = input<string | undefined>(undefined);

  protected readonly valueClasses = computed(() => {
    const toneClasses: Record<MetricCardTone, string> = {
      default: 'text-slate-900 dark:text-slate-100',
      success: 'text-emerald-600 dark:text-emerald-400',
      warning: 'text-amber-600 dark:text-amber-400',
      danger: 'text-red-600 dark:text-red-400',
      indigo: 'text-indigo-600 dark:text-indigo-400',
    };
    return toneClasses[this.tone()];
  });
}
