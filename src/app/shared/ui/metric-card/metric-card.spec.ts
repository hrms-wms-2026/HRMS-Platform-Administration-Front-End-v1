import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { MetricCard } from './metric-card';

describe('MetricCard', () => {
  function setup(inputs: { label: string; value: string | number; hint?: string; link?: string }) {
    TestBed.configureTestingModule({
      imports: [MetricCard],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(MetricCard);
    fixture.componentRef.setInput('label', inputs.label);
    fixture.componentRef.setInput('value', inputs.value);
    if (inputs.hint !== undefined) fixture.componentRef.setInput('hint', inputs.hint);
    if (inputs.link !== undefined) fixture.componentRef.setInput('link', inputs.link);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the label and value', () => {
    const fixture = setup({ label: 'Total Tenants', value: 12 });

    expect(fixture.nativeElement.textContent).toContain('Total Tenants');
    expect(fixture.nativeElement.textContent).toContain('12');
  });

  it('renders a hint when provided', () => {
    const fixture = setup({ label: 'Open Invoices', value: 3, hint: '1 overdue' });

    expect(fixture.nativeElement.textContent).toContain('1 overdue');
  });

  it('renders a plain div when no link is provided', () => {
    const fixture = setup({ label: 'Total Tenants', value: 12 });

    expect(fixture.debugElement.query(By.css('a'))).toBeNull();
    expect(fixture.debugElement.query(By.css('div'))).toBeTruthy();
  });

  it('renders a routerLink anchor when a link is provided', () => {
    const fixture = setup({ label: 'Total Tenants', value: 12, link: '/tenants' });

    const anchor = fixture.debugElement.query(By.css('a'));
    expect(anchor).toBeTruthy();
    expect(anchor.nativeElement.getAttribute('href')).toBe('/tenants');
  });
});
