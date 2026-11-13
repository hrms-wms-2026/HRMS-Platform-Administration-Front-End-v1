import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AnnouncementsList } from './announcements-list';
import { AnnouncementsService } from '../../data/announcements.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';

describe('AnnouncementsList', () => {
  let announcementsService: { list: jest.Mock; publish: jest.Mock; unpublish: jest.Mock; remove: jest.Mock };
  let notificationService: { success: jest.Mock; error: jest.Mock };

  const announcement = {
    id: 'announcement-1',
    title: 'Scheduled maintenance',
    body: 'Down for 1 hour on Saturday.',
    severity: 'warning' as const,
    audience: 'all' as const,
    startsAt: null as string | null,
    endsAt: null as string | null,
    isPublished: false,
    publishedAt: null,
    createdAt: '2026-08-14T10:00:00Z',
    updatedAt: null,
  };

  function setup(permissions: string[] = ['platform.support.read']) {
    announcementsService = { list: jest.fn(), publish: jest.fn(), unpublish: jest.fn(), remove: jest.fn() };
    notificationService = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [AnnouncementsList],
      providers: [
        provideRouter([]),
        { provide: AnnouncementsService, useValue: announcementsService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AnnouncementsList);
    const store = TestBed.inject(PermissionStore);
    store.setAuthorizationContext({
      userId: 'u1',
      email: 'admin@example.com',
      platformRole: 'Platform Super Admin',
      expiresAt: '',
      mfaRequired: false,
      permissions,
      scopes: {},
      entitlements: [],
    });
    return fixture;
  }

  it('does not call the API and shows the no-permission message when unauthorized', () => {
    const fixture = setup([]);
    fixture.detectChanges();

    expect(announcementsService.list).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('No permission to view page');
  });

  it('loads announcements on init when authorized', () => {
    const fixture = setup();
    announcementsService.list.mockReturnValue(of({ items: [announcement], total: 1, page: 1, pageSize: 25 }));
    fixture.detectChanges();

    expect(announcementsService.list).toHaveBeenCalledWith({
      isPublished: undefined,
      severity: '',
      page: 1,
      pageSize: 25,
    });
    expect(fixture.nativeElement.textContent).toContain('Scheduled maintenance');
  });

  it('hides the New Announcement link without manage permission', () => {
    const fixture = setup(['platform.support.read']);
    announcementsService.list.mockReturnValue(of({ items: [], total: 0, page: 1, pageSize: 25 }));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('New Announcement');
  });

  it('publishes an announcement after confirming and merges the result into the list', () => {
    const fixture = setup(['platform.support.read', 'platform.support.manage']);
    announcementsService.list.mockReturnValue(of({ items: [announcement], total: 1, page: 1, pageSize: 25 }));
    fixture.detectChanges();

    announcementsService.publish.mockReturnValue(
      of({ ...announcement, isPublished: true, publishedAt: '2026-08-17T12:00:00Z' }),
    );

    const component = fixture.componentInstance;
    component['startToggle'](announcement);
    component['confirmToggle']();

    expect(announcementsService.publish).toHaveBeenCalledWith('announcement-1');
    expect(notificationService.success).toHaveBeenCalledWith('Announcement published.');
    expect(component['announcements']()[0].isPublished).toBe(true);
  });

  it('sends the correct is_published filter for the draft filter option', () => {
    const fixture = setup();
    announcementsService.list.mockReturnValue(of({ items: [], total: 0, page: 1, pageSize: 25 }));
    fixture.detectChanges();

    fixture.componentInstance['onStatusFilterChange']('draft');

    expect(announcementsService.list).toHaveBeenLastCalledWith({
      isPublished: false,
      severity: '',
      page: 1,
      pageSize: 25,
    });
  });

  it('deletes an announcement after confirming and drops it from the list', () => {
    const fixture = setup(['platform.support.read', 'platform.support.manage']);
    announcementsService.list.mockReturnValue(of({ items: [announcement], total: 1, page: 1, pageSize: 25 }));
    fixture.detectChanges();
    announcementsService.remove.mockReturnValue(of(undefined));

    const component = fixture.componentInstance;
    component['startDelete'](announcement);
    component['confirmDelete']();

    expect(announcementsService.remove).toHaveBeenCalledWith('announcement-1');
    expect(notificationService.success).toHaveBeenCalledWith('Announcement deleted.');
    expect(component['announcements']()).toEqual([]);
    expect(component['total']()).toBe(0);
  });

  it('shows Edit and Delete only with manage permission', () => {
    const readOnly = setup(['platform.support.read']);
    announcementsService.list.mockReturnValue(of({ items: [announcement], total: 1, page: 1, pageSize: 25 }));
    readOnly.detectChanges();
    expect(readOnly.nativeElement.textContent).not.toContain('Edit');
    expect(readOnly.nativeElement.textContent).not.toContain('Delete');
  });

  it('labels a published announcement by where it is in its display window', () => {
    const fixture = setup();
    announcementsService.list.mockReturnValue(of({ items: [], total: 0, page: 1, pageSize: 25 }));
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const past = new Date(Date.now() - 86_400_000).toISOString();

    expect(component['windowBadge']({ ...announcement, startsAt: future })?.label).toBe('Scheduled');
    expect(component['windowBadge']({ ...announcement, endsAt: past })?.label).toBe('Ended');
    expect(component['windowBadge']({ ...announcement, startsAt: past, endsAt: future })?.label).toBe('Live');
    expect(component['windowBadge'](announcement)).toBeNull();
  });
});
