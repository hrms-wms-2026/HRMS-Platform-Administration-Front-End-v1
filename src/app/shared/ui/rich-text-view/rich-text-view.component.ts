// Copied from Hrms--Web-application---front-end---v1 src/app/shared/ui/rich-text-view/rich-text-view.component.ts at 726d4c81. Change it there first, then copy.
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { isRichHtml, sanitizeBasicRichHtml } from '../../utils/basic-rich-html.util';

/**
 * Shows a stored value written with the rich text editor's basic toolset. Rich values are reduced to
 * the shared allowlist, then rendered (Angular sanitises [innerHTML] once more). Older plain-text
 * values (no recognisable tag) are shown as text with their line breaks, never parsed as HTML.
 */
@Component({
  selector: 'app-rich-text-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (rich()) {
      <div
        data-testid="rich-text-html"
        class="prose prose-sm max-w-none break-words text-[var(--color-text-primary)]"
        [innerHTML]="html()"
      ></div>
    } @else if (value()) {
      <div data-testid="rich-text-plain" class="whitespace-pre-wrap break-words text-[var(--color-text-primary)]">{{ value() }}</div>
    }
  `
})
export class RichTextViewComponent {
  readonly value = input<string | null | undefined>(null);

  protected readonly rich = computed(() => isRichHtml(this.value()));
  protected readonly html = computed(() => sanitizeBasicRichHtml(this.value()));
}
