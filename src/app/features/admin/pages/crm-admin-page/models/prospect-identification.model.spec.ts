import { describe, expect, it } from 'vitest';

import { PROSPECT_COUNTRIES, prospectCountry, prospectDocuments } from './prospect-identification.model';

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
});
