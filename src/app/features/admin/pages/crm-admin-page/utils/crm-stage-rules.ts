import { OpportunityStage } from '../models';

export interface StageTransitionRule {
  readonly from: OpportunityStage;
  readonly to: OpportunityStage[];
  readonly requiresValidation: boolean;
}

export const CRM_STAGE_TRANSITION_RULES: StageTransitionRule[] = [
  { from: OpportunityStage.Interesado, to: [OpportunityStage.Cotizado, OpportunityStage.Perdido], requiresValidation: true },
  { from: OpportunityStage.Cotizado, to: [OpportunityStage.Negociacion, OpportunityStage.Perdido], requiresValidation: true },
  { from: OpportunityStage.Negociacion, to: [OpportunityStage.Ganado, OpportunityStage.Perdido], requiresValidation: true },
  { from: OpportunityStage.Ganado, to: [], requiresValidation: false },
  { from: OpportunityStage.Perdido, to: [], requiresValidation: false },
];

export function canMoveOpportunityStage(from: OpportunityStage, to: OpportunityStage): boolean {
  return CRM_STAGE_TRANSITION_RULES.some((rule) => rule.from === from && rule.to.includes(to));
}

export function stageRequiresValidation(from: OpportunityStage, to: OpportunityStage): boolean {
  return CRM_STAGE_TRANSITION_RULES.find((rule) => rule.from === from && rule.to.includes(to))?.requiresValidation ?? true;
}
