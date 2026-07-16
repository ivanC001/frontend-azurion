import { ActivityType, OpportunityStage, OpportunityStatus, PaymentStatus, ProspectStatus } from '../models';

export const CRM_STAGE_LABELS: Record<OpportunityStage, string> = {
  [OpportunityStage.Interesado]: 'Interesado',
  [OpportunityStage.Cotizado]: 'Cotizado',
  [OpportunityStage.Negociacion]: 'Negociacion',
  [OpportunityStage.Ganado]: 'Ganado',
  [OpportunityStage.Perdido]: 'Perdido',
};

export const CRM_STAGE_COLORS: Record<OpportunityStage, string> = {
  [OpportunityStage.Interesado]: '#2563eb',
  [OpportunityStage.Cotizado]: '#64748b',
  [OpportunityStage.Negociacion]: '#7c3aed',
  [OpportunityStage.Ganado]: '#059669',
  [OpportunityStage.Perdido]: '#dc2626',
};

export const CRM_DEFAULT_PROSPECT_STATUS = ProspectStatus.Nuevo;
export const CRM_DEFAULT_OPPORTUNITY_STATUS = OpportunityStatus.Abierta;
export const CRM_DEFAULT_PAYMENT_STATUS = PaymentStatus.Pendiente;
export const CRM_DEFAULT_ACTIVITY_TYPE = ActivityType.Llamada;
