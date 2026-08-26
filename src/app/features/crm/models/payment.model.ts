export type CrmPaymentDocumentType = 'FACTURA' | 'BOLETA' | 'TICKET' | 'VOUCHER' | 'CUOTA' | 'OTRO';
export type CrmPaymentRecordStatus = 'PENDIENTE' | 'PARCIAL' | 'PAGADO' | 'VENCIDO';

export interface CrmPaymentRecord {
  readonly id: string;
  readonly oportunidadId: number;
  readonly fecha: string;
  readonly tipo: CrmPaymentDocumentType;
  readonly monto: number;
  readonly estado: CrmPaymentRecordStatus;
  readonly metodo: string;
  readonly observacion: string;
  readonly archivoNombre: string;
  readonly archivoDataUrl: string;
  readonly createdAt: string;
}

export interface CrmPaymentPlan {
  readonly isCredit: boolean;
  readonly cuotas: number;
  readonly paidPayments: CrmPaymentRecord[];
  readonly pendingInstallments: CrmPaymentRecord[];
  readonly overdueInstallments: CrmPaymentRecord[];
  readonly paidAmount: number;
  readonly pendingAmount: number;
  readonly scheduledAmount: number;
  readonly requiredInitialAmount: number;
  readonly firstPaymentDone: boolean;
  readonly hasPaymentProof: boolean;
  readonly remainingProgrammed: boolean;
  readonly paymentModeLabel: string;
}

export interface CrmPaymentDraft {
  id: string | null;
  cuotaKey: string;
  fecha: string;
  tipo: CrmPaymentDocumentType;
  monto: number;
  estado: CrmPaymentRecordStatus;
  metodo: string;
  observacion: string;
  archivoNombre: string;
  archivoDataUrl: string;
}

export interface CrmPaymentInstallment {
  readonly key: string;
  readonly recordId: string | null;
  readonly number: number;
  readonly dueDate: string;
  readonly amount: number;
  readonly status: CrmPaymentRecordStatus;
  readonly selectable: boolean;
}

export interface CrmPaymentDialogSummary {
  readonly total: number;
  readonly paid: number;
  readonly pending: number;
  readonly paidInstallments: number;
  readonly pendingInstallments: number;
  readonly overdueInstallments: number;
}
