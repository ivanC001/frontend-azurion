import { describe, expect, it } from 'vitest';

import type { Cotizacion } from '@core/api/cotizacion-api.types';
import type { CrmOportunidad } from '@features/crm/data/crm-api.types';
import type { OpportunityNegotiationRecord, OpportunityPaymentRecord } from '../../models';
import {
  buildOpportunityFinancialSummary,
  buildOpportunityFlowViewState,
  buildOpportunityPaymentPlan,
  buildSaleClosureChecklist,
  canCloseWon,
  resolveNegotiationQuoteDecision,
} from './opportunity-detail.viewmodel';

const NOW = new Date('2026-08-02T12:00:00-05:00');

function opportunity(overrides: Partial<CrmOportunidad> = {}): CrmOportunidad {
  return {
    id: 7,
    titulo: 'Curso Spring',
    montoEstimado: 900,
    probabilidad: 60,
    etapa: 'NEGOCIACION',
    responsableId: 'seller-1',
    estado: 'ABIERTA',
    fechaCierreEstimada: '2026-08-20',
    ...overrides,
  };
}

function agreement(
  overrides: Partial<OpportunityNegotiationRecord> = {},
): OpportunityNegotiationRecord {
  return {
    id: 1,
    oportunidadId: 7,
    precioFinal: 900,
    descuento: 0,
    promocion: '',
    formaPago: 'Contado',
    cuotas: 1,
    fechaInicio: '2026-08-02',
    fechaEntrega: '',
    objecion: '',
    resultado: 'ACEPTA',
    clienteConforme: true,
    procedePago: true,
    observacion: '',
    createdAt: '2026-08-02T10:00:00-05:00',
    ...overrides,
  };
}

function payment(overrides: Partial<OpportunityPaymentRecord> = {}): OpportunityPaymentRecord {
  return {
    id: 'payment-1',
    oportunidadId: 7,
    fecha: '2026-08-02',
    tipo: 'VOUCHER',
    monto: 900,
    estado: 'PAGADO',
    metodo: 'TRANSFERENCIA',
    observacion: '',
    archivoNombre: 'voucher.pdf',
    archivoDataUrl: 'data:application/pdf;base64,AA==',
    createdAt: '2026-08-02T11:00:00-05:00',
    ...overrides,
  };
}

function quote(overrides: Partial<Cotizacion> = {}): Cotizacion {
  return {
    id: 3,
    usuarioId: 'seller-1',
    usuarioNombre: 'Vendedor',
    sucursalId: 1,
    sucursalCodigo: 'PRINCIPAL',
    sucursalNombre: 'Principal',
    fechaEmision: '2026-08-02',
    moneda: 'PEN',
    monedaBase: 'PEN',
    tipoCambioAplicado: 1,
    fechaTipoCambio: '2026-08-02',
    subtotal: 900,
    total: 900,
    subtotalMonedaBase: 900,
    totalMonedaBase: 900,
    estado: 'ACEPTADA',
    crmOportunidadId: 7,
    detalles: [],
    ...overrides,
  };
}

describe('opportunity detail view model', () => {
  it('uses the final negotiated amount and clamps overpayments', () => {
    const summary = buildOpportunityFinancialSummary(
      opportunity(),
      agreement({ precioFinal: 800 }),
      [payment({ monto: 900 })],
      NOW,
    );

    expect(summary).toEqual({ total: 800, paid: 800, pending: 0, percent: 100, status: 'PAGADO' });
  });

  it('recognizes accented credit modes and requires the remaining installments', () => {
    const records = [
      payment({ monto: 300, tipo: 'CUOTA' }),
      payment({
        id: 'payment-2',
        monto: 300,
        tipo: 'CUOTA',
        estado: 'PENDIENTE',
        archivoNombre: '',
        archivoDataUrl: '',
        fecha: '2026-09-02',
      }),
      payment({
        id: 'payment-3',
        monto: 300,
        tipo: 'CUOTA',
        estado: 'PENDIENTE',
        archivoNombre: '',
        archivoDataUrl: '',
        fecha: '2026-10-02',
      }),
    ];
    const plan = buildOpportunityPaymentPlan(
      opportunity(),
      agreement({ formaPago: 'Crédito', cuotas: 3 }),
      records,
      NOW,
    );

    expect(plan).toMatchObject({
      isCredit: true,
      cuotas: 3,
      firstPaymentDone: true,
      hasPaymentProof: true,
      remainingProgrammed: true,
      pendingAmount: 600,
    });
  });

  it('enables winning and final closure only when the commercial evidence is complete', () => {
    const snapshot = {
      opportunity: opportunity(),
      negotiations: [agreement()],
      payments: [payment()],
      quotes: [quote()],
      documents: [],
      now: NOW,
    };

    expect(canCloseWon(snapshot)).toBe(true);
    expect(buildSaleClosureChecklist(snapshot).every((item) => item.done)).toBe(true);
  });

  it('uses the latest quote negotiation to explain the commercial decision', () => {
    const records = [
      agreement({
        id: 2,
        cotizacionId: 3,
        resultado: 'PENDIENTE',
        clienteConforme: false,
        createdAt: '2026-08-02T11:00:00-05:00',
      }),
    ];

    expect(resolveNegotiationQuoteDecision(quote({ estado: 'ENVIADA' }), records)).toEqual({
      label: 'Ajuste solicitado',
      tone: 'adjustment',
    });
  });

  it('builds one coherent memoizable state for the opportunity detail', () => {
    const state = buildOpportunityFlowViewState(
      {
        opportunity: opportunity(),
        negotiations: [agreement()],
        payments: [payment()],
        quotes: [quote()],
        documents: [],
        now: NOW,
      },
      false,
    );

    expect(state).toMatchObject({
      financialStatusLabel: 'Pagado',
      financialStatusTone: 'paid',
      hasFinalAgreement: true,
      canCloseWon: true,
      canCloseSale: true,
      isSaleClosed: false,
    });
  });
});
