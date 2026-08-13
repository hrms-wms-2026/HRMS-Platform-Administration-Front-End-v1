import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Skeleton } from '../skeleton/skeleton';
import { StackedCardsSkeleton } from './stacked-cards-skeleton';

describe('StackedCardsSkeleton', () => {
  function setup(cards = 3) {
    TestBed.configureTestingModule({ imports: [StackedCardsSkeleton] }).compileComponents();
    const fixture = TestBed.createComponent(StackedCardsSkeleton);
    fixture.componentRef.setInput('cards', cards);
    fixture.detectChanges();
    return fixture;
  }

  function skeletonInstances(fixture: ComponentFixture<StackedCardsSkeleton>): Skeleton[] {
    return fixture.debugElement.queryAll(By.directive(Skeleton)).map((el) => el.componentInstance);
  }

  it('renders the configured number of cards', () => {
    const fixture = setup(5);
    const cards = fixture.nativeElement.querySelectorAll('.rounded-lg.border.p-4');

    expect(cards.length).toBe(5);
  });

  it('uses pill skeletons for card actions', () => {
    const fixture = setup(2);
    const shapes = skeletonInstances(fixture).map((skeleton) => skeleton.shape());

    expect(shapes.filter((shape) => shape === 'pill').length).toBe(2);
  });

  it('exposes an aria status container', () => {
    const fixture = setup();
    const status = fixture.debugElement.query(By.css('[role="status"]')).nativeElement as HTMLElement;

    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.getAttribute('aria-label')).toBe('Loading options');
  });
});
