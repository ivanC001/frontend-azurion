import { describe, expect, it } from 'vitest';

import {
  PHONE_COUNTRIES,
  phoneCountryByCode,
  phoneCountryForDialCode,
  phoneCountryForNumber,
} from './phone-country.model';

describe('phone country catalog', () => {
  it('loads the international catalog with flags and calling codes', () => {
    expect(PHONE_COUNTRIES.length).toBeGreaterThan(200);
    expect(phoneCountryByCode('PE')).toMatchObject({
      code: 'PE',
      dialCode: '51',
      flag: '🇵🇪',
    });
    expect(phoneCountryByCode('JP')).toMatchObject({
      code: 'JP',
      dialCode: '81',
      flag: '🇯🇵',
    });
  });

  it('keeps the selected country when multiple countries share a calling code', () => {
    expect(phoneCountryForDialCode('+1', 'CA')?.code).toBe('CA');
    expect(phoneCountryForDialCode('+1', 'DO')?.code).toBe('DO');
    expect(phoneCountryForDialCode('+1')?.code).toBe('US');
  });

  it('returns no flag for a custom or incomplete calling code', () => {
    expect(phoneCountryForDialCode('9999')).toBeNull();
    expect(phoneCountryForDialCode('')).toBeNull();
  });

  it('uses the full number to distinguish countries sharing the +1 code', () => {
    expect(phoneCountryForNumber('+1 416 555 0123')?.code).toBe('CA');
    expect(phoneCountryForNumber('+1 809 555 0123')?.code).toBe('DO');
  });
});
