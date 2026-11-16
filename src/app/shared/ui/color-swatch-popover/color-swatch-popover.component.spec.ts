// Copied from Hrms--Web-application---front-end---v1 src/app/shared/ui/color-swatch-popover/color-swatch-popover.component.spec.ts at 726d4c81. Change it there first, then copy.
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ColorSwatchPopoverComponent } from './color-swatch-popover.component';

describe('ColorSwatchPopoverComponent', () => {
  let fixture: ComponentFixture<ColorSwatchPopoverComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ColorSwatchPopoverComponent] }).compileComponents();
    fixture = TestBed.createComponent(ColorSwatchPopoverComponent);
    fixture.componentRef.setInput('label', 'Remove color');
    fixture.componentRef.setInput('swatches', [{ name: 'Red', hex: '#e03131' }]);
    fixture.detectChanges();
  });

  it('emits the hex value when a swatch is clicked', () => {
    let emitted: string | null | undefined;
    fixture.componentInstance.colorSelected.subscribe((v) => (emitted = v));
    fixture.nativeElement.querySelector('.csp-swatch').click();
    expect(emitted).toBe('#e03131');
  });

  it('emits null when the remove entry is clicked', () => {
    let emitted: string | null | undefined = 'unset';
    fixture.componentInstance.colorSelected.subscribe((v) => (emitted = v));
    fixture.nativeElement.querySelector('.csp-remove').click();
    expect(emitted).toBeNull();
  });
});
