import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { SubscriptionPlansList } from './subscription-plans-list';
import { SubscriptionPlansService } from '../../data/subscription-plans.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';

describe('SubscriptionPlansList', () => {
  let plansService: { list: jest.Mock };

  function setup(permissions: string[] = ['platform.subscriptions.read']) {
    plansService = { list: jest.fn() };

    TestBed.configureTestingModule({
      imports: [SubscriptionPlansList],
      providers: [provideRouter([]), { provide: SubscriptionPlansService, useValue: plansService }],
    }).compileComponents();

    const fixture = TestBed.createComponent(SubscriptionPlansList);
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

    expect(plansService.list).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('No permission to view page');
  });

  it('loads plans on init when authorized', () => {
    const fixture = setup();
    plansService.list.mockReturnValue(
      of([
        {
          id: 'plan-1',
          name: 'Starter',
          code: 'starter_1_10',
          tier: 'Starter',
          companySizeRange: '1-10',
          effectiveMonthlyPrice: 10,
          effectiveAnnualPrice: 100,
          currency: 'USD',
          isActive: true,
        },
      ]),
    );
    fixture.detectChanges();

    expect(plansService.list).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Starter');
  });

  it('does not show the Create Plan button without manage permission', () => {
    const fixture = setup(['platform.subscriptions.read']);
    plansService.list.mockReturnValue(of([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Create Plan');
  });

  it('shows the Create Plan button with manage permission', () => {
    const fixture = setup(['platform.subscriptions.read', 'platform.subscriptions.manage']);
    plansService.list.mockReturnValue(of([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Create Plan');
  });
});
