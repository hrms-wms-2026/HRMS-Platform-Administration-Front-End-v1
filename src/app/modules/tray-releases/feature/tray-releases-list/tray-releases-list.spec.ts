import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TrayReleasesList } from './tray-releases-list';
import { TrayReleasesService } from '../../data/tray-releases.service';
import { TrayRelease } from '../../data/tray-release.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';

describe('TrayReleasesList', () => {
  let service: { list: jest.Mock; update: jest.Mock; create: jest.Mock };
  let notification: { success: jest.Mock; error: jest.Mock };

  const release = (over: Partial<TrayRelease>): TrayRelease => ({
    id: 'r1',
    version: '1.2.0',
    channel: 'stable',
    downloadUrl: 'https://dl.example.com/onevo-1.2.0.msix',
    sha256: 'a'.repeat(64),
    fileSizeBytes: 52428800,
    publisher: 'CN=ONEVO',
    minimumWindowsVersion: '10.0.19041.0',
    minSupportedVersion: null,
    releaseNotes: null,
    isActive: true,
    source: 'admin',
    createdAt: '2026-09-19T00:00:00Z',
    updatedAt: '2026-09-19T00:00:00Z',
    ...over,
  });

  function setup(
    releases: TrayRelease[] = [release({}), release({ id: 'r2', version: '1.3.0', channel: 'beta', isActive: false })],
    permissions = ['platform.system_config.read', 'platform.system_config.manage'],
  ) {
    service = {
      list: jest.fn().mockReturnValue(of(releases)),
      update: jest.fn().mockReturnValue(of({})),
      create: jest.fn(),
    };
    notification = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [TrayReleasesList],
      providers: [
        { provide: TrayReleasesService, useValue: service },
        { provide: NotificationService, useValue: notification },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TrayReleasesList);
    TestBed.inject(PermissionStore).setAuthorizationContext({
      userId: 'u1',
      email: 'admin@example.com',
      platformRole: 'Platform Super Admin',
      expiresAt: '',
      mfaRequired: false,
      permissions,
      scopes: {},
      entitlements: [],
    });
    fixture.detectChanges();
    return fixture;
  }

  const buttons = (fixture: { nativeElement: HTMLElement }): HTMLButtonElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('button'));
  const findButton = (fixture: { nativeElement: HTMLElement }, text: string) =>
    buttons(fixture).find((b) => b.textContent?.trim() === text);

  it('shows the no-permission message and does not call the API when unauthorized', () => {
    const fixture = setup([], []);
    expect(service.list).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('No permission to view page');
  });

  it('loads and renders releases with channel and status', () => {
    const fixture = setup();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('1.2.0');
    expect(text).toContain('1.3.0');
    expect(text).toContain('Stable');
    expect(text).toContain('Beta');
    expect(text).toContain('Active');
    expect(text).toContain('Inactive');
    expect(text).toContain('50.0 MB');
  });

  it('shows an empty state when there are no releases', () => {
    const fixture = setup([]);
    expect(fixture.nativeElement.textContent).toContain('No tray releases yet');
  });

  it('shows an error banner when loading fails', () => {
    service = { list: jest.fn().mockReturnValue(throwError(() => new Error('x'))), update: jest.fn(), create: jest.fn() };
    notification = { success: jest.fn(), error: jest.fn() };
    TestBed.configureTestingModule({
      imports: [TrayReleasesList],
      providers: [
        { provide: TrayReleasesService, useValue: service },
        { provide: NotificationService, useValue: notification },
      ],
    });
    const fixture = TestBed.createComponent(TrayReleasesList);
    TestBed.inject(PermissionStore).setAuthorizationContext({
      userId: 'u1', email: 'a@b.c', platformRole: 'Platform Super Admin', expiresAt: '',
      mfaRequired: false, permissions: ['platform.system_config.read'], scopes: {}, entitlements: [],
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Could not load tray releases.');
  });

  it('activating an inactive release calls update(id, { isActive: true }) then reloads', () => {
    const fixture = setup();
    findButton(fixture, 'Activate')!.click();
    expect(service.update).toHaveBeenCalledWith('r2', { isActive: true });
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it('promoting a beta release calls update after confirmation', () => {
    const fixture = setup();
    findButton(fixture, 'Promote to stable')!.click();
    fixture.detectChanges();
    expect(service.update).not.toHaveBeenCalled();

    findButton(fixture, 'Promote')!.click();
    expect(service.update).toHaveBeenCalledWith('r2', { channel: 'stable', isActive: true });
  });

  it('hides create/activate/promote controls without the manage permission', () => {
    const fixture = setup(undefined, ['platform.system_config.read']);
    const labels = buttons(fixture).map((b) => b.textContent?.trim());
    expect(labels).not.toContain('New release');
    expect(labels).not.toContain('Activate');
    expect(labels).not.toContain('Promote to stable');
  });

  it('opens the create modal from the New release button', () => {
    const fixture = setup();
    findButton(fixture, 'New release')!.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-tray-release-form-modal')).not.toBeNull();
  });
});
