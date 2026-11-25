import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { RateLimitsList } from './rate-limits-list';
import { RateLimitsService } from '../../data/rate-limits.service';
import { GlobalRateLimit } from '../../data/rate-limit.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';

describe('RateLimitsList', () => {
  const limits: GlobalRateLimit[] = [
    {
      limitName: 'SignedIn',
      algorithm: 'token_bucket',
      override: { perMinute: 900, burst: 150, updatedAt: '2026-11-20T00:00:00Z', updatedByPlatformUserId: 'a1', rowVersion: 'R1' },
      appSettings: { perMinute: 600, burst: 100 },
      effective: { perMinute: 900, burst: 150 },
      effectiveSource: 'global',
      bounds: { minPerMinute: 120, maxPerMinute: 3000, minBurst: 30, maxBurst: 500 },
    },
    {
      limitName: 'Anonymous',
      algorithm: 'sliding_window',
      appSettings: { perMinute: 300 },
      effective: { perMinute: 300 },
      effectiveSource: 'appsettings',
      bounds: { minPerMinute: 60, maxPerMinute: 1200 },
    },
  ];

  let service: { listGlobal: jest.Mock; listChanges: jest.Mock };

  function setup(permissions: string[]) {
    service = {
      listGlobal: jest.fn().mockReturnValue(of(limits)),
      listChanges: jest.fn().mockReturnValue(
        of({
          items: [
            {
              id: 'c1',
              changedAt: '2026-11-20T00:00:00Z',
              platformUserId: 'a1',
              platformUserName: 'Ada Admin',
              scope: 'global',
              limitName: 'SignedIn',
              oldPerMinute: null,
              newPerMinute: 900,
              newBurst: 150,
              reason: 'Import week',
            },
          ],
          pageNumber: 1,
          pageSize: 10,
          totalCount: 1,
        }),
      ),
    };
    TestBed.configureTestingModule({
      imports: [RateLimitsList],
      providers: [
        { provide: RateLimitsService, useValue: service },
        { provide: NotificationService, useValue: { success: jest.fn(), error: jest.fn() } },
      ],
    });
    TestBed.inject(PermissionStore).setAuthorizationContext({
      userId: 'u1',
      email: 'admin@example.com',
      platformRole: 'Platform Admin',
      expiresAt: '',
      mfaRequired: false,
      mfaEnrollmentRequired: false,
      permissions,
      scopes: {},
      entitlements: [],
    });
    const fixture = TestBed.createComponent(RateLimitsList);
    fixture.detectChanges();
    return fixture;
  }

  const buttons = (fixture: ReturnType<typeof setup>) =>
    Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).map((b) =>
      b.textContent?.trim(),
    );

  it('shows each limit with a plain label, its default and its range, and the history', () => {
    const fixture = setup(['platform.system_config.read', 'platform.system_config.manage']);
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Signed-in user');
    expect(text).toContain('Signed-out visitors');
    expect(text).toContain('600 / min, burst 100');
    expect(text).toContain('120–3000 / min');
    expect(text).toContain('Import week');
    expect(text).toContain('default → 900/min, burst 150');
    expect(service.listChanges).toHaveBeenCalledWith({ scope: 'global', page: 1, pageSize: 10 });
  });

  it('offers Edit on every row and Reset only where there is an override, with manage', () => {
    const fixture = setup(['platform.system_config.read', 'platform.system_config.manage']);
    expect(buttons(fixture).filter((b) => b === 'Edit')).toHaveLength(2);
    expect(buttons(fixture).filter((b) => b === 'Reset to default')).toHaveLength(1);
  });

  it('hides every edit action with read only', () => {
    const fixture = setup(['platform.system_config.read']);
    expect(buttons(fixture)).not.toContain('Edit');
    expect(buttons(fixture)).not.toContain('Reset to default');
    expect(fixture.nativeElement.textContent).toContain('Signed-in user');
  });

  it('loads nothing without read', () => {
    const fixture = setup([]);
    expect(service.listGlobal).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('No permission to view page');
  });

  it('never lists the login, MFA or password reset limits or the master switch', () => {
    const fixture = setup(['platform.system_config.read', 'platform.system_config.manage']);
    const text = fixture.nativeElement.textContent as string;
    expect(text).not.toMatch(/PreAuthentication|Enabled/);
  });
});
