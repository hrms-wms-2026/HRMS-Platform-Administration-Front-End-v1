import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Skeleton } from '../skeleton/skeleton';
import { CheckboxGridSkeleton } from './checkbox-grid-skeleton';

describe('CheckboxGridSkeleton', () => {
  function setup(items = 6) {
    TestBed.configureTestingModule({ imports: [CheckboxGridSkeleton] }).compileComponents();
    const fixture = TestBed.createComponent(CheckboxGridSkeleton);
    fixture.componentRef.setInput('items', items);
    fixture.detectChanges();
    return fixture;
  }

  function skeletonInstances(fixture: ComponentFixture<CheckboxGridSkeleton>): Skeleton[] {
    return fixture.debugElement.queryAll(By.directive(Skeleton)).map((el) => el.componentInstance);
  }

  it('renders the configured number of checkbox rows', () => {
    const fixture = setup(4);
    const rows = fixture.nativeElement.querySelectorAll('.grid.grid-cols-2 > div');

    expect(rows.length).toBe(4);
  });

  it('uses block skeletons for checkbox placeholders', () => {
    const fixture = setup(3);
    const checkboxSkeletons = skeletonInstances(fixture).filter((_, index) => index % 2 === 0);

    expect(checkboxSkeletons.every((skeleton) => skeleton.shape() === 'block')).toBe(true);
  });

  it('exposes an aria status container', () => {
    const fixture = setup();
    const status = fixture.debugElement.query(By.css('[role="status"]')).nativeElement as HTMLElement;

    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.getAttribute('aria-label')).toBe('Loading options');
  });
});
