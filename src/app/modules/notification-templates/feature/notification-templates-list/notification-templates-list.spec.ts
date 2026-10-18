import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';
import { NotificationTemplatesList } from './notification-templates-list';
import { NotificationTemplatesService } from '../../data/notification-templates.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';

describe('NotificationTemplatesList', () => {
  let service: { list: jest.Mock; listEvents: jest.Mock };

  const events = [
    { key: 'work_approval_requested', module: 'work_management', displayName: 'Work approval requested',
      supportedChannels: ['in_app', 'email', 'tray'], defaultChannels: ['in_app'], requiredChannels: [],
      variables: [], recipientRules: ['default'], actionKeys: ['open_related'] },
    { key: 'monitoring_break_reminder', module: 'monitoring', displayName: 'Break reminder',
      supportedChannels: ['tray'], defaultChannels: ['tray'], requiredChannels: [],
      variables: [], recipientRules: ['default'], actionKeys: ['none'] },
  ];
  const templates = [
    { id: 'tpl-1', code: 'work_approval_requested', eventKey: 'work_approval_requested', name: 'Default', locale: 'en',
      isProductDefault: true, activeVersion: 2, hasDraft: true, updatedAt: '2026-10-18T10:00:00Z' },
  ];

  function setup(permissions: string[] = ['platform.templates.read', 'platform.templates.manage']) {
    service = { list: jest.fn().mockReturnValue(of(templates)), listEvents: jest.fn().mockReturnValue(of(events)) };
    TestBed.configureTestingModule({
      imports: [NotificationTemplatesList],
      providers: [provideRouter([]), { provide: NotificationTemplatesService, useValue: service }],
    }).compileComponents();
    const fixture = TestBed.createComponent(NotificationTemplatesList);
    TestBed.inject(PermissionStore).setAuthorizationContext({
      userId: 'u1', email: 'admin@example.com', platformRole: 'Platform Super Admin', expiresAt: '',
      mfaRequired: false, permissions, scopes: {}, entitlements: [],
    });
    return fixture;
  }

  it('shows the no-permission message and calls nothing without read permission', () => {
    const fixture = setup([]);
    fixture.detectChanges();

    expect(service.list).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('No permission to view page');
  });

  it('lists templates with event name, live version and draft status', () => {
    const fixture = setup();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Notification Templates');
    expect(text).toContain('Default');
    expect(text).toContain('Work approval requested');
    expect(text).toContain('v2');
    expect(text).toContain('Draft');
  });

  it('filters by event and channel', () => {
    const fixture = setup();
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as {
      onEventFilter(key: string): void; onChannelFilter(channel: string): void; visibleEvents(): { key: string }[];
    };

    component.onChannelFilter('tray');
    expect(component.visibleEvents().map((e) => e.key)).toEqual(['work_approval_requested', 'monitoring_break_reminder']);
    component.onChannelFilter('email');
    expect(component.visibleEvents().map((e) => e.key)).toEqual(['work_approval_requested']);

    component.onEventFilter('work_approval_requested');
    expect(service.list).toHaveBeenLastCalledWith({ eventKey: 'work_approval_requested', search: undefined });
  });

  it('hides the create action from read-only users', () => {
    const fixture = setup(['platform.templates.read']);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Create Template');
  });

  it('shows a skeleton while loading and an error banner on failure', () => {
    const fixture = setup();
    service.list.mockReturnValue(NEVER);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-label="Loading content"]')).toBeTruthy();

    TestBed.resetTestingModule();
    const failing = setup();
    service.list.mockReturnValue(throwError(() => new Error('boom')));
    failing.detectChanges();
    expect(failing.nativeElement.textContent).toContain('Could not load notification templates');
  });
});
