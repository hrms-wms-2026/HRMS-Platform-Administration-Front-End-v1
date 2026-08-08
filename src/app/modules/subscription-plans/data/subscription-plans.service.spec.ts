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
});
