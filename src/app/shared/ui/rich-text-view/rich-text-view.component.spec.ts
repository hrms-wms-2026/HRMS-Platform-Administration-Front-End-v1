// Copied from Hrms--Web-application---front-end---v1 src/app/shared/ui/rich-text-view/rich-text-view.component.spec.ts at d7438dd4. Change it there first, then copy.
import { TestBed } from '@angular/core/testing';
import { RICH_TEXT_VIEW_STYLES, RichTextViewComponent } from './rich-text-view.component';

describe('RichTextViewComponent', () => {
  function render(value: string | null): HTMLElement {
    const fixture = TestBed.createComponent(RichTextViewComponent);
    fixture.componentRef.setInput('value', value);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders rich text as formatted markup', () => {
    const host = render('<ul><li>One</li><li>Two</li></ul>');

    expect(host.querySelectorAll('li').length).toBe(2);
  });

  // Review finding M3: neither app has the typography plugin, so the view styles its own content.
  it('styles lists and headings itself', () => {
    expect(RICH_TEXT_VIEW_STYLES).toMatch(/ul\s*\{[^}]*list-style-type:\s*disc[^}]*padding-left:\s*1\.25rem/);
    expect(RICH_TEXT_VIEW_STYLES).toMatch(/ol\s*\{[^}]*list-style-type:\s*decimal/);
    expect(RICH_TEXT_VIEW_STYLES).toMatch(/h2\s*\{[^}]*font-weight:\s*600/);
  });

  it('shows old plain text as text and keeps its line breaks', () => {
    const host = render('error at line 5 < 6\nnext');
    const block = host.querySelector('[data-testid="rich-text-plain"]') as HTMLElement;

    expect(block.textContent).toBe('error at line 5 < 6\nnext');
    expect(block.className).toContain('whitespace-pre-wrap');
    expect(host.querySelector('[data-testid="rich-text-html"]')).toBeNull();
  });

  it('never puts active content into the page', () => {
    const host = render('<p>Hi<script>window.__rtv = 1</script><img src="x" onerror="window.__rtv = 1"></p>');

    expect(host.querySelector('script')).toBeNull();
    expect(host.querySelector('img')).toBeNull();
    expect(host.textContent).toContain('Hi');
  });

  it('renders nothing for an empty value', () => {
    const host = render(null);

    expect(host.textContent?.trim()).toBe('');
  });
});
