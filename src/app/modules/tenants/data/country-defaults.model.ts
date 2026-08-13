export interface CountryDefaults {
  countryCode: string;
  countryName: string;
  defaultTimezone: string;
  timezones: string[];
  defaultCurrency: string;
  currencies: CountryCurrencyOption[];
}

export interface CountryCurrencyOption {
  code: string;
  name: string;
  symbol: string;
}

interface CountryDefaultsResponse {
  country_code: string;
  country_name: string;
  default_timezone: string;
  timezones: string[];
  default_currency: string;
  currencies: { code: string; name: string; symbol: string }[];
}

export function mapCountryDefaults(response: CountryDefaultsResponse): CountryDefaults {
  return {
    countryCode: response.country_code,
    countryName: response.country_name,
    defaultTimezone: response.default_timezone,
    timezones: response.timezones,
    defaultCurrency: response.default_currency,
    currencies: response.currencies.map((currency) => ({
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
    })),
  };
}
