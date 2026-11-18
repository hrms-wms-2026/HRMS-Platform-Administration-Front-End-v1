import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AnnouncementBanner } from './announcement-banner';
import { ActiveAnnouncementsService } from '../../../modules/support/data/active-announcements.service';

describe('AnnouncementBanner', () => {
  function setup(list: jest.Mock) {
    TestBed.configureTestingModule({
      imports: [AnnouncementBanner],
      providers: [{ provide: ActiveAnnouncementsService, useValue: { list } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(AnnouncementBanner);
    fixture.detectChanges();
    return fixture;
  }

  const announcements = [
    { id: 'a1', title: 'Scheduled maintenance', body: 'Sunday 02:00 UTC', severity: 'warning', publishedAt: null },
    { id: 'a2', title: 'Outage', body: 'Email delivery delayed', severity: 'critical', publishedAt: null },
  ];

  it('shows published announcements, with critical ones as alerts', () => {
    const fixture = setup(jest.fn().mockReturnValue(of(announcements)));

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Scheduled maintenance');
    expect(text).toContain('Email delivery delayed');
    expect(fixture.nativeElement.querySelectorAll('[role="alert"]').length).toBe(1);
  });

  it('hides an announcement once dismissed', () => {
    const fixture = setup(jest.fn().mockReturnValue(of(announcements)));

    const dismiss = fixture.nativeElement.querySelector('button[aria-label="Dismiss announcement: Outage"]');
    dismiss.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Outage');
    expect(fixture.nativeElement.textContent).toContain('Scheduled maintenance');
  });

  it('renders nothing when the feed fails', () => {
    const fixture = setup(jest.fn().mockReturnValue(throwError(() => new Error('down'))));

    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });
});
