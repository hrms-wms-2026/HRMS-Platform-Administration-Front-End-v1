import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Skeleton } from './skeleton';

describe('Skeleton', () => {
  function setup(inputs: {
    width?: string;
    height?: string;
    shape?: 'line' | 'block' | 'circle' | 'pill';
    animated?: boolean;
  } = {}) {
    TestBed.configureTestingModule({ imports: [Skeleton] }).compileComponents();
    const fixture = TestBed.createComponent(Skeleton);

    if (inputs.width !== undefined) {
      fixture.componentRef.setInput('width', inputs.width);
    }
    if (inputs.height !== undefined) {
      fixture.componentRef.setInput('height', inputs.height);
    }
    if (inputs.shape !== undefined) {
      fixture.componentRef.setInput('shape', inputs.shape);
    }
    if (inputs.animated !== undefined) {
      fixture.componentRef.setInput('animated', inputs.animated);
    }

    fixture.detectChanges();
    return fixture;
  }

  function skeletonElement(fixture: ReturnType<typeof setup>): HTMLElement {
    return fixture.debugElement.query(By.css('[aria-hidden="true"]')).nativeElement as HTMLElement;
  }

  it('applies width and height', () => {
    const fixture = setup({ width: '6rem', height: '2rem' });
    const element = skeletonElement(fixture);

    expect(element.style.width).toBe('6rem');
    expect(element.style.height).toBe('2rem');
  });

  it('circle shape creates rounded-full and aspect-square classes', () => {
    const fixture = setup({ shape: 'circle', width: '3rem', height: '3rem' });
    const className = skeletonElement(fixture).className;

    expect(className).toContain('rounded-full');
    expect(className).toContain('aspect-square');
  });

  it('animated=false removes shimmer animation class', () => {
    const fixture = setup({ animated: false });
    const className = skeletonElement(fixture).className;

    expect(className).not.toContain('skeleton-shimmer');
  });

  it('animated=true includes shimmer animation class', () => {
    const fixture = setup({ animated: true });
    const className = skeletonElement(fixture).className;

    expect(className).toContain('skeleton-shimmer');
  });

  it('sets aria-hidden to true', () => {
    const fixture = setup();
    const element = skeletonElement(fixture);

    expect(element.getAttribute('aria-hidden')).toBe('true');
  });
});
