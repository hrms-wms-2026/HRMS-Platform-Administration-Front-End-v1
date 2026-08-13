import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Skeleton } from '../skeleton/skeleton';
import { ListRowsSkeleton } from './list-rows-skeleton';

describe('ListRowsSkeleton', () => {
  function setup(inputs: {
    rows?: number;
    variant?: 'simple' | 'with-icon' | 'selectable';
    showGroupHeaders?: boolean;
    groups?: number;
  } = {}) {
    TestBed.configureTestingModule({ imports: [ListRowsSkeleton] }).compileComponents();
    const fixture = TestBed.createComponent(ListRowsSkeleton);

    if (inputs.rows !== undefined) {
      fixture.componentRef.setInput('rows', inputs.rows);
    }
    if (inputs.variant !== undefined) {
      fixture.componentRef.setInput('variant', inputs.variant);
    }
    if (inputs.showGroupHeaders !== undefined) {
      fixture.componentRef.setInput('showGroupHeaders', inputs.showGroupHeaders);
    }
    if (inputs.groups !== undefined) {
      fixture.componentRef.setInput('groups', inputs.groups);
    }

    fixture.detectChanges();
    return fixture;
  }

  function skeletonInstances(fixture: ComponentFixture<ListRowsSkeleton>): Skeleton[] {
    return fixture.debugElement.queryAll(By.directive(Skeleton)).map((el) => el.componentInstance);
  }

  it('renders the configured number of rows', () => {
    const fixture = setup({ rows: 5, variant: 'simple' });
    const rows = fixture.nativeElement.querySelectorAll('.divide-y > div.flex.items-center');

    expect(rows.length).toBe(5);
  });

  it('uses circle skeletons for the with-icon variant', () => {
    const fixture = setup({ rows: 2, variant: 'with-icon' });
    const shapes = skeletonInstances(fixture).map((skeleton) => skeleton.shape());

    expect(shapes).toContain('circle');
  });

  it('uses block and pill skeletons for the selectable variant', () => {
    const fixture = setup({ rows: 2, variant: 'selectable' });
    const shapes = skeletonInstances(fixture).map((skeleton) => skeleton.shape());

    expect(shapes).toContain('block');
    expect(shapes).toContain('pill');
  });

  it('exposes an aria status container', () => {
    const fixture = setup();
    const status = fixture.debugElement.query(By.css('[role="status"]')).nativeElement as HTMLElement;

    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.getAttribute('aria-label')).toBe('Loading content');
  });
});
