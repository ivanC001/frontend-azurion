import { describe, expect, it } from 'vitest';

import type { PipelineColumn, PipelineDealRow } from '../../models';
import { buildVisiblePipelineColumns } from './pipeline-page.viewmodel';

const BASE_ROW: PipelineDealRow = {
  opportunity: { id: 1 } as PipelineDealRow['opportunity'],
  title: 'Oportunidad',
  amount: 100,
  company: 'Cliente',
  campaign: '',
  origin: 'Manual',
  temperatureLabel: 'Medio',
  temperatureTone: 'warm',
  closingDate: '2026-08-20',
  probability: 50,
  ownerName: 'Asesor',
  ownerInitials: 'AS',
  nextAction: 'Llamar',
  nextActionDue: 'Manana',
  nextActionTone: 'normal',
  priorityLabel: null,
  priorityTone: null,
  riskBadges: [],
  won: false,
  lost: false,
};

function column(items: readonly PipelineDealRow[]): PipelineColumn {
  return {
    label: 'Interesado',
    value: 'INTERESADO',
    total: 0,
    color: '#2563eb',
    icon: 'pi pi-users',
    averageProbability: 0,
    items,
  };
}

describe('pipeline page view model', () => {
  it('filters risk rows and calculates their metrics once', () => {
    const safe = { ...BASE_ROW, opportunity: { id: 1 } as PipelineDealRow['opportunity'] };
    const risk = {
      ...BASE_ROW,
      opportunity: { id: 2 } as PipelineDealRow['opportunity'],
      amount: 350,
      probability: 80,
      riskBadges: ['Cierre vencido'],
    };

    const [result] = buildVisiblePipelineColumns([column([safe, risk])], 'RISK', 'CLOSE_DATE');

    expect(result.visibleItems.map((row) => row.opportunity.id)).toEqual([2]);
    expect(result.visibleTotal).toBe(350);
    expect(result.visibleAverageProbability).toBe(80);
  });

  it('sorts without mutating the source column', () => {
    const first = {
      ...BASE_ROW,
      opportunity: { id: 1 } as PipelineDealRow['opportunity'],
      amount: 100,
    };
    const second = {
      ...BASE_ROW,
      opportunity: { id: 2 } as PipelineDealRow['opportunity'],
      amount: 500,
    };
    const source = column([first, second]);

    const [result] = buildVisiblePipelineColumns([source], 'ALL', 'AMOUNT');

    expect(result.visibleItems.map((row) => row.opportunity.id)).toEqual([2, 1]);
    expect(source.items.map((row) => row.opportunity.id)).toEqual([1, 2]);
  });

  it('places opportunities without a closing date at the end', () => {
    const undated = {
      ...BASE_ROW,
      opportunity: { id: 1 } as PipelineDealRow['opportunity'],
      closingDate: null,
    };
    const dated = {
      ...BASE_ROW,
      opportunity: { id: 2 } as PipelineDealRow['opportunity'],
      closingDate: '2026-08-10',
    };

    const [result] = buildVisiblePipelineColumns([column([undated, dated])], 'ALL', 'CLOSE_DATE');

    expect(result.visibleItems.map((row) => row.opportunity.id)).toEqual([2, 1]);
  });
});
