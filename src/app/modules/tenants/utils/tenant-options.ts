import * as isoCountries from 'i18n-iso-countries';
import * as isoCountriesEnLocale from 'i18n-iso-countries/langs/en.json';

isoCountries.registerLocale(isoCountriesEnLocale);

export interface SelectOption {
  value: string;
  label: string;
}

export const INDUSTRY_OPTIONS: readonly SelectOption[] = [
  { value: 'office_it', label: 'Office / IT' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'retail', label: 'Retail' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'education', label: 'Education' },
  { value: 'finance', label: 'Finance' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'other', label: 'Other' },
];

export const COMPANY_SIZE_OPTIONS: readonly SelectOption[] = [
  { value: '1-10', label: '1-10' },
  { value: '11-50', label: '11-50' },
  { value: '51-200', label: '51-200' },
  { value: '201-500', label: '201-500' },
  { value: '500+', label: '500+' },
];

const COUNTRY_NAMES_BY_ALPHA2 = isoCountries.getNames('en', { select: 'official' });

const POPULAR_COUNTRY_ALPHA3 = ['LKA', 'USA', 'IND', 'GBR', 'ARE', 'AUS', 'CAN', 'DEU', 'FRA', 'SGP'] as const;
const POPULAR_CURRENCY_CODES = ['USD', 'EUR', 'GBP', 'INR', 'LKR', 'AED', 'SGD', 'CAD', 'AUD', 'JPY', 'CHF'] as const;
const CURRENCY_DISPLAY_NAMES = new Intl.DisplayNames(['en'], { type: 'currency' });

export const POPULAR_COUNTRY_OPTIONS: readonly SelectOption[] = POPULAR_COUNTRY_ALPHA3.flatMap((code) => {
  const match = Object.entries(COUNTRY_NAMES_BY_ALPHA2).find(([alpha2]) => {
    const alpha3 = isoCountries.alpha2ToAlpha3(alpha2) ?? alpha2;
    return alpha3 === code;
  });
  if (!match) {
    return [];
  }
  const [alpha2, name] = match;
  const alpha3 = isoCountries.alpha2ToAlpha3(alpha2) ?? alpha2;
  return [{ value: alpha3, label: `${name} (${alpha3})` }];
});

export const POPULAR_CURRENCY_OPTIONS: readonly SelectOption[] = POPULAR_CURRENCY_CODES.map((code) => ({
  value: code,
  label: `${code} - ${CURRENCY_DISPLAY_NAMES.of(code)}`,
}));

/** ISO-3166-1 alpha-3 codes — matches the backend's Country field (NotEmpty, MaxLength(3)). */
export const COUNTRY_CODE_OPTIONS: readonly SelectOption[] = (() => {
  const all = Object.entries(COUNTRY_NAMES_BY_ALPHA2)
    .map(([alpha2, name]) => {
      const alpha3 = isoCountries.alpha2ToAlpha3(alpha2) ?? alpha2;
      return { value: alpha3, label: `${name} (${alpha3})` };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  const popular = POPULAR_COUNTRY_OPTIONS.length > 0 ? [...POPULAR_COUNTRY_OPTIONS] : POPULAR_COUNTRY_ALPHA3.flatMap((code) => {
    const match = all.find((option) => option.value === code);
    return match ? [match] : [];
  });
  const popularSet = new Set(popular.map((option) => option.value));
  const rest = all.filter((option) => !popularSet.has(option.value));
  return [...popular, ...rest];
})();

export function alpha3ToAlpha2(alpha3: string): string | undefined {
  return isoCountries.alpha3ToAlpha2(alpha3) ?? undefined;
}

export function timezoneOptionsFromValues(values: readonly string[]): readonly SelectOption[] {
  return values
    .map((zone) => ({ value: zone, label: zone.replace(/_/g, ' ') }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function currencyOptionsFromCodes(codes: readonly string[]): readonly SelectOption[] {
  const uniqueCodes = [...new Set([...codes, ...POPULAR_CURRENCY_CODES])];
  const options = uniqueCodes.map((code) => ({
    value: code,
    label: `${code} - ${CURRENCY_DISPLAY_NAMES.of(code)}`,
  }));

  const popular = POPULAR_CURRENCY_OPTIONS.filter((option) => uniqueCodes.includes(option.value));
  const popularSet = new Set(popular.map((option) => option.value));
  const rest = options
    .filter((option) => !popularSet.has(option.value))
    .sort((a, b) => a.label.localeCompare(b.label));
  return [...popular, ...rest];
}

export const CURRENCY_CODE_OPTIONS: readonly SelectOption[] = currencyOptionsFromCodes(
  Intl.supportedValuesOf('currency'),
);

export const TIMEZONE_OPTIONS: readonly SelectOption[] = Intl.supportedValuesOf('timeZone')
  .map((zone) => ({ value: zone, label: zone.replace(/_/g, ' ') }))
  .sort((a, b) => a.label.localeCompare(b.label));

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
