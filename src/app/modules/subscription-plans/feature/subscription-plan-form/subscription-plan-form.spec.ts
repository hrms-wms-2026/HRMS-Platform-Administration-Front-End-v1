import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SubscriptionPlanForm } from './subscription-plan-form';
import { ModuleCatalogService } from '../../../module-catalog/data/module-catalog.service';

describe('SubscriptionPlanForm', () => {
  let moduleCatalogService: { list: jest.Mock };

  const modules = [
    {
      moduleKey: 'core-hr',
      name: 'Core HR',
      pillar: 'Organization Administration',
      phase: '1',
      pricingUnit: 'per_employee',
      isActive: true,
    },
    {
      moduleKey: 'leave',
      name: 'Leave Management',
      pillar: 'Workforce Monitoring',
      phase: '1',
      pricingUnit: 'per_employee',
      isActive: true,
    },
  ];

  function setup(mode: 'create' | 'edit' = 'create', initialValue: unknown = null) {
    moduleCatalogService = { list: jest.fn().mockReturnValue(of(modules)) };

    TestBed.configureTestingModule({
      imports: [SubscriptionPlanForm],
      providers: [{ provide: ModuleCatalogService, useValue: moduleCatalogService }],
    }).compileComponents();

    const fixture = TestBed.createComponent(SubscriptionPlanForm);
    fixture.componentRef.setInput('mode', mode);
    fixture.componentRef.setInput('initialValue', initialValue);
    fixture.detectChanges();
    return fixture;
  }

  it('loads the module catalog on init', () => {
    const fixture = setup();
    expect(moduleCatalogService.list).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Core HR');
  });

  it('does not allow submit until required fields and a module are set', () => {
    const fixture = setup();
    const component = fixture.componentInstance;

    expect(component['canSubmit']()).toBe(false);
  });

  it('disables the code field in edit mode', () => {
    const fixture = setup('edit', {
      id: 'plan-1',
      name: 'Starter',
      code: 'starter_1_10',
      tier: 'Starter',
      companySizeRange: '1-10',
      pricingUnit: 'per_employee',
      includedModules: ['core-hr'],
      calculatedMonthlyPrice: 10,
      calculatedAnnualPrice: 100,
      overrideMonthlyPrice: null,
      overrideAnnualPrice: null,
      effectiveMonthlyPrice: 10,
      effectiveAnnualPrice: 100,
      currency: 'USD',
      aiTokenLimitPerMonth: null,
      trialPeriodDays: 30,
      unpaidGracePeriodDays: 7,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: null,
    });
    const component = fixture.componentInstance;

    expect(component['form'].controls.code.disabled).toBe(true);
    expect(component['selectedModuleKeys']().has('core-hr')).toBe(true);
  });

  it('emits the form value with selected module keys on submit', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    let emitted: unknown;
    component.submitted.subscribe((value) => (emitted = value));

    component['form'].setValue({
      name: 'Starter',
      code: 'starter_1_10',
      tier: 'Starter',
      companySizeRange: '1-10',
      currency: 'USD',
      overrideMonthlyPrice: null,
      overrideAnnualPrice: null,
      aiTokenLimitPerMonth: null,
      trialPeriodDays: 30,
      unpaidGracePeriodDays: 7,
    });
    component['toggleModule']('core-hr');
    component['submit']();

    expect(emitted).toEqual({
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
    });
  });
});
