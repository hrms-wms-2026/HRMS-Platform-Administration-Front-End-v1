import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { SUPPORT_BELL_REFRESH_MS, SupportBell } from './support-bell';
import { SupportTicketsService } from '../../../modules/support/data/support-tickets.service';

describe('SupportBell', () => {
  let ticketsService: { getSummary: jest.Mock };

  const summary = { awaitingSupport: 4, awaitingSupportAssignedToMe: 1, openUnassigned: 2 };

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  function setup() {
    ticketsService = { getSummary: jest.fn().mockReturnValue(of(summary)) };
    TestBed.configureTestingModule({
      imports: [SupportBell],
      providers: [provideRouter([]), { provide: SupportTicketsService, useValue: ticketsService }],
    }).compileComponents();
    return TestBed.createComponent(SupportBell);
  }

  function start(fixture: ReturnType<typeof setup>) {
    fixture.detectChanges();
    jest.advanceTimersByTime(0);
    fixture.detectChanges();
  }

  function countText(fixture: ReturnType<typeof setup>): string | null {
    const badge = fixture.nativeElement.querySelector('[data-testid="support-bell-count"]');
    return badge ? badge.textContent.trim() : null;
  }

  it('shows the awaiting-support count and refreshes it every interval', () => {
    const fixture = setup();
    start(fixture);

    expect(ticketsService.getSummary).toHaveBeenCalledTimes(1);
    expect(countText(fixture)).toBe('4');

    jest.advanceTimersByTime(SUPPORT_BELL_REFRESH_MS);
    expect(ticketsService.getSummary).toHaveBeenCalledTimes(2);
    fixture.destroy();
  });

  it('hides the count when nothing is waiting and caps large counts at 99+', () => {
    const fixture = setup();
    ticketsService.getSummary.mockReturnValue(of({ ...summary, awaitingSupport: 0 }));
    start(fixture);
    expect(countText(fixture)).toBeNull();

    fixture.componentInstance['summary'].set({ ...summary, awaitingSupport: 150 });
    fixture.detectChanges();
    expect(countText(fixture)).toBe('99+');
    fixture.destroy();
  });

  it('opens a menu linking to the filtered ticket lists', () => {
    const fixture = setup();
    start(fixture);

    fixture.nativeElement.querySelector('button').click();
    fixture.detectChanges();

    const links = Array.from(
      fixture.nativeElement.querySelectorAll('a[role="menuitem"]'),
    ) as HTMLAnchorElement[];
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/support/tickets?awaiting=1',
      '/support/tickets?awaiting=1&assignee=me',
      '/support/tickets?status=open&assignee=unassigned',
    ]);
    expect(
      links.map((link) =>
        Array.from(link.querySelectorAll('span'))
          .map((span) => span.textContent?.trim())
          .join(' '),
      ),
    ).toEqual(['Awaiting support 4', 'Awaiting, assigned to me 1', 'Open and unassigned 2']);
    fixture.destroy();
  });

  it('closes the menu on an outside click', () => {
    const fixture = setup();
    start(fixture);
    fixture.nativeElement.querySelector('button').click();
    fixture.detectChanges();
    expect(fixture.componentInstance['open']()).toBe(true);

    document.body.click();
    expect(fixture.componentInstance['open']()).toBe(false);
    fixture.destroy();
  });

  it('stops polling after a 403 so a missing permission does not repeat every minute', () => {
    const fixture = setup();
    ticketsService.getSummary.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 403 })),
    );
    start(fixture);

    jest.advanceTimersByTime(SUPPORT_BELL_REFRESH_MS * 3);
    expect(ticketsService.getSummary).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance['summary']()).toBeNull();
    fixture.destroy();
  });

  it('keeps polling after a transient failure', () => {
    const fixture = setup();
    ticketsService.getSummary
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 503 })))
      .mockReturnValue(of(summary));
    start(fixture);
    expect(ticketsService.getSummary).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(SUPPORT_BELL_REFRESH_MS);
    expect(ticketsService.getSummary).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance['summary']()).toEqual(summary);
    fixture.destroy();
  });
});
