export type CrmClientCompletionAction = 'PAYMENT' | 'WON' | 'EDIT';

export interface CrmClientCompletionDraft {
  tipoPersona: 'NATURAL' | 'JURIDICA' | string;
  tipoDocumento: string;
  numeroDocumento: string;
  nombre: string;
  razonSocial: string;
  nombreComercial: string;
  telefono: string;
  correo: string;
  direccion: string;
}
