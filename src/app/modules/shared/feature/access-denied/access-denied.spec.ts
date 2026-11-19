import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AccessDenied } from './access-denied';

describe('AccessDenied', () => {
  let router: { navigateByUrl: jest.Mock };

  beforeEach(async () => {
    router = { navigateByUrl: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [AccessDenied],
      providers: [{ provide: Router, useValue: router }],
    }).compileComponents();
  });

  function createComponent() {
    const fixture = TestBed.createComponent(AccessDenied);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the Access Restricted heading and generic body copy', () => {
    const fixture = createComponent();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Access Restricted');
    expect(text).toContain("You don't have permission to view this page");
  });

  it('navigates to the dashboard when Go to Dashboard is clicked', () => {
    const fixture = createComponent();

    fixture.componentInstance.goToDashboard();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });
});
