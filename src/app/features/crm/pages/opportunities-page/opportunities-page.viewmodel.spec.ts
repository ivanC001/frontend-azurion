import { describe, expect, it } from 'vitest';

import type { CrmOportunidad } from '@features/crm/data/crm-api.types';
import type { OpportunityPageRow } from '../../models';
import {
  buildOpportunityListView,
  buildOpportunitySummaryCards,
} from './opportunities-page.viewmodel';

function opportunity(id: number, overrides: Partial<CrmOportunidad> = {}): CrmOportunidad {
  return {
    id,
    titulo: `Oportunidad ${id}`,
    montoEstimado: 100,
    probabilidad: 50,
    etapa: 'INTERESADO',
    responsableId: 'asesor-1',
    estado: 'ABIERTA',
    ...overrides,
  };
}

function row(item: CrmOportunidad): OpportunityPageRow {
  return { opportunity: item } as OpportunityPageRow;
}

describe('opportunities page view model', () => {
  it('applies view, query and business filters before paginating', () => {
    const result = buildOpportunityListView({
      items: [
        opportunity(1, { titulo: 'Curso Angular', etapa: 'COTIZADO' }),
        opportunity(2, { titulo: 'Curso Spring', etapa: 'NEGOCIACION' }),
        opportunity(3, { titulo: 'Curso Angular ganado', etapa: 'GANADO', estado: 'GANADA' }),
      ],
      view: 'NEGOCIACION',
      query: 'curso',
      stage: 'NEGOCIACION',
      responsible: 'asesor-1',
      status: 'ABIERTA',
      page: 0,
      pageSize: 20,
      isActive: (item) => item.estado === 'ABIERTA',
      toRow: row,
    });

    expect(result.visibleItems.map((item) => item.id)).toEqual([1, 2]);
    expect(result.filteredItems.map((item) => item.id)).toEqual([2]);
    expect(result.rows.map((item) => item.opportunity.id)).toEqual([2]);
  });

  it('clamps an obsolete page after the result set shrinks', () => {
    const result = buildOpportunityListView({
      items: [opportunity(1), opportunity(2), opportunity(3)],
      view: 'ABIERTAS',
      query: '',
      stage: null,
      responsible: null,
      status: 'ABIERTA',
      page: 9,
      pageSize: 2,
      isActive: () => true,
      toRow: row,
    });

    expect(result.pageMeta).toMatchObject({
      page: 1,
      totalItems: 3,
      totalPages: 2,
      rangeLabel: '3-3 de 3',
    });
    expect(result.rows.map((item) => item.opportunity.id)).toEqual([3]);
  });

  it('builds pipeline and conversion summaries from the same source snapshot', () => {
    const cards = buildOpportunitySummaryCards({
      items: [
        opportunity(1, { montoEstimado: 250 }),
        opportunity(2, { montoEstimado: 350 }),
        opportunity(3, { estado: 'GANADA', etapa: 'GANADO', fechaCierreReal: '2026-08-02' }),
      ],
      isActive: (item) => item.estado === 'ABIERTA',
      isThisMonth: (date) => date === '2026-08-02',
      formatAmount: (value) => String(value),
      deltaLabel: (value) => `${value}%`,
    });

    expect(cards.map((card) => card.value)).toEqual(['3', 'S/ 600', '2', '1', '33%']);
  });

  it('keeps pipeline totals separated by currency', () => {
    const cards = buildOpportunitySummaryCards({
      items: [
        opportunity(1, { montoEstimado: 400, moneda: 'PEN' }),
        opportunity(2, { montoEstimado: 250, moneda: 'USD' }),
        opportunity(3, { montoEstimado: 100, moneda: 'USD' }),
      ],
      isActive: () => true,
      isThisMonth: () => false,
      formatAmount: (value) => String(value),
      deltaLabel: (value) => `${value}%`,
    });

    expect(cards[1].value).toBe('S/ 400 · US$ 350');
  });
});
