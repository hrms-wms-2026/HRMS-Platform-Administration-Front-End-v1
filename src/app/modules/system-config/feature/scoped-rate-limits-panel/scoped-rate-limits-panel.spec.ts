import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ScopedRateLimitsPanel } from './scoped-rate-limits-panel';
import { RateLimitsService } from '../../data/rate-limits.service';
import { EffectiveRateLimit, PlanRateLimit } from '../../data/rate-limit.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';

describe('ScopedRateLimitsPanel', () => {
  const bucket = { minPerMinute: 120, maxPerMinute: 3000, minBurst: 30, maxBurst: 500 };
  const tenantLimits: EffectiveRateLimit[] = [
    {
      limitName: 'SignedIn',
      algorithm: 'token_bucket',
      override: { perMinute: 1200, burst: 200, updatedAt: '2026-11-20T00:00:00Z', updatedByPlatformUserId: 'a1', rowVersion: 'R1' },
      effective: { perMinute: 1200, burst: 200 },
      effectiveSource: 'tenant',
      bounds: bucket,
    },
    { limitName: 'TrayDevice', algorithm: 'token_bucket', effective: { perMinute: 720, burst: 120 }, effectiveSource: 'plan', bounds: bucket },
    { limitName: 'TenantCeiling', algorithm: 'token_bucket', effective: { perMinute: 12000, burst: 3000 }, effectiveSource: 'global', bounds: bucket },
  ];
  const planLimits: PlanRateLimit[] = [
    {
      limitName: 'SignedIn',
      algorithm: 'token_bucket',
      inherited: { perMinute: 600, burst: 100 },
      inheritedSource: 'global',
      effective: { perMinute: 600, burst: 100 },
      effectiveSource: 'global',
      bounds: bucket,
    },
  ];

  let service: { getTenant: jest.Mock; getPlan: jest.Mock };

  function setup(target: { scope: 'tenant'; tenantId: string } | { scope: 'plan'; planId: string }, permissions: string[]) {
    service = {
      getTenant: jest.fn().mockReturnValue(of({ tenantId: 't1', limits: tenantLimits })),
      getPlan: jest.fn().mockReturnValue(of({ subscriptionPlanId: 'p1', limits: planLimits })),
    };
    TestBed.configureTestingModule({
      imports: [ScopedRateLimitsPanel],
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
    const fixture = TestBed.createComponent(ScopedRateLimitsPanel);
    fixture.componentRef.setInput('target', target);
    fixture.detectChanges();
    return fixture;
  }

  const row = (fixture: ReturnType<typeof setup>, name: string) =>
    fixture.nativeElement.querySelector(`[data-limit="${name}"]`) as HTMLElement;

  it('shows where each tenant value comes from', () => {
    const fixture = setup({ scope: 'tenant', tenantId: 't1' }, ['platform.system_config.read']);
    expect(service.getTenant).toHaveBeenCalledWith('t1');
    expect(row(fixture, 'SignedIn').textContent).toContain('Tenant override');
    expect(row(fixture, 'TrayDevice').textContent).toContain('Plan override');
    expect(row(fixture, 'TenantCeiling').textContent).toContain('Global override');
  });

  it('shows what a plan inherits when it has no override', () => {
    const fixture = setup({ scope: 'plan', planId: 'p1' }, ['platform.system_config.read']);
    expect(service.getPlan).toHaveBeenCalledWith('p1');
    expect(row(fixture, 'SignedIn').textContent).toContain('Inherits global: 600 / min, burst 100');
  });

  it('offers Override and Remove only with system_config.manage', () => {
    const managed = setup({ scope: 'tenant', tenantId: 't1' }, ['platform.system_config.read', 'platform.system_config.manage']);
    expect(row(managed, 'SignedIn').textContent).toContain('Remove');
    expect(row(managed, 'TrayDevice').textContent).toContain('Override');

    TestBed.resetTestingModule();
    const readOnly = setup({ scope: 'tenant', tenantId: 't1' }, ['platform.system_config.read', 'platform.tenants.manage']);
    expect(readOnly.nativeElement.querySelectorAll('button')).toHaveLength(0);
  });

  it('is not shown and loads nothing without system_config.read', () => {
    const fixture = setup({ scope: 'plan', planId: 'p1' }, ['platform.subscription_plans.read']);
    expect(service.getPlan).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[data-testid="scoped-rate-limits"]')).toBeNull();
  });
});
