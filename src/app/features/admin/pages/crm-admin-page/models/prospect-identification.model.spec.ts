import { describe, expect, it } from 'vitest';

import {
  PROSPECT_COUNTRIES,
  prospectCountry,
  prospectDocuments,
  prospectLocalPhone,
  normalizeProspectPhoneDialCode,
  prospectPhoneDialCode,
  prospectPhoneDialCodeFromValue,
  prospectPhoneE164,
} from './prospect-identification.model';

describe('prospect identification catalog', () => {
  it('offers personal identifiers for a natural person in Peru', () => {
    const documents = prospectDocuments('PE', 'NATURAL');

    expect(documents.map((document) => document.label)).toEqual([
      'DNI',
      'Carné de extranjería',
      'Pasaporte',
    ]);
    expect(documents[0].pattern.test('12345678')).toBe(true);
    expect(documents[0].pattern.test('1234567')).toBe(false);
  });

  it('offers the fiscal identifier for a company in Peru', () => {
    const documents = prospectDocuments('PE', 'JURIDICA');

    expect(documents.map((document) => document.label)).toEqual(['RUC']);
    expect(documents[0].pattern.test('20123456789')).toBe(true);
    expect(documents[0].pattern.test('2012345678')).toBe(false);
  });

  it('changes fiscal identifiers according to the selected country', () => {
    expect(prospectDocuments('CO', 'JURIDICA').map((document) => document.label)).toEqual(['NIT']);
    expect(prospectDocuments('CL', 'JURIDICA').map((document) => document.label)).toEqual(['RUT']);
    expect(prospectDocuments('MX', 'JURIDICA').map((document) => document.label)).toEqual(['RFC']);
    expect(prospectDocuments('BR', 'JURIDICA').map((document) => document.label)).toEqual(['CNPJ']);
  });

  it('keeps the list empty while the lead is unclassified', () => {
    expect(prospectDocuments('PE', 'SIN_DEFINIR')).toEqual([]);
  });

  it('falls back to Peru for an unknown country code', () => {
    expect(prospectCountry('XX').code).toBe('PE');
    expect(PROSPECT_COUNTRIES.length).toBeGreaterThanOrEqual(20);
  });

  it('builds an E.164 phone using the selected country and avoids duplicate prefixes', () => {
    expect(prospectPhoneDialCode('PE')).toBe('51');
    expect(prospectPhoneE164('974 865 008', 'PE')).toBe('51974865008');
    expect(prospectPhoneE164('+51 974 865 008', 'PE')).toBe('51974865008');
    expect(prospectLocalPhone('525512345678', 'MX')).toBe('5512345678');
  });

  it('allows an editable dialing code independent from the fiscal country', () => {
    expect(normalizeProspectPhoneDialCode('+52', 'ES')).toBe('52');
    expect(prospectPhoneE164('55 1234 5678', 'ES', '+52')).toBe('525512345678');
    expect(prospectLocalPhone('+52 55 1234 5678', 'ES', '52')).toBe('5512345678');
    expect(prospectPhoneDialCodeFromValue('525512345678', 'ES')).toBe('52');
  });

  it('detects calling codes outside the fiscal country catalog', () => {
    expect(prospectPhoneDialCode('JP')).toBe('81');
    expect(prospectPhoneDialCodeFromValue('+81 90 1234 5678', 'PE')).toBe('81');
  });
});
