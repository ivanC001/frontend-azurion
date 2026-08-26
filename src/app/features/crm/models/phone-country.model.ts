import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js/min';

export interface PhoneCountryOption {
  readonly code: CountryCode;
  readonly name: string;
  readonly dialCode: string;
  readonly flag: string;
  readonly label: string;
  readonly searchText: string;
}

const regionNames = new Intl.DisplayNames(['es'], { type: 'region' });
const countryNameCollator = new Intl.Collator('es', { sensitivity: 'base' });

function countryFlag(countryCode: CountryCode): string {
  return String.fromCodePoint(
    ...[...countryCode].map((character) => 127397 + character.charCodeAt(0)),
  );
}

function countryName(countryCode: CountryCode): string {
  return regionNames.of(countryCode) || countryCode;
}

export const PHONE_COUNTRIES: readonly PhoneCountryOption[] = getCountries()
  .map((code) => {
    const name = countryName(code);
    const dialCode = getCountryCallingCode(code);
    const flag = countryFlag(code);
    return {
      code,
      name,
      dialCode,
      flag,
      label: `${flag} ${name} (+${dialCode})`,
      searchText: `${name} ${code} +${dialCode} ${dialCode}`,
    };
  })
  .sort((left, right) => {
    if (left.code === 'PE') {
      return -1;
    }
    if (right.code === 'PE') {
      return 1;
    }
    return countryNameCollator.compare(left.name, right.name);
  });

const PHONE_COUNTRY_BY_CODE = new Map(PHONE_COUNTRIES.map((country) => [country.code, country]));

const PRIMARY_COUNTRY_BY_SHARED_DIAL_CODE: Readonly<Record<string, CountryCode>> = {
  '1': 'US',
  '7': 'RU',
  '44': 'GB',
  '47': 'NO',
  '61': 'AU',
  '358': 'FI',
  '590': 'GP',
  '599': 'CW',
};

export function phoneCountryByCode(
  countryCode: string | null | undefined,
): PhoneCountryOption | null {
  const normalized = String(countryCode || '')
    .trim()
    .toUpperCase() as CountryCode;
  return PHONE_COUNTRY_BY_CODE.get(normalized) ?? null;
}

export function phoneCountryForDialCode(
  dialCode: string | null | undefined,
  preferredCountryCode?: string | null,
): PhoneCountryOption | null {
  const normalizedDialCode = String(dialCode || '')
    .replace(/\D/g, '')
    .replace(/^0+/, '');
  if (!normalizedDialCode) {
    return null;
  }

  const preferred = phoneCountryByCode(preferredCountryCode);
  if (preferred?.dialCode === normalizedDialCode) {
    return preferred;
  }

  const primaryCountryCode = PRIMARY_COUNTRY_BY_SHARED_DIAL_CODE[normalizedDialCode];
  const primary = phoneCountryByCode(primaryCountryCode);
  if (primary?.dialCode === normalizedDialCode) {
    return primary;
  }

  return PHONE_COUNTRIES.find((country) => country.dialCode === normalizedDialCode) ?? null;
}

export function phoneCountryForNumber(
  value: string | null | undefined,
  preferredCountryCode?: string | null,
): PhoneCountryOption | null {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  if (!digits) {
    return phoneCountryByCode(preferredCountryCode);
  }

  const parsed = parsePhoneNumberFromString(`+${digits}`);
  const parsedCountry = phoneCountryByCode(parsed?.country);
  if (parsedCountry) {
    return parsedCountry;
  }

  return phoneCountryForDialCode(parsed?.countryCallingCode, preferredCountryCode);
}
