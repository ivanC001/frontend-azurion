import { TestBed } from '@angular/core/testing';

import type { Cotizacion } from '@core/api/cotizacion-api.types';

import { CrmQuotationStore } from './crm-quotation.store';

describe('CrmQuotationStore', () => {
  let store: CrmQuotationStore;

  const quote = (id: number, extra: Partial<Cotizacion> = {}) =>
    ({
      id,
      estado: 'BORRADOR',
      total: 100,
      fechaEmision: '2026-01-01',
      detalles: [],
      ...extra,
    }) as Cotizacion;

  const noContext = () => '';

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [CrmQuotationStore] });
    store = TestBed.inject(CrmQuotationStore);
  });

  it('coloca las cotizaciones nuevas al principio y reemplaza las existentes', () => {
    store.setQuotes([quote(1), quote(2)]);

    store.upsert(quote(3));
    expect(store.quotes().map((item) => item.id)).toEqual([3, 1, 2]);

    store.upsert(quote(1, { estado: 'ENVIADA' }));
    expect(store.quotes().length).toBe(3);
    expect(store.quotes().find((item) => item.id === 1)?.estado).toBe('ENVIADA');
  });

  it('ordena por fecha y desempata por id descendente', () => {
    store.setQuotes([
      quote(1, { fechaEmision: '2026-01-01' }),
      quote(5, { fechaEmision: '2026-03-01' }),
      quote(9, { fechaEmision: '2026-01-01' }),
    ]);

    expect(store.search('', noContext).map((item) => item.id)).toEqual([5, 9, 1]);
  });

  it('devuelve solo las cotizaciones de una oportunidad', () => {
    store.setQuotes([
      quote(1, { crmOportunidadId: 10 }),
      quote(2, { crmOportunidadId: 20 }),
      quote(3, { crmOportunidadId: 10, fechaEmision: '2026-06-01' }),
    ]);

    expect(store.forOpportunity(10).map((item) => item.id)).toEqual([3, 1]);
    expect(store.forOpportunity(null)).toEqual([]);
  });

  it('la cotizacion vigente es la ultima emitida', () => {
    store.setQuotes([
      quote(1, { crmOportunidadId: 10, fechaEmision: '2026-01-01' }),
      quote(2, { crmOportunidadId: 10, fechaEmision: '2026-05-01' }),
    ]);

    expect(store.currentForOpportunity(10)?.id).toBe(2);
    expect(store.currentForOpportunity(99)).toBeNull();
  });

  it('busca por campos propios y por el contexto de la oportunidad', () => {
    store.setQuotes([
      quote(1, { clienteNombre: 'Ferreteria Sur' }),
      quote(2, { observacion: 'Incluye instalacion' }),
      quote(3, {}),
    ]);

    expect(store.search('ferreteria', noContext).map((item) => item.id)).toEqual([1]);
    expect(store.search('instalacion', noContext).map((item) => item.id)).toEqual([2]);

    // El titulo de la oportunidad lo aporta quien llama.
    const describe = (item: Cotizacion) => (item.id === 3 ? 'Proyecto Norte' : '');
    expect(store.search('norte', describe).map((item) => item.id)).toEqual([3]);
  });

  it('reparte los estados y calcula su porcentaje', () => {
    const items = [
      quote(1, { estado: 'BORRADOR' }),
      quote(2, { estado: 'ACEPTADA' }),
      quote(3, { estado: 'RECHAZADA' }),
      quote(4, { estado: 'ACEPTADA' }),
    ];

    const summary = store.statusSummary(items);

    expect(summary.map((item) => item.value)).toEqual([1, 2, 1]);
    expect(summary.map((item) => item.percent)).toEqual([25, 50, 25]);
  });

  it('no divide por cero cuando no hay cotizaciones', () => {
    const summary = store.statusSummary([]);

    expect(summary.every((item) => item.value === 0 && item.percent === 0)).toBe(true);
    expect(store.statusRingBackground(summary)).toBe('conic-gradient(#e5e7eb 0 100%)');
  });

  it('construye el anillo solo con los estados presentes', () => {
    const ring = store.statusRingBackground([
      { value: 1, color: '#aaa' },
      { value: 0, color: '#bbb' },
      { value: 3, color: '#ccc' },
    ]);

    expect(ring).toContain('#aaa 0% 25%');
    expect(ring).toContain('#ccc 25% 100%');
    expect(ring).not.toContain('#bbb');
  });

  it('suma importes tratando los ausentes como cero', () => {
    expect(store.totalAmount([quote(1, { total: 150 }), quote(2, { total: undefined })])).toBe(150);
  });

  it('marca y desmarca envios sin afectar a otras filas', () => {
    store.setWhatsappSending(1, true);
    store.setWhatsappSending(2, true);

    expect(store.isWhatsappSending(1)).toBe(true);
    expect(store.isWhatsappSending(2)).toBe(true);

    store.setWhatsappSending(1, false);

    expect(store.isWhatsappSending(1)).toBe(false);
    expect(store.isWhatsappSending(2)).toBe(true);
  });

  it('cada canal lleva su propio registro de envios', () => {
    store.setPdfDownloading(7, true);

    expect(store.isPdfDownloading(7)).toBe(true);
    expect(store.isEmailSending(7)).toBe(false);
    expect(store.isWhatsappSending(7)).toBe(false);
  });
});
