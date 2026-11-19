import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Skeleton } from '../skeleton/skeleton';
import { DrawerContentSkeleton } from './drawer-content-skeleton';

describe('DrawerContentSkeleton', () => {
  function setup(inputs: {
    showAvatar?: boolean;
    fieldCount?: number;
    checkboxCount?: number;
    showForm?: boolean;
    showCheckboxSection?: boolean;
  } = {}) {
    TestBed.configureTestingModule({ imports: [DrawerContentSkeleton] }).compileComponents();
    const fixture = TestBed.createComponent(DrawerContentSkeleton);

    if (inputs.showAvatar !== undefined) {
      fixture.componentRef.setInput('showAvatar', inputs.showAvatar);
    }
    if (inputs.fieldCount !== undefined) {
      fixture.componentRef.setInput('fieldCount', inputs.fieldCount);
    }
    if (inputs.checkboxCount !== undefined) {
      fixture.componentRef.setInput('checkboxCount', inputs.checkboxCount);
    }
    if (inputs.showForm !== undefined) {
      fixture.componentRef.setInput('showForm', inputs.showForm);
    }
    if (inputs.showCheckboxSection !== undefined) {
      fixture.componentRef.setInput('showCheckboxSection', inputs.showCheckboxSection);
    }

    fixture.detectChanges();
    return fixture;
  }

  function skeletonInstances(fixture: ComponentFixture<DrawerContentSkeleton>): Skeleton[] {
    return fixture.debugElement.queryAll(By.directive(Skeleton)).map((el) => el.componentInstance);
  }

  it('renders the configured number of checkbox rows', () => {
    const fixture = setup({ checkboxCount: 5, showAvatar: false });
    const checkboxRows = fixture.nativeElement.querySelectorAll(
      '.mt-6.border-t .flex.items-center.gap-2',
    );

    expect(checkboxRows.length).toBe(5);
  });

  it('uses circle skeletons for avatar placeholders and pill skeletons for badges', () => {
    const fixture = setup({ showAvatar: true, showCheckboxSection: false });
    const shapes = skeletonInstances(fixture).map((skeleton) => skeleton.shape());

    expect(shapes).toContain('circle');
    expect(shapes).toContain('pill');
  });

  it('uses block skeletons for form and checkbox controls', () => {
    const fixture = setup({ showAvatar: false, showForm: true, showCheckboxSection: true });
    const shapes = skeletonInstances(fixture).map((skeleton) => skeleton.shape());

    expect(shapes.filter((shape) => shape === 'block').length).toBeGreaterThanOrEqual(2);
  });

  it('exposes an aria status container', () => {
    const fixture = setup();
    const status = fixture.debugElement.query(By.css('[role="status"]')).nativeElement as HTMLElement;

    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.getAttribute('aria-label')).toBe('Loading content');
  });
});
