import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { OAuthAppsList } from './oauth-apps-list';
import { OAuthAppsService } from '../../data/oauth-apps.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';

describe('OAuthAppsList', () => {
  let oauthAppsService: { list: jest.Mock };

  const apps = [
    {
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
    },
    {
      provider: 'google',
      displayName: 'Google',
      appName: 'ONEVO Admin',
      logoUrl: null,
      configured: true,
      isActive: true,
      clientId: 'client-abc',
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      defaultScopes: ['openid', 'profile', 'email'],
      capabilities: ['admin_sso', 'user_oauth', 'calendar'],
      clientSecretRequired: true,
      hasActiveCredential: true,
      activeCredentialVersion: 1,
      hasPrivateKey: false,
      lastVerifiedAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  function setup(permissions: string[] = ['platform.system_config.read']) {
    oauthAppsService = { list: jest.fn().mockReturnValue(of(apps)) };

    TestBed.configureTestingModule({
      imports: [OAuthAppsList],
      providers: [{ provide: OAuthAppsService, useValue: oauthAppsService }],
    }).compileComponents();

    const fixture = TestBed.createComponent(OAuthAppsList);
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
    expect(oauthAppsService.list).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('No permission to view page');
  });

  it('loads and displays all provider rows when authorized', () => {
    const fixture = setup();
    expect(oauthAppsService.list).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('GitHub');
    expect(fixture.nativeElement.textContent).toContain('Google');
  });

  it('shows Not configured for an unconfigured provider and Configured + Active for a configured one', () => {
    const fixture = setup();
    expect(fixture.nativeElement.textContent).toContain('Not configured');
    expect(fixture.nativeElement.textContent).toContain('Configured');
    expect(fixture.nativeElement.textContent).toContain('Active');
  });

  it('opens the drawer with the clicked provider', () => {
    const fixture = setup();
    const component = fixture.componentInstance;

    component['openDrawer']('github');

    expect(component['selectedProvider']()).toBe('github');
  });
});
