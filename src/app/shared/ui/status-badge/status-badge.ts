import { Component, computed, input } from '@angular/core';

export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral';

@Component({
  selector: 'app-status-badge',
  template: ` <span [class]="classes()">{{ label() }}</span> `,
})
export class StatusBadge {
  readonly label = input.required<string>();
  readonly tone = input<StatusTone>('neutral');

  protected readonly classes = computed(() => {
    const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium';
    const tones: Record<StatusTone, string> = {
      success: 'bg-green-100 text-green-700',
      warning: 'bg-amber-100 text-amber-700',
      danger: 'bg-red-100 text-red-700',
      neutral: 'bg-slate-100 text-slate-700',
    };
    return `${base} ${tones[this.tone()]}`;
  });
}