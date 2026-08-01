import { describe, expect, it } from 'vitest';

import {
  CATALOG_REGISTRATION_TYPES,
  CATALOG_TYPE_GROUPS,
  catalogRegistrationType,
} from './catalog-registration.model';

describe('catalog registration configuration', () => {
  it('defines the 22 supported commercial types without duplicates', () => {
    const types = CATALOG_REGISTRATION_TYPES.map((item) => item.value);

    expect(types).toHaveLength(22);
    expect(new Set(types).size).toBe(22);
  });

  it('assigns every type to a visible group and a meaningful form', () => {
    const groups = new Set(CATALOG_TYPE_GROUPS.map((group) => group.code));

    CATALOG_REGISTRATION_TYPES.forEach((item) => {
      expect(groups.has(item.group)).toBe(true);
      expect(item.fields.length).toBeGreaterThanOrEqual(5);
      expect(item.fields.some((field) => field.required)).toBe(true);
      expect(new Set(item.fields.map((field) => field.key)).size).toBe(item.fields.length);
      expect(item.nameLabel.trim()).not.toBe('');
      expect(item.priceLabel.trim()).not.toBe('');
      expect(item.descriptionPlaceholder.trim()).not.toBe('');
    });
  });

  it('uses selectable options only when a list has usable values', () => {
    const selectFields = CATALOG_REGISTRATION_TYPES.flatMap((item) =>
      item.fields.filter((field) => field.type === 'select'),
    );

    expect(selectFields.length).toBeGreaterThan(20);
    selectFields.forEach((field) => expect(field.options?.length).toBeGreaterThan(1));
  });

  it('captures the key data needed for representative sales flows', () => {
    expect(catalogRegistrationType('PRODUCTO').fields.map((field) => field.key)).toEqual(
      expect.arrayContaining(['categoria', 'sku', 'unidadMedida']),
    );
    expect(catalogRegistrationType('VEHICULO').fields.map((field) => field.key)).toEqual(
      expect.arrayContaining(['operacion', 'marca', 'modelo', 'anio', 'kilometraje']),
    );
    expect(catalogRegistrationType('INMUEBLE').fields.map((field) => field.key)).toEqual(
      expect.arrayContaining(['operacion', 'tipoInmueble', 'ubicacion', 'areaM2']),
    );
    expect(catalogRegistrationType('FINANCIERO').fields.map((field) => field.key)).toEqual(
      expect.arrayContaining(['productoFinanciero', 'moneda', 'montoMinimo', 'montoMaximo', 'tasaReferencial']),
    );
  });
});
