import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ServiceKeysList } from './service-keys-list';
import { ServiceKeysService } from '../../data/service-keys.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';

describe('ServiceKeysList', () => {
  let serviceKeysService: {
    list: jest.Mock;
    verify: jest.Mock;
    setActive: jest.Mock;
    updateDisplayName: jest.Mock;
  };
  let notificationService: { success: jest.Mock; error: jest.Mock };

  const sampleKey = {
    id: 'k1',
    serviceKey: 'resend',
    displayName: 'Resend',
    isActive: true,
    lastVerifiedAt: null,
    updatedById: 'u1',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  function setup(permissions: string[] = ['platform.system_config.read', 'platform.system_config.manage']) {
    serviceKeysService = {
      list: jest.fn().mockReturnValue(of([sampleKey])),
      verify: jest.fn(),
      setActive: jest.fn(),
      updateDisplayName: jest.fn(),
    };
    notificationService = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [ServiceKeysList],
      providers: [
        { provide: ServiceKeysService, useValue: serviceKeysService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ServiceKeysList);
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
    fixture.detectChanges();
    return fixture;
  }

  it('does not call the API and shows the no-permission message when unauthorized', () => {
    const fixture = setup([]);
    expect(serviceKeysService.list).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('No permission to view page');
  });

  it('loads and displays service keys when authorized', () => {
    const fixture = setup();
    expect(serviceKeysService.list).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('resend');
    expect(fixture.nativeElement.textContent).toContain('Active');
  });

  it('hides row actions without manage permission', () => {
    const fixture = setup(['platform.system_config.read']);
    expect(fixture.nativeElement.textContent).not.toContain('Verify');
    expect(fixture.nativeElement.textContent).not.toContain('Add Service Key');
  });

  it('shows a success toast when verify succeeds', () => {
    const fixture = setup();
    serviceKeysService.verify.mockReturnValue(of({ success: true, checkedAt: '2026-01-01T00:00:00Z', message: 'Key is valid.' }));
    const component = fixture.componentInstance;

    component['verifyKey']('resend');

    expect(notificationService.success).toHaveBeenCalledWith('Key is valid.');
  });

  it('shows an error toast when verify fails', () => {
    const fixture = setup();
    serviceKeysService.verify.mockReturnValue(of({ success: false, checkedAt: '2026-01-01T00:00:00Z', message: 'Key rejected by provider.' }));
    const component = fixture.componentInstance;

    component['verifyKey']('resend');

    expect(notificationService.error).toHaveBeenCalledWith('Key rejected by provider.');
  });

  it('toggles active state', () => {
    const fixture = setup();
    serviceKeysService.setActive.mockReturnValue(of({ ...sampleKey, isActive: false }));
    const component = fixture.componentInstance;

    component['toggleActive'](sampleKey);

    expect(serviceKeysService.setActive).toHaveBeenCalledWith('resend', false);
  });

  it('saves an edited display name', () => {
    const fixture = setup();
    serviceKeysService.updateDisplayName.mockReturnValue(of({ ...sampleKey, displayName: 'Resend Prod' }));
    const component = fixture.componentInstance;
    component['startEditName'](sampleKey);
    component['editingName'].set('Resend Prod');

    component['saveEditName']('resend');

    expect(serviceKeysService.updateDisplayName).toHaveBeenCalledWith('resend', 'Resend Prod');
  });

  it('shows the empty state when there are no keys', () => {
    serviceKeysService = { list: jest.fn().mockReturnValue(of([])), verify: jest.fn(), setActive: jest.fn(), updateDisplayName: jest.fn() };
    notificationService = { success: jest.fn(), error: jest.fn() };
    TestBed.configureTestingModule({
      imports: [ServiceKeysList],
      providers: [
        { provide: ServiceKeysService, useValue: serviceKeysService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ServiceKeysList);
    const store = TestBed.inject(PermissionStore);
    store.setAuthorizationContext({
      userId: 'u1',
      email: 'admin@example.com',
      platformRole: 'Platform Super Admin',
      expiresAt: '',
      mfaRequired: false,
      permissions: ['platform.system_config.read'],
      scopes: {},
      entitlements: [],
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No service keys configured yet');
  });
});
