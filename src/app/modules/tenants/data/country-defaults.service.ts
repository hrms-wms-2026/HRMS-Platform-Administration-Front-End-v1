import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import { CountryDefaults, mapCountryDefaults } from './country-defaults.model';

interface CountryDefaultsResponse {
  country_code: string;
  country_name: string;
  default_timezone: string;
  timezones: string[];
  default_currency: string;
  currencies: Array<{ code: string; name: string; symbol: string }>;
}

@Injectable({ providedIn: 'root' })
export class CountryDefaultsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getDefaults(countryCodeAlpha2: string): Observable<CountryDefaults> {
    return this.http
      .get<CountryDefaultsResponse>(
        `${this.baseUrl}${API_ENDPOINTS.reference.countryDefaults(countryCodeAlpha2)}`,
        { withCredentials: true },
      )
      .pipe(map(mapCountryDefaults));
  }
}
