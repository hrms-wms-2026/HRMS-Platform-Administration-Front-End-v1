// Copied from Hrms--Web-application---front-end---v1 src/app/shared/ui/char-counter/char-counter.component.ts at 726d4c81. Change it there first, then copy.
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CHAR_COUNTER_THRESHOLD } from '../../constants/text-limits';

/**
 * Character counter for a text field with a limit. Stays hidden until the text reaches the
 * threshold (80% of the limit by default), then shows "used / max" in amber, and turns red with
 * a message at or over the limit. Announced politely to screen readers.
 */
@Component({
  selector: 'app-char-counter',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Hidden (no box, so no flex gap) until it has something to show.
  host: { '[style.display]': "visible() ? 'block' : 'none'" },
  template: `
    <span class="char-counter" aria-live="polite">
      @if (visible()) {
        <span
          class="char-counter__text"
          data-testid="char-counter"
          [class.char-counter__text--near]="state() === 'near'"
          [class.char-counter__text--limit]="state() !== 'near'"
        >
          @if (state() === 'over') {
            {{ length() - max() }} {{ length() - max() === 1 ? 'character' : 'characters' }} over the limit ·
          } @else if (state() === 'limit') {
            Character limit reached ·
          }
          {{ length() }} / {{ max() }}
        </span>
      }
    </span>
  `,
  styles: [`
    .char-counter { display: flex; justify-content: flex-end; min-height: 0; }
    .char-counter__text { font-size: 0.75rem; line-height: 1.2; font-variant-numeric: tabular-nums; }
    .char-counter__text--near { color: var(--color-warning-text); }
    .char-counter__text--limit { color: var(--color-danger); }
  `]
})
export class CharCounterComponent {
  /** Characters currently used. */
  length = input.required<number>();
  /** The limit. */
  max = input.required<number>();
  /** Share of the limit at which the counter appears (0-1). */
  threshold = input<number>(CHAR_COUNTER_THRESHOLD);

  readonly visible = computed(() => this.max() > 0 && this.length() >= Math.ceil(this.max() * this.threshold()));
  readonly state = computed<'near' | 'limit' | 'over'>(() => {
    const length = this.length();
    const max = this.max();
    if (length > max) return 'over';
    if (length === max) return 'limit';
    return 'near';
  });
}
