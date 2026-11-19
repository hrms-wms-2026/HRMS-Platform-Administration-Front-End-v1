import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AnnouncementCreate } from './announcement-create';
import { AnnouncementsService } from '../../data/announcements.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { fromDateTimeLocal } from '../../data/announcement.model';

describe('AnnouncementCreate', () => {
  let announcementsService: { create: jest.Mock; update: jest.Mock; getById: jest.Mock };
  let notificationService: { success: jest.Mock; error: jest.Mock };
  let router: { navigateByUrl: jest.Mock };

  const existing = {
    id: 'announcement-1',
    title: 'Scheduled maintenance',
    body: 'Down for 1 hour on Saturday.',
    severity: 'warning',
    audience: 'tenants',
    startsAt: '2026-08-15T08:00:00.000Z',
    endsAt: null,
    isPublished: true,
    publishedAt: '2026-08-14T10:00:00Z',
    createdAt: '2026-08-14T10:00:00Z',
    updatedAt: null,
  };

  function setup(routeId: string | null = null) {
    announcementsService = { create: jest.fn(), update: jest.fn(), getById: jest.fn() };
    notificationService = { success: jest.fn(), error: jest.fn() };
    router = { navigateByUrl: jest.fn() };

    TestBed.configureTestingModule({
      imports: [AnnouncementCreate],
      providers: [
        { provide: AnnouncementsService, useValue: announcementsService },
        { provide: NotificationService, useValue: notificationService },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(routeId ? { id: routeId } : {}) } },
        },
      ],
    }).compileComponents();

    return TestBed.createComponent(AnnouncementCreate);
  }

  function fill(component: AnnouncementCreate, overrides: Partial<Record<string, string>> = {}) {
    component['form'].setValue({
      title: 'Scheduled maintenance',
      body: 'Down for 1 hour on Saturday.',
      severity: 'warning',
      audience: 'all',
      startsAt: '',
      endsAt: '',
      ...overrides,
    } as never);
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
    fill(component, { startsAt: '2026-08-15T08:00' });
    component['submit']();

    expect(announcementsService.create).toHaveBeenCalledWith({
      title: 'Scheduled maintenance',
      body: 'Down for 1 hour on Saturday.',
      severity: 'warning',
      audience: 'all',
      startsAt: fromDateTimeLocal('2026-08-15T08:00'),
      endsAt: null,
    });
    expect(notificationService.success).toHaveBeenCalledWith('Announcement created.');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/support/announcements');
  });

  it('rejects a display window that ends before it starts', () => {
    const fixture = setup();
    fixture.detectChanges();

    const component = fixture.componentInstance;
    fill(component, { startsAt: '2026-08-15T10:00', endsAt: '2026-08-15T09:00' });
    component['submit']();

    expect(component['form'].hasError('windowOrder')).toBe(true);
    expect(announcementsService.create).not.toHaveBeenCalled();
  });

  it('shows a backend error when creation fails', () => {
    const fixture = setup();
    fixture.detectChanges();
    announcementsService.create.mockReturnValue(
      throwError(() => new HttpErrorResponse({ error: { detail: 'Title is required.' } })),
    );

    const component = fixture.componentInstance;
    fill(component, { severity: 'info' });
    component['submit']();

    expect(notificationService.error).toHaveBeenCalledWith('Title is required.');
    expect(component['saving']()).toBe(false);
  });

  it('loads the announcement in edit mode and saves it with PUT', () => {
    const fixture = setup('announcement-1');
    announcementsService.getById.mockReturnValue(of(existing));
    announcementsService.update.mockReturnValue(of(existing));
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(announcementsService.getById).toHaveBeenCalledWith('announcement-1');
    expect(component['isEdit']()).toBe(true);
    expect(component['form'].getRawValue().title).toBe('Scheduled maintenance');
    expect(component['form'].getRawValue().audience).toBe('tenants');
    expect(fromDateTimeLocal(component['form'].getRawValue().startsAt)).toBe('2026-08-15T08:00:00.000Z');

    component['form'].controls.title.setValue('Maintenance moved');
    component['submit']();

    expect(announcementsService.create).not.toHaveBeenCalled();
    expect(announcementsService.update).toHaveBeenCalledWith(
      'announcement-1',
      expect.objectContaining({ title: 'Maintenance moved', startsAt: '2026-08-15T08:00:00.000Z', endsAt: null }),
    );
    expect(notificationService.success).toHaveBeenCalledWith('Announcement updated.');
  });

  it('shows a not-found message when the announcement to edit is gone', () => {
    const fixture = setup('missing');
    announcementsService.getById.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    fixture.detectChanges();

    expect(fixture.componentInstance['loadError']()).toBe('This announcement no longer exists.');
  });
});
