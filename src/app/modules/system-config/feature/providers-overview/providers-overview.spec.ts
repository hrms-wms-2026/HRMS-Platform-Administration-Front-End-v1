import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ProvidersOverview } from './providers-overview';
import { ProvidersService } from '../../data/providers.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';

describe('ProvidersOverview', () => {
  let providersService: { list: jest.Mock };

  const cards = [
    {
      id: 'p1',
      providerKey: 'github',
      displayName: 'GitHub',
      providerFamily: 'oauth_app',
      configured: false,
      configurationActive: false,
      lastVerifiedAt: null,
    },
    {
      id: 'p2',
      providerKey: 'resend',
      displayName: 'Resend',
      providerFamily: 'transactional_email',
      configured: true,
      configurationActive: true,
      lastVerifiedAt: '2026-01-01T00:00:00Z',
    },
  ];

  function setup(permissions: string[] = ['platform.system_config.read']) {
    providersService = { list: jest.fn().mockReturnValue(of(cards)) };

    TestBed.configureTestingModule({
      imports: [ProvidersOverview],
      providers: [{ provide: ProvidersService, useValue: providersService }],
    }).compileComponents();

    const fixture = TestBed.createComponent(ProvidersOverview);
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
    expect(providersService.list).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('No permission to view page');
  });

  it('groups providers by family with correct section headings', () => {
    const fixture = setup();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('OAuth Apps');
    expect(text).toContain('GitHub');
    expect(text).toContain('Transactional Email');
    expect(text).toContain('Resend');
  });

  it('does not render a heading for a family with no entries', () => {
    const fixture = setup();
    expect(fixture.nativeElement.textContent).not.toContain('Payment Gateways');
    expect(fixture.nativeElement.textContent).not.toContain('Infrastructure');
  });

  it('shows Configured + Active badges for a configured provider and Not configured for an unconfigured one', () => {
    const fixture = setup();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Not configured');
    expect(text).toContain('Configured');
    expect(text).toContain('Active');
  });

  it('renders an em dash for a null lastVerifiedAt', () => {
    const fixture = setup();
    expect(fixture.nativeElement.textContent).toContain('—');
  });
});
