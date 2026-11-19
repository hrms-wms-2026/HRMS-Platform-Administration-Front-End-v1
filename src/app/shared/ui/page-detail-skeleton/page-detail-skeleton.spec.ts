import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Skeleton } from '../skeleton/skeleton';
import { PageDetailSkeleton } from './page-detail-skeleton';

describe('PageDetailSkeleton', () => {
  function setup(inputs: {
    fieldCount?: number;
    showBadge?: boolean;
    showContentBlock?: boolean;
    showActionBar?: boolean;
  } = {}) {
    TestBed.configureTestingModule({ imports: [PageDetailSkeleton] }).compileComponents();
    const fixture = TestBed.createComponent(PageDetailSkeleton);

    if (inputs.fieldCount !== undefined) {
      fixture.componentRef.setInput('fieldCount', inputs.fieldCount);
    }
    if (inputs.showBadge !== undefined) {
      fixture.componentRef.setInput('showBadge', inputs.showBadge);
    }
    if (inputs.showContentBlock !== undefined) {
      fixture.componentRef.setInput('showContentBlock', inputs.showContentBlock);
    }
    if (inputs.showActionBar !== undefined) {
      fixture.componentRef.setInput('showActionBar', inputs.showActionBar);
    }

    fixture.detectChanges();
    return fixture;
  }

  function skeletonInstances(fixture: ComponentFixture<PageDetailSkeleton>): Skeleton[] {
    return fixture.debugElement.queryAll(By.directive(Skeleton)).map((el) => el.componentInstance);
  }

  it('renders the configured number of detail fields', () => {
    const fixture = setup({ fieldCount: 4, showBadge: false });
    const fieldBlocks = fixture.nativeElement.querySelectorAll('.grid.gap-4 > div');

    expect(fieldBlocks.length).toBe(4);
  });

  it('uses pill skeletons for badges and action buttons', () => {
    const fixture = setup({ showBadge: true, showActionBar: true });
    const shapes = skeletonInstances(fixture).map((skeleton) => skeleton.shape());

    expect(shapes.filter((shape) => shape === 'pill').length).toBeGreaterThanOrEqual(3);
  });

  it('uses block skeletons for large content areas', () => {
    const fixture = setup({ showContentBlock: true });
    const shapes = skeletonInstances(fixture).map((skeleton) => skeleton.shape());

    expect(shapes).toContain('block');
  });

  it('exposes an aria status container', () => {
    const fixture = setup();
    const status = fixture.debugElement.query(By.css('[role="status"]')).nativeElement as HTMLElement;

    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.getAttribute('aria-label')).toBe('Loading content');
  });
});
