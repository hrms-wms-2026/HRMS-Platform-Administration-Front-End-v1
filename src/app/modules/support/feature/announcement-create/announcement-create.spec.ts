import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AnnouncementCreate } from './announcement-create';
import { AnnouncementsService } from '../../data/announcements.service';
import { NotificationService } from '../../../../core/services/notification.service';

describe('AnnouncementCreate', () => {
  let announcementsService: { create: jest.Mock };
  let notificationService: { success: jest.Mock; error: jest.Mock };
  let router: { navigateByUrl: jest.Mock };

  function setup() {
    announcementsService = { create: jest.fn() };
    notificationService = { success: jest.fn(), error: jest.fn() };
    router = { navigateByUrl: jest.fn() };

    TestBed.configureTestingModule({
      imports: [AnnouncementCreate],
      providers: [
        { provide: AnnouncementsService, useValue: announcementsService },
        { provide: NotificationService, useValue: notificationService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    return TestBed.createComponent(AnnouncementCreate);
  }

  it('does not submit when the form is invalid', () => {
    const fixture = setup();
    fixture.detectChanges();

    fixture.componentInstance['submit']();

    expect(announcementsService.create).not.toHaveBeenCalled();
  });

  it('creates the announcement and navigates to the list on success', () => {
    const fixture = setup();
    fixture.detectChanges();
    announcementsService.create.mockReturnValue(of({ id: 'announcement-1' }));

    const component = fixture.componentInstance;
    component['form'].setValue({
      title: 'Scheduled maintenance',
      body: 'Down for 1 hour on Saturday.',
      severity: 'warning',
      audience: 'all',
    });
    component['submit']();

    expect(announcementsService.create).toHaveBeenCalledWith({
      title: 'Scheduled maintenance',
      body: 'Down for 1 hour on Saturday.',
      severity: 'warning',
      audience: 'all',
    });
    expect(notificationService.success).toHaveBeenCalledWith('Announcement created.');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/support/announcements');
  });

  it('shows a backend error when creation fails', () => {
    const fixture = setup();
    fixture.detectChanges();
    announcementsService.create.mockReturnValue(
      throwError(() => new HttpErrorResponse({ error: { detail: 'Title is required.' } })),
    );

    const component = fixture.componentInstance;
    component['form'].setValue({
      title: 'Scheduled maintenance',
      body: 'Down for 1 hour on Saturday.',
      severity: 'info',
      audience: 'all',
    });
    component['submit']();

    expect(notificationService.error).toHaveBeenCalledWith('Title is required.');
    expect(component['saving']()).toBe(false);
  });
});
