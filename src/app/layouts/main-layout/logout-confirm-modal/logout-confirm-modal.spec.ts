import { TestBed } from '@angular/core/testing';
import { LogoutConfirmModal } from './logout-confirm-modal';

describe('LogoutConfirmModal', () => {
  function createComponent(email: string | null, platformRole: string | null) {
    TestBed.configureTestingModule({ imports: [LogoutConfirmModal] });
    const fixture = TestBed.createComponent(LogoutConfirmModal);
    fixture.componentRef.setInput('email', email);
    fixture.componentRef.setInput('platformRole', platformRole);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the current user email and role', () => {
    const fixture = createComponent('admin@onexso.test', 'Platform Super Admin');

    expect(fixture.nativeElement.textContent).toContain('admin@onexso.test');
    expect(fixture.nativeElement.textContent).toContain('Platform Super Admin');
  });

  it('emits confirmed when Log out is clicked', () => {
    const fixture = createComponent('admin@onexso.test', 'Platform Super Admin');
    const component = fixture.componentInstance;
    let confirmed = false;
    component.confirmed.subscribe(() => (confirmed = true));

    component.confirm();

    expect(confirmed).toBe(true);
  });

  it('emits cancelled when Cancel is clicked', () => {
    const fixture = createComponent('admin@onexso.test', 'Platform Super Admin');
    const component = fixture.componentInstance;
    let cancelled = false;
    component.cancelled.subscribe(() => (cancelled = true));

    component.cancel();

    expect(cancelled).toBe(true);
  });
});
