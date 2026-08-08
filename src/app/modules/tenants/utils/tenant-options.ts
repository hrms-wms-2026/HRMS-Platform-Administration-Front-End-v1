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

/** ISO-3166-1 alpha-3 codes — matches the backend's Country field (NotEmpty, MaxLength(3)). */
export const COUNTRY_CODE_OPTIONS: readonly SelectOption[] = Object.entries(COUNTRY_NAMES_BY_ALPHA2)
  .map(([alpha2, name]) => {
    const alpha3 = isoCountries.alpha2ToAlpha3(alpha2) ?? alpha2;
    return { value: alpha3, label: `${name} (${alpha3})` };
  })
  .sort((a, b) => a.label.localeCompare(b.label));

const CURRENCY_DISPLAY_NAMES = new Intl.DisplayNames(['en'], { type: 'currency' });

export const CURRENCY_CODE_OPTIONS: readonly SelectOption[] = Intl.supportedValuesOf('currency')
  .map((code) => ({ value: code, label: `${code} - ${CURRENCY_DISPLAY_NAMES.of(code)}` }))
  .sort((a, b) => a.label.localeCompare(b.label));

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
