import { Component, computed, input, output } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'indigo';

@Component({
  selector: 'app-button',
  template: `
    <button
      [type]="type()"
      [disabled]="disabled() || loading()"
      (click)="clicked.emit()"
      [class]="classes()"
    >
      {{ loading() ? loadingText() : label() }}
    </button>
  `,
})
export class Button {
  readonly label = input.required<string>();
  readonly variant = input<ButtonVariant>('primary');
  readonly type = input<'button' | 'submit'>('button');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly loadingText = input('Please wait…');
  readonly fullWidth = input(false);
  readonly clicked = output<void>();

  protected readonly classes = computed(() => {
    const typography = this.variant() === 'indigo' ? 'primary-button' : 'action-button';
    const base =
      `rounded-lg px-4 py-2.5 transition disabled:cursor-not-allowed disabled:opacity-50 ${typography}`;
    const width = this.fullWidth() ? 'w-full' : '';
    const variants: Record<ButtonVariant, string> = {
      primary: 'bg-blue-700 text-white hover:bg-blue-800',
      secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
      danger: 'bg-red-700 text-white hover:bg-red-800',
      indigo: 'bg-indigo-600 text-white hover:bg-indigo-700',
    };
    return `${base} ${width} ${variants[this.variant()]}`;
  });
}