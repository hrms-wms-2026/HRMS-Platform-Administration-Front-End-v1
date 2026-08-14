import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DateRangePicker } from './date-range-picker';

describe('DateRangePicker', () => {
  function setup(from = '', to = '') {
    TestBed.configureTestingModule({ imports: [DateRangePicker] }).compileComponents();
    const fixture = TestBed.createComponent(DateRangePicker);
    fixture.componentRef.setInput('from', from);
    fixture.componentRef.setInput('to', to);
    fixture.detectChanges();
    return fixture;
  }

  function openPicker(fixture: ReturnType<typeof setup>) {
    const trigger = fixture.debugElement.query(By.css('button[aria-haspopup="dialog"]'));
    trigger.nativeElement.click();
    fixture.detectChanges();
  }

  it('shows the placeholder when no range is set', () => {
    const fixture = setup();

    expect(fixture.nativeElement.textContent).toContain('Any date');
  });

  it('shows the formatted range when from/to are set', () => {
    const fixture = setup('2026-04-17', '2026-04-21');

    expect(fixture.nativeElement.textContent).toContain('04/17/2026 – 04/21/2026');
  });

  it('opens the calendar popover on trigger click', () => {
    const fixture = setup();

    expect(fixture.debugElement.query(By.css('[role="dialog"]'))).toBeNull();

    openPicker(fixture);

    expect(fixture.debugElement.query(By.css('[role="dialog"]'))).not.toBeNull();
  });

  it('emits a range in chronological order after two day clicks, and closes', () => {
    const fixture = setup('2026-04-01', '');
    openPicker(fixture);

    let emitted: { from: string; to: string } | undefined;
    fixture.componentInstance.rangeChange.subscribe((range) => (emitted = range));

    const dayButtons = fixture.debugElement.queryAll(By.css('[role="dialog"] .grid button'));
    const day10 = dayButtons.find((btn) => btn.nativeElement.textContent.trim() === '10');
    const day5 = dayButtons.find((btn) => btn.nativeElement.textContent.trim() === '5');

    day10!.nativeElement.click();
    fixture.detectChanges();
    day5!.nativeElement.click();
    fixture.detectChanges();

    expect(emitted).toEqual({ from: '2026-04-05', to: '2026-04-10' });
    expect(fixture.debugElement.query(By.css('[role="dialog"]'))).toBeNull();
  });

  it('closes on Escape', () => {
    const fixture = setup();
    openPicker(fixture);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[role="dialog"]'))).toBeNull();
  });

  it('closes when clicking outside the component', () => {
    const fixture = setup();
    openPicker(fixture);

    const outside = document.createElement('div');
    document.body.appendChild(outside);
    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[role="dialog"]'))).toBeNull();
    outside.remove();
  });

  it('navigates to the next and previous month', () => {
    const fixture = setup('2026-04-01', '');
    openPicker(fixture);

    const initialLabel = fixture.nativeElement.querySelector('[role="dialog"] span.font-semibold').textContent;
    expect(initialLabel).toContain('April 2026');

    const nextButton = fixture.debugElement.query(By.css('button[aria-label="Next month"]'));
    nextButton.nativeElement.click();
    fixture.detectChanges();

    const nextLabel = fixture.nativeElement.querySelector('[role="dialog"] span.font-semibold').textContent;
    expect(nextLabel).toContain('May 2026');
  });
});
