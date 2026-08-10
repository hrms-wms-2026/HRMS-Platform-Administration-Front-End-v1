import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { OAuthAppDetailDrawer } from './oauth-app-detail-drawer';
import { OAuthAppsService } from '../../data/oauth-apps.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';

describe('OAuthAppDetailDrawer', () => {
  let oauthAppsService: { getById: jest.Mock; configure: jest.Mock };
  let notificationService: { success: jest.Mock; error: jest.Mock };

  const githubApp = {
    provider: 'github',
    displayName: 'GitHub',
    appName: null,
    logoUrl: null,
    configured: false,
    isActive: false,
    clientId: null,
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    defaultScopes: ['read:user'],
    capabilities: ['user_oauth'],
    clientSecretRequired: true,
    hasActiveCredential: false,
    activeCredentialVersion: null,
    hasPrivateKey: false,
    lastVerifiedAt: null,
    updatedAt: null,
  };

  function setup(permissions: string[] = ['platform.system_config.read', 'platform.system_config.manage']) {
    oauthAppsService = {
      getById: jest.fn().mockReturnValue(of(githubApp)),
      configure: jest.fn(),
    };
    notificationService = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [OAuthAppDetailDrawer],
      providers: [
        { provide: OAuthAppsService, useValue: oauthAppsService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(OAuthAppDetailDrawer);
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
    fixture.componentRef.setInput('provider', 'github');
    fixture.detectChanges();
    return fixture;
  }

  it('loads the provider detail on init', () => {
    const fixture = setup();
    expect(oauthAppsService.getById).toHaveBeenCalledWith('github');
    expect(fixture.nativeElement.textContent).toContain('GitHub');
  });

  it('renders backend-owned scopes and capabilities as read-only text', () => {
    const fixture = setup();
    expect(fixture.nativeElement.textContent).toContain('read:user');
    expect(fixture.nativeElement.textContent).toContain('user_oauth');
  });

  it('hides the configure form without manage permission', () => {
    const fixture = setup(['platform.system_config.read']);
    expect(fixture.nativeElement.textContent).not.toContain('Save Configuration');
  });

  it('saves the configuration with entered values', () => {
    const fixture = setup();
    oauthAppsService.configure.mockReturnValue(of(githubApp));
    const component = fixture.componentInstance;
    component['configureForm'].patchValue({ appName: 'ONEVO', clientId: 'abc123', clientSecret: 'shh' });

    component['saveConfiguration']();

    expect(oauthAppsService.configure).toHaveBeenCalledWith('github', {
      appName: 'ONEVO',
      logoUrl: undefined,
      clientId: 'abc123',
      clientSecret: 'shh',
      privateKey: undefined,
    });
  });

  it('shows the backend error message on failure', () => {
    const fixture = setup();
    oauthAppsService.configure.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { detail: 'clientId is invalid.' } })),
    );
    const component = fixture.componentInstance;

    component['saveConfiguration']();

    expect(notificationService.error).toHaveBeenCalledWith('clientId is invalid.');
  });

  it('emits closed when the close button is clicked', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    let closed = false;
    component.closed.subscribe(() => (closed = true));

    component['close']();

    expect(closed).toBe(true);
  });
});
