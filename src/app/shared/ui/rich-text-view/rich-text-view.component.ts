// Copied from Hrms--Web-application---front-end---v1 src/app/shared/ui/rich-text-view/rich-text-view.component.ts at d7438dd4. Change it there first, then copy.
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { isRichHtml, sanitizeBasicRichHtml } from '../../utils/basic-rich-html.util';

/**
 * Neither app ships the typography plugin and Tailwind's reset removes list markers and heading sizes,
 * so the view styles its own (innerHTML) content. ::ng-deep reaches nodes Angular did not create.
 * Exported so tests can check it under any runner (the admin Jest preset strips component styles).
 */
export const RICH_TEXT_VIEW_STYLES = `
    :host ::ng-deep [data-testid='rich-text-html'] p { margin: 0 0 0.5rem; }
    :host ::ng-deep [data-testid='rich-text-html'] h1 { font-size: 1.25rem; font-weight: 600; margin: 0.75rem 0 0.5rem; }
    :host ::ng-deep [data-testid='rich-text-html'] h2 { font-size: 1.125rem; font-weight: 600; margin: 0.75rem 0 0.5rem; }
    :host ::ng-deep [data-testid='rich-text-html'] h3,
    :host ::ng-deep [data-testid='rich-text-html'] h4 { font-size: 1rem; font-weight: 600; margin: 0.5rem 0 0.25rem; }
    :host ::ng-deep [data-testid='rich-text-html'] ul { list-style-type: disc; padding-left: 1.25rem; margin: 0 0 0.5rem; }
    :host ::ng-deep [data-testid='rich-text-html'] ol { list-style-type: decimal; padding-left: 1.25rem; margin: 0 0 0.5rem; }
    :host ::ng-deep [data-testid='rich-text-html'] blockquote { border-left: 3px solid var(--color-border); padding-left: 0.75rem; color: var(--color-text-secondary); margin: 0 0 0.5rem; }
    :host ::ng-deep [data-testid='rich-text-html'] pre,
    :host ::ng-deep [data-testid='rich-text-html'] code { font-family: ui-monospace, monospace; font-size: 0.85em; background: var(--color-surface-secondary); border-radius: 4px; }
    :host ::ng-deep [data-testid='rich-text-html'] pre { padding: 0.5rem 0.75rem; overflow-x: auto; margin: 0 0 0.5rem; }
    :host ::ng-deep [data-testid='rich-text-html'] a { color: var(--color-accent); text-decoration: underline; }
    :host ::ng-deep [data-testid='rich-text-html'] > :last-child { margin-bottom: 0; }
  `;

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
        class="break-words text-sm text-[var(--color-text-primary)]"
        [innerHTML]="html()"
      ></div>
    } @else if (value()) {
      <div data-testid="rich-text-plain" class="whitespace-pre-wrap break-words text-[var(--color-text-primary)]">{{ value() }}</div>
    }
  `,
  styles: [RICH_TEXT_VIEW_STYLES]
})
export class RichTextViewComponent {
  readonly value = input<string | null | undefined>(null);

  protected readonly rich = computed(() => isRichHtml(this.value()));
  protected readonly html = computed(() => sanitizeBasicRichHtml(this.value()));
}
