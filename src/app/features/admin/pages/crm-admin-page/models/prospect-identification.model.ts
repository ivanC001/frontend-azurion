export type ProspectPersonType = 'SIN_DEFINIR' | 'NATURAL' | 'JURIDICA';

export interface ProspectDocumentOption {
  readonly label: string;
  readonly value: string;
  readonly placeholder: string;
  readonly help: string;
  readonly inputMode: 'numeric' | 'text';
  readonly pattern: RegExp;
  readonly validationMessage: string;
}

export interface ProspectCountryOption {
  readonly code: string;
  readonly name: string;
  readonly naturalDocuments: readonly ProspectDocumentOption[];
  readonly companyDocuments: readonly ProspectDocumentOption[];
}

const alphanumericDocument = (
  value: string,
  label: string,
  placeholder = `Ingresa el ${label}`,
): ProspectDocumentOption => ({
  label,
  value,
  placeholder,
  help: `${label}: se permiten letras, números, guiones, puntos y barras.`,
  inputMode: 'text',
  pattern: /^[A-Z0-9][A-Z0-9.\-/]{3,29}$/i,
  validationMessage: `Ingresa un ${label} válido (entre 4 y 30 caracteres).`,
});

const numericDocument = (
  value: string,
  label: string,
  digits: number,
): ProspectDocumentOption => ({
  label,
  value,
  placeholder: `${digits} dígitos`,
  help: `${label}: ${digits} dígitos, sin espacios ni separadores.`,
  inputMode: 'numeric',
  pattern: new RegExp(`^\\d{${digits}}$`),
  validationMessage: `El ${label} debe tener ${digits} dígitos.`,
});

const passport = () => alphanumericDocument('PASSPORT', 'Pasaporte', 'Número de pasaporte');

