import { PROSPECT_COUNTRIES, prospectCountry } from '@features/crm/models/prospect-identification.model';

export interface CustomerDocumentOption {
  readonly label: string;
  readonly value: string;
  readonly placeholder: string;
  readonly inputMode: 'numeric' | 'text';
  readonly maxLength: number;
  readonly pattern: RegExp;
  readonly validationMessage: string;
}

// Perú conserva los códigos SUNAT porque boletas y facturas electrónicas dependen de ellos.
const PERU_DOCUMENTS: readonly CustomerDocumentOption[] = [
  {
    label: 'RUC',
    value: '6',
    placeholder: 'RUC 11 digitos',
    inputMode: 'numeric',
    maxLength: 11,
    pattern: /^\d{11}$/,
    validationMessage: 'Para RUC, el numero de documento debe tener 11 digitos.',
  },
  {
    label: 'DNI',
    value: '1',
    placeholder: 'DNI 8 digitos',
    inputMode: 'numeric',
    maxLength: 8,
    pattern: /^\d{8}$/,
    validationMessage: 'Para DNI, el numero de documento debe tener 8 digitos.',
  },
];

export function isPeruCountry(countryCode: string | null | undefined): boolean {
  const normalized = String(countryCode || '')
    .trim()
    .toUpperCase();
  return !normalized || normalized === 'PE';
}

/** Documentos de cliente disponibles según el país de la empresa. */
export function customerDocumentOptions(
  countryCode: string | null | undefined,
): readonly CustomerDocumentOption[] {
  if (isPeruCountry(countryCode)) {
    return PERU_DOCUMENTS;
  }
  const country = prospectCountry(countryCode);
  const seen = new Set<string>();
  return [...country.companyDocuments, ...country.naturalDocuments]
    .filter((doc) => !seen.has(doc.value) && !!seen.add(doc.value))
    .map((doc) => ({
      label: doc.label,
      value: doc.value,
      placeholder: doc.placeholder,
      inputMode: doc.inputMode,
      maxLength: 30,
      pattern: doc.pattern,
      validationMessage: doc.validationMessage,
    }));
}

/** Etiqueta legible de un tipo de documento guardado (código SUNAT o código por país). */
export function customerDocumentLabel(value: string | null | undefined): string {
  const normalized = String(value || '')
    .trim()
    .toUpperCase();
  if (!normalized || normalized === '0' || normalized === '-') {
    return 'Sin doc';
  }
  const peru = PERU_DOCUMENTS.find((doc) => doc.value === normalized);
  if (peru) {
    return peru.label;
  }
  for (const country of PROSPECT_COUNTRIES) {
    const doc = [...country.naturalDocuments, ...country.companyDocuments].find(
      (item) => item.value === normalized,
    );
    if (doc) {
      return doc.label;
    }
  }
  return normalized;
}
