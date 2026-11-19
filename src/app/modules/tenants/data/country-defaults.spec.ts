import { mapCountryDefaults } from './country-defaults.model';
import { CountryDefaultsService } from './country-defaults.service';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

describe('country defaults model', () => {
  it('maps snake_case API payload to camelCase defaults', () => {
    const result = mapCountryDefaults({
      country_code: 'US',
      country_name: 'United States',
      default_timezone: 'America/New_York',
      timezones: ['America/New_York', 'America/Chicago'],
      default_currency: 'USD',
      currencies: [{ code: 'USD', name: 'US Dollar', symbol: '$' }],
    });

    expect(result).toEqual({
      countryCode: 'US',
      countryName: 'United States',
      defaultTimezone: 'America/New_York',
      timezones: ['America/New_York', 'America/Chicago'],
      defaultCurrency: 'USD',
      currencies: [{ code: 'USD', name: 'US Dollar', symbol: '$' }],
    });
  });
});

describe('CountryDefaultsService', () => {
  let service: CountryDefaultsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CountryDefaultsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('fetches mapped country defaults', () => {
    let result: unknown;
    service.getDefaults('US').subscribe((defaults) => (result = defaults));

    const req = httpMock.expectOne(`${environment.apiUrl}/reference/countries/US/defaults`);
    expect(req.request.method).toBe('GET');
    req.flush({
      country_code: 'US',
      country_name: 'United States',
      default_timezone: 'America/New_York',
      timezones: ['America/New_York'],
      default_currency: 'USD',
      currencies: [{ code: 'USD', name: 'US Dollar', symbol: '$' }],
    });

    expect(result).toEqual(expect.objectContaining({ countryCode: 'US', defaultCurrency: 'USD' }));
  });
});