export const PROSPECT_COUNTRIES: readonly ProspectCountryOption[] = [
  {
    code: 'PE',
    name: 'Perú',
    naturalDocuments: [numericDocument('1', 'DNI', 8), alphanumericDocument('CE', 'Carné de extranjería'), passport()],
    companyDocuments: [numericDocument('6', 'RUC', 11)],
  },
  {
    code: 'AR',
    name: 'Argentina',
    naturalDocuments: [alphanumericDocument('DNI', 'DNI'), passport()],
    companyDocuments: [alphanumericDocument('CUIT', 'CUIT')],
  },
  {
    code: 'BO',
    name: 'Bolivia',
    naturalDocuments: [alphanumericDocument('CI', 'Cédula de identidad'), passport()],
    companyDocuments: [alphanumericDocument('NIT', 'NIT')],
  },
  {
    code: 'BR',
    name: 'Brasil',
    naturalDocuments: [alphanumericDocument('CPF', 'CPF'), alphanumericDocument('RG', 'RG'), passport()],
    companyDocuments: [alphanumericDocument('CNPJ', 'CNPJ')],
  },
  {
    code: 'CA',
    name: 'Canadá',
    naturalDocuments: [alphanumericDocument('NATIONAL_ID', 'Identificación nacional'), passport()],
    companyDocuments: [alphanumericDocument('BN', 'Business Number (BN)')],
  },
  {
    code: 'CL',
    name: 'Chile',
    naturalDocuments: [alphanumericDocument('RUN', 'RUN'), passport()],
    companyDocuments: [alphanumericDocument('RUT', 'RUT')],
  },
  {
    code: 'CO',
    name: 'Colombia',
    naturalDocuments: [alphanumericDocument('CC', 'Cédula de ciudadanía'), alphanumericDocument('CE', 'Cédula de extranjería'), passport()],
    companyDocuments: [alphanumericDocument('NIT', 'NIT')],
  },
  {
    code: 'CR',
    name: 'Costa Rica',
    naturalDocuments: [alphanumericDocument('CEDULA', 'Cédula física'), alphanumericDocument('DIMEX', 'DIMEX'), passport()],
    companyDocuments: [alphanumericDocument('CEDULA_JURIDICA', 'Cédula jurídica')],
  },
  {
    code: 'EC',
    name: 'Ecuador',
    naturalDocuments: [alphanumericDocument('CEDULA', 'Cédula'), passport()],
    companyDocuments: [alphanumericDocument('RUC', 'RUC')],
  },
  {
    code: 'ES',
    name: 'España',
    naturalDocuments: [alphanumericDocument('DNI', 'DNI'), alphanumericDocument('NIE', 'NIE'), passport()],
    companyDocuments: [alphanumericDocument('NIF', 'NIF')],
  },
  {
    code: 'US',
    name: 'Estados Unidos',
    naturalDocuments: [alphanumericDocument('STATE_ID', 'State ID'), passport()],
    companyDocuments: [alphanumericDocument('EIN', 'EIN')],
  },
  {
    code: 'FR',
    name: 'Francia',
    naturalDocuments: [alphanumericDocument('CNI', 'Carte nationale d’identité'), passport()],
    companyDocuments: [alphanumericDocument('SIREN', 'SIREN'), alphanumericDocument('SIRET', 'SIRET'), alphanumericDocument('TVA', 'N.º TVA')],
  },
  {
    code: 'GT',
    name: 'Guatemala',
    naturalDocuments: [alphanumericDocument('DPI', 'DPI'), passport()],
    companyDocuments: [alphanumericDocument('NIT', 'NIT')],
  },
  {
    code: 'MX',
    name: 'México',
    naturalDocuments: [alphanumericDocument('CURP', 'CURP'), passport()],
    companyDocuments: [alphanumericDocument('RFC', 'RFC')],
  },
  {
    code: 'PA',
    name: 'Panamá',
    naturalDocuments: [alphanumericDocument('CEDULA', 'Cédula'), passport()],
    companyDocuments: [alphanumericDocument('RUC', 'RUC')],
  },
  {
    code: 'PY',
    name: 'Paraguay',
    naturalDocuments: [alphanumericDocument('CI', 'Cédula de identidad'), passport()],
    companyDocuments: [alphanumericDocument('RUC', 'RUC')],
  },
  {
    code: 'DO',
    name: 'República Dominicana',
    naturalDocuments: [alphanumericDocument('CEDULA', 'Cédula'), passport()],
    companyDocuments: [alphanumericDocument('RNC', 'RNC')],
  },
  {
    code: 'GB',
    name: 'Reino Unido',
    naturalDocuments: [passport(), alphanumericDocument('DRIVING_LICENCE', 'Driving licence')],
    companyDocuments: [alphanumericDocument('CRN', 'Company Registration Number'), alphanumericDocument('VAT', 'VAT number')],
  },
  {
    code: 'UY',
    name: 'Uruguay',
    naturalDocuments: [alphanumericDocument('CI', 'Cédula de identidad'), passport()],
    companyDocuments: [alphanumericDocument('RUT', 'RUT')],
  },
  {
    code: 'VE',
    name: 'Venezuela',
    naturalDocuments: [alphanumericDocument('CEDULA', 'Cédula de identidad'), passport()],
    companyDocuments: [alphanumericDocument('RIF', 'RIF')],
  },
] as const;

export function prospectCountry(code: string | null | undefined): ProspectCountryOption {
  const normalized = String(code || '').trim().toUpperCase();
  return PROSPECT_COUNTRIES.find((country) => country.code === normalized) ?? PROSPECT_COUNTRIES[0];
}

export function prospectDocuments(
  countryCode: string | null | undefined,
  personType: ProspectPersonType,
): readonly ProspectDocumentOption[] {
  const country = prospectCountry(countryCode);
  if (personType === 'JURIDICA') {
    return country.companyDocuments;
  }
  if (personType === 'NATURAL') {
    return country.naturalDocuments;
  }
  return [];
}
