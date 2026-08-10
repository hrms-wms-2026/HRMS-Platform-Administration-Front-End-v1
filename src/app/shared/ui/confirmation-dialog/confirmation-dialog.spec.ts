import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ConfirmationDialog } from './confirmation-dialog';

describe('ConfirmationDialog', () => {
  function setup(confirmVariant?: 'primary' | 'secondary' | 'danger' | 'indigo') {
    TestBed.configureTestingModule({ imports: [ConfirmationDialog] }).compileComponents();
    const fixture = TestBed.createComponent(ConfirmationDialog);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('message', 'Are you sure?');
    if (confirmVariant) {
      fixture.componentRef.setInput('confirmVariant', confirmVariant);
    }
    fixture.detectChanges();
    return fixture;
  }

  function confirmButtonClasses(fixture: ReturnType<typeof setup>): string {
    const buttons = fixture.debugElement.queryAll(By.css('button'));
    const confirmButton = buttons[buttons.length - 1];
    return confirmButton.nativeElement.className;
  }

  it('defaults the confirm button to the danger variant', () => {
    const fixture = setup();
    expect(confirmButtonClasses(fixture)).toContain('bg-red-700');
  });

  it('uses the given confirmVariant when provided', () => {
    const fixture = setup('indigo');
    expect(confirmButtonClasses(fixture)).toContain('bg-indigo-600');
  });

  it('emits confirm and cancel', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    let confirmed = false;
    let cancelled = false;
    component.confirm.subscribe(() => (confirmed = true));
    component.cancelled.subscribe(() => (cancelled = true));

    const buttons = fixture.debugElement.queryAll(By.css('button'));
    buttons[0].nativeElement.click();
    buttons[1].nativeElement.click();

    expect(cancelled).toBe(true);
    expect(confirmed).toBe(true);
  });
});
