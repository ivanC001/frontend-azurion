import type { PipelineStageOption } from '../../models';

export type OpportunityStageState = 'done' | 'current' | 'pending';

export interface OpportunityStageStep {
  readonly label: string;
  readonly value: string;
  readonly color: string;
  readonly state: OpportunityStageState;
  readonly lost: boolean;
}

export function buildOpportunityStageSteps(
  stages: readonly PipelineStageOption[],
  currentStage: string,
  opportunityStatus: string,
): OpportunityStageStep[] {
  const currentIndex = stages.findIndex((stage) => stage.value === currentStage);

  return stages.map((stage, stageIndex) => {
    const terminalAlternative =
      (currentStage === 'GANADO' && stage.value === 'PERDIDO') ||
      (currentStage === 'PERDIDO' && stage.value === 'GANADO');
    let state: OpportunityStageState = 'pending';

    if (!terminalAlternative && currentIndex >= 0) {
      if (stageIndex < currentIndex) {
        state = 'done';
      } else if (stageIndex === currentIndex) {
        state = ['GANADA', 'PERDIDA'].includes(opportunityStatus) ? 'done' : 'current';
      }
    }

    return {
      label: stage.label,
      value: stage.value,
      color: stage.color || '#2563eb',
      state,
      lost: stage.value === 'PERDIDO' && state === 'done',
    };
  });
}
