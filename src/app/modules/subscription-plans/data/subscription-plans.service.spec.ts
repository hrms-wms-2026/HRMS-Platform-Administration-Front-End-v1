import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { SubscriptionPlansService } from './subscription-plans.service';
import { environment } from '../../../../environments/environment';

describe('SubscriptionPlansService', () => {
  let service: SubscriptionPlansService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SubscriptionPlansService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists subscription plans', () => {
    let result: unknown;
    service.list().subscribe((plans) => (result = plans));

    const req = httpMock.expectOne(`${environment.apiUrl}/subscription-plans`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);

    const plan = {
      id: 'plan-1',
      name: 'Starter - 51-200',
      code: 'starter_51_200',
      tier: 'starter',
      companySizeRange: '51-200',
      effectiveMonthlyPrice: 7.5,
      effectiveAnnualPrice: 75,
      currency: 'USD',
      isActive: true,
    };
    req.flush([plan]);

    expect(result).toEqual([plan]);
  });

  it('gets a subscription plan by id', () => {
    service.getById('plan-1').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/subscription-plans/plan-1`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush({});
  });

  it('creates a subscription plan', () => {
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
    service.create(request).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/subscription-plans`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    expect(req.request.withCredentials).toBe(true);
    req.flush({});
  });

  it('updates a subscription plan', () => {
    const request = { name: 'Starter Plus' };
    service.update('plan-1', request).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/subscription-plans/plan-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(request);
    expect(req.request.withCredentials).toBe(true);
    req.flush(null);
  });

  it('archives a subscription plan', () => {
    service.archive('plan-1').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/subscription-plans/plan-1`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.withCredentials).toBe(true);
    req.flush(null);
  });
});
