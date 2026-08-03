import { describe, expect, it } from 'vitest';

import type { PipelineStageOption } from '../../models';
import { buildOpportunityStageSteps } from './crm-stage-bar.viewmodel';

const STAGES = ['INTERESADO', 'COTIZADO', 'NEGOCIACION', 'GANADO', 'PERDIDO'].map(
  (value, index): PipelineStageOption => ({
    label: value,
    value,
    id: index,
    color: '#2563eb',
    descripcion: '',
    probabilidadDefault: 0,
    icono: '',
    requiereValidacion: false,
    modoValidacion: 'FREE',
  }),
);

describe('CRM stage bar view model', () => {
  it('marks previous stages as done and the active stage as current', () => {
    expect(
      buildOpportunityStageSteps(STAGES, 'NEGOCIACION', 'ABIERTA').map((step) => step.state),
    ).toEqual(['done', 'done', 'current', 'pending', 'pending']);
  });

  it('does not mark Perdido after a won opportunity', () => {
    const steps = buildOpportunityStageSteps(STAGES, 'GANADO', 'GANADA');

    expect(steps[3].state).toBe('done');
    expect(steps[4].state).toBe('pending');
  });

  it('marks only the lost terminal branch when the opportunity is lost', () => {
    const steps = buildOpportunityStageSteps(STAGES, 'PERDIDO', 'PERDIDA');

    expect(steps[3].state).toBe('pending');
    expect(steps[4]).toMatchObject({ state: 'done', lost: true });
  });
});
