import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { SubscriptionPlanCreate } from './subscription-plan-create';
import { SubscriptionPlansService } from '../../data/subscription-plans.service';
import { NotificationService } from '../../../../core/services/notification.service';

describe('SubscriptionPlanCreate', () => {
  let plansService: { create: jest.Mock };
  let notificationService: { success: jest.Mock; error: jest.Mock };
  let router: { navigate: jest.Mock };

  const request = {
    name: 'Starter',
    code: 'starter_1_10',
    tier: 'Starter',
    companySizeRange: '1-10',
    moduleKeys: ['core-hr'],
    currency: 'USD',
    overrideMonthlyPrice: null,
    overrideAnnualPrice: null,
    aiTokenLimitPerMonth: null,
    trialPeriodDays: 30,
    unpaidGracePeriodDays: 7,
  };

  function setup() {
    plansService = { create: jest.fn() };
    notificationService = { success: jest.fn(), error: jest.fn() };
    router = { navigate: jest.fn() };

    TestBed.configureTestingModule({
      imports: [SubscriptionPlanCreate],
      providers: [
        { provide: SubscriptionPlansService, useValue: plansService },
        { provide: NotificationService, useValue: notificationService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    return TestBed.createComponent(SubscriptionPlanCreate);
  }

  it('creates the plan and navigates to its detail page on success', () => {
    const fixture = setup();
    plansService.create.mockReturnValue(of({ id: 'plan-1' }));
    const component = fixture.componentInstance;

    component['submit'](request);

    expect(plansService.create).toHaveBeenCalledWith(request);
    expect(notificationService.success).toHaveBeenCalledWith('Subscription plan created.');
    expect(router.navigate).toHaveBeenCalledWith(['/subscription-plans', 'plan-1']);
  });

  it('shows the backend error detail message on failure', () => {
    const fixture = setup();
    plansService.create.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { detail: "A subscription plan with code 'starter_1_10' already exists." },
          }),
      ),
    );
    const component = fixture.componentInstance;

    component['submit'](request);

    expect(notificationService.error).toHaveBeenCalledWith(
      "A subscription plan with code 'starter_1_10' already exists.",
    );
  });
});
