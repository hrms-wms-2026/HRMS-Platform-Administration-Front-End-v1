import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NotificationBell } from './notification-bell';
import { PlatformNotificationsService } from '../../../modules/notifications/data/platform-notifications.service';
import { PlatformNotification } from '../../../modules/notifications/data/platform-notification.model';

describe('NotificationBell', () => {
  let notifications: {
    list: jest.Mock;
    unreadCount: jest.Mock;
    markRead: jest.Mock;
    markAllRead: jest.Mock;
  };

  const item: PlatformNotification = {
    id: 'notif-1',
    title: 'Maintenance window',
    body: 'Down for 1 hour.',
    relatedEntityType: 'PlatformAnnouncement',
    relatedEntityId: 'announcement-1',
    isRead: false,
    readAt: null,
    createdAt: '2026-08-18T10:00:00Z',
  };

  function setup(unreadCount = 1) {
    notifications = {
      list: jest.fn().mockReturnValue(of([item])),
      unreadCount: jest.fn().mockReturnValue(of({ count: unreadCount })),
      markRead: jest.fn().mockReturnValue(of(undefined)),
      markAllRead: jest.fn().mockReturnValue(of(undefined)),
    };

    TestBed.configureTestingModule({
      imports: [NotificationBell],
      providers: [{ provide: PlatformNotificationsService, useValue: notifications }],
    }).compileComponents();

    const fixture = TestBed.createComponent(NotificationBell);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => jest.useRealTimers());

  it('fetches the unread count on init and shows a badge', () => {
    const fixture = setup(3);

    expect(notifications.unreadCount).toHaveBeenCalled();
    expect(fixture.componentInstance['unreadCount']()).toBe(3);
    expect(fixture.nativeElement.textContent).toContain('3');
  });

  it('shows no badge when there are no unread notifications', () => {
    const fixture = setup(0);
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.bg-red-600');
    expect(badge).toBeFalsy();
  });

  it('is closed by default and loads notifications when opened', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    expect(component['open']()).toBe(false);

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[aria-label="Notifications"]');
    button.click();

    expect(component['open']()).toBe(true);
    expect(notifications.list).toHaveBeenCalledWith(false, 1);
    expect(component['items']()).toEqual([item]);
  });

  it('closes when a click happens outside the component', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    component['open'].set(true);

    document.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(component['open']()).toBe(false);
  });

  it('closes when Escape is pressed', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    component['open'].set(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(component['open']()).toBe(false);
  });

  it('marks a single notification read and refreshes the unread count', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    component['items'].set([item]);

    component['markRead'](item);

    expect(notifications.markRead).toHaveBeenCalledWith('notif-1');
    expect(component['items']()[0].isRead).toBe(true);
    expect(notifications.unreadCount).toHaveBeenCalledTimes(2);
  });

  it('does not call markRead again for an already-read notification', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    component['items'].set([{ ...item, isRead: true }]);

    component['markRead']({ ...item, isRead: true });

    expect(notifications.markRead).not.toHaveBeenCalled();
  });

  it('marks all notifications read and zeroes the unread count', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    component['items'].set([item]);
    component['unreadCount'].set(1);

    component['markAllRead']();

    expect(notifications.markAllRead).toHaveBeenCalled();
    expect(component['items']()[0].isRead).toBe(true);
    expect(component['unreadCount']()).toBe(0);
  });
});
