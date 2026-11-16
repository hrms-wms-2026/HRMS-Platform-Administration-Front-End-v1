// Copied from Hrms--Web-application---front-end---v1 src/app/shared/ui/char-counter/char-counter.component.spec.ts at 726d4c81. Change it there first, then copy.
import { TestBed } from '@angular/core/testing';
import { CharCounterComponent } from './char-counter.component';

describe('CharCounterComponent', () => {
  function render(length: number, max: number) {
    const fixture = TestBed.createComponent(CharCounterComponent);
    fixture.componentRef.setInput('length', length);
    fixture.componentRef.setInput('max', max);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const text = host.querySelector('[data-testid="char-counter"]') as HTMLElement | null;
    return { host, text };
  }

  it('stays hidden below 80% of the limit', () => {
    const { host, text } = render(79, 100);
    expect(text).toBeNull();
    expect(host.style.display).toBe('none');
  });

  it('shows the count in amber from 80% of the limit', () => {
    const { host, text } = render(80, 100);
    expect(host.style.display).toBe('block');
    expect(text?.textContent?.trim()).toBe('80 / 100');
    expect(text?.classList).toContain('char-counter__text--near');
  });

  it('turns red and says so at the limit', () => {
    const { text } = render(100, 100);
    expect(text?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Character limit reached · 100 / 100');
    expect(text?.classList).toContain('char-counter__text--limit');
  });

  it('says how far over the limit the text is', () => {
    const { text } = render(105, 100);
    expect(text?.textContent?.replace(/\s+/g, ' ').trim()).toBe('5 characters over the limit · 105 / 100');
  });
});
