export type CrmClientCompletionAction =
  | 'PAYMENT'
  | 'WON'
  | 'EDIT'
  | 'QUOTE_CREATE'
  | 'QUOTE_PDF'
  | 'QUOTE_EMAIL'
  | 'QUOTE_WHATSAPP';

export interface CrmClientCompletionDraft {
  tipoPersona: 'SIN_DEFINIR' | 'NATURAL' | 'JURIDICA' | string;
  tipoDocumento: string;
  numeroDocumento: string;
  nombre: string;
  razonSocial: string;
  nombreComercial: string;
  telefono: string;
  correo: string;
  direccion: string;
}
