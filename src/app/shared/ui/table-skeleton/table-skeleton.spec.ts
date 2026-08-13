import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Skeleton } from '../skeleton/skeleton';
import { TableSkeleton } from './table-skeleton';

describe('TableSkeleton', () => {
  function setup(inputs: { rows?: number; columns?: string[]; showPagination?: boolean } = {}) {
    TestBed.configureTestingModule({ imports: [TableSkeleton] }).compileComponents();
    const fixture = TestBed.createComponent(TableSkeleton);

    if (inputs.rows !== undefined) {
      fixture.componentRef.setInput('rows', inputs.rows);
    }
    if (inputs.columns !== undefined) {
      fixture.componentRef.setInput('columns', inputs.columns);
    }
    if (inputs.showPagination !== undefined) {
      fixture.componentRef.setInput('showPagination', inputs.showPagination);
    }

    fixture.detectChanges();
    return fixture;
  }

  function skeletonInstances(fixture: ComponentFixture<TableSkeleton>): Skeleton[] {
    return fixture.debugElement.queryAll(By.directive(Skeleton)).map((el) => el.componentInstance);
  }

  it('renders the configured number of body rows', () => {
    const fixture = setup({ rows: 3, columns: ['4rem', '6rem'], showPagination: false });
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');

    expect(rows.length).toBe(3);
  });

  it('uses soft tone for header lines and default tone for the first body column', () => {
    const fixture = setup({ rows: 1, columns: ['4rem', '6rem', '5rem'], showPagination: false });
    const skeletons = skeletonInstances(fixture);

    expect(skeletons[0].tone()).toBe('soft');
    expect(skeletons[1].tone()).toBe('soft');
    expect(skeletons[2].tone()).toBe('soft');
    expect(skeletons[3].tone()).toBe('default');
    expect(skeletons[4].tone()).toBe('soft');
  });

  it('uses pill shape for action cells and pagination controls', () => {
    const fixture = setup({ rows: 1, columns: ['4rem', '6rem'], showPagination: true });
    const skeletons = skeletonInstances(fixture);

    expect(skeletons[3].shape()).toBe('pill');
    expect(skeletons[4].shape()).toBe('pill');
    expect(skeletons[5].shape()).toBe('pill');
  });

  it('exposes an aria status container', () => {
    const fixture = setup();
    const status = fixture.debugElement.query(By.css('[role="status"]')).nativeElement as HTMLElement;

    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.getAttribute('aria-label')).toBe('Loading content');
  });
});
