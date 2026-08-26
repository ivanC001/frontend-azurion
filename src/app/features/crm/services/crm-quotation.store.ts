import { Injectable, signal } from '@angular/core';

import type { Cotizacion, PromocionCotizacion } from '@core/api/cotizacion-api.types';

import { quoteStatusValue as resolveQuoteStatusValue } from '../modals/opportunity-detail-modal/opportunity-detail.viewmodel';

/** Estados en los que la cotizacion aun espera respuesta del cliente. */
const PENDING_STATUSES = ['BORRADOR', 'ENVIADA', 'EN_SEGUIMIENTO'];

/**
 * Cotizaciones del CRM: datos, envios en curso y metricas del panel.
 *
 * Extraido de CrmPage. Las acciones que cruzan dominios -- generar la
 * cotizacion desde una oportunidad, o aceptarla y convertirla en venta --
 * siguen en el contenedor: aqui solo vive lo que es de la cotizacion.
 */
@Injectable()
export class CrmQuotationStore {
  readonly quotes = signal<Cotizacion[]>([]);

  readonly promotions = signal<PromocionCotizacion[]>([]);

  /**
   * Envios en curso, por canal. Se guardan como conjuntos de id para poder
   * bloquear la fila concreta sin bloquear la tabla entera.
   */
  readonly pdfDownloading = signal<ReadonlySet<number>>(new Set<number>());

  readonly whatsappSending = signal<ReadonlySet<number>>(new Set<number>());

  readonly emailSending = signal<ReadonlySet<number>>(new Set<number>());

  setQuotes(quotes: Cotizacion[]): void {
    this.quotes.set(quotes);
  }

  setPromotions(promotions: PromocionCotizacion[]): void {
    this.promotions.set(promotions);
  }

  /** Inserta o reemplaza; las nuevas van al principio. */
  upsert(quote: Cotizacion): void {
    this.quotes.update((items) =>
      items.some((current) => current.id === quote.id)
        ? items.map((current) => (current.id === quote.id ? quote : current))
        : [quote, ...items],
    );
  }

  /** Cotizaciones de una oportunidad, de la mas reciente a la mas antigua. */
  forOpportunity(opportunityId: number | null | undefined): Cotizacion[] {
    if (opportunityId == null) {
      return [];
    }
    return this.sortByRecency(
      this.quotes().filter((item) => Number(item.crmOportunidadId) === Number(opportunityId)),
    );
  }

  /** La vigente de una oportunidad es simplemente la ultima emitida. */
  currentForOpportunity(opportunityId: number | null | undefined): Cotizacion | null {
    return this.forOpportunity(opportunityId)[0] ?? null;
  }

  /**
   * Busqueda del panel. El texto de la oportunidad asociada lo aporta quien
   * llama (`describe`), porque esa relacion pertenece al dominio de
   * oportunidades y no a la cotizacion.
   */
  search(query: string, describe: (quote: Cotizacion) => string): Cotizacion[] {
    const needle = query.trim().toLowerCase();
    const matching =
      needle === ''
        ? this.quotes()
        : this.quotes().filter((item) =>
            [
              item.id,
              item.estado,
              item.clienteNombre,
              item.clienteDocumento,
              item.observacion,
              item.canalEnvio,
              describe(item),
              ...(item.detalles || []).map((detalle) => detalle.descripcion),
            ]
              .filter((value) => value !== null && value !== undefined)
              .join(' ')
              .toLowerCase()
              .includes(needle),
          );

    return this.sortByRecency(matching);
  }

  /** Reparto por estado, con su porcentaje sobre el total mostrado. */
  statusSummary(
    items: Cotizacion[],
  ): { label: string; value: number; color: string; tone: string; percent: number }[] {
    // Se evita dividir por cero sin alterar los conteos.
    const total = Math.max(items.length, 1);
    const summary = [
      {
        label: 'Pendientes',
        value: items.filter((item) => PENDING_STATUSES.includes(resolveQuoteStatusValue(item)))
          .length,
        color: '#3b82f6',
        tone: 'pending',
      },
      {
        label: 'Aceptadas',
        value: items.filter((item) => resolveQuoteStatusValue(item) === 'ACEPTADA').length,
        color: '#10b981',
        tone: 'accepted',
      },
      {
        label: 'Rechazadas',
        value: items.filter((item) => resolveQuoteStatusValue(item) === 'RECHAZADA').length,
        color: '#ef4444',
        tone: 'rejected',
      },
    ];

    return summary.map((item) => ({ ...item, percent: Math.round((item.value / total) * 100) }));
  }

  /** Gradiente del anillo de estados; gris cuando no hay nada que repartir. */
  statusRingBackground(summary: { value: number; color: string }[]): string {
    const total = summary.reduce((sum, item) => sum + item.value, 0);
    if (!total) {
      return 'conic-gradient(#e5e7eb 0 100%)';
    }

    let cursor = 0;
    const stops = summary
      .filter((item) => item.value > 0)
      .map((item) => {
        const start = cursor;
        cursor += (item.value / total) * 100;
        return `${item.color} ${start}% ${cursor}%`;
      })
      .join(', ');

    return `conic-gradient(${stops})`;
  }

  countPending(items: Cotizacion[]): number {
    return items.filter((item) => PENDING_STATUSES.includes(resolveQuoteStatusValue(item))).length;
  }

  countAccepted(items: Cotizacion[]): number {
    return items.filter((item) => resolveQuoteStatusValue(item) === 'ACEPTADA').length;
  }

  totalAmount(items: Cotizacion[]): number {
    return items.reduce((sum, item) => sum + Number(item.total || 0), 0);
  }

  isPdfDownloading(id: number): boolean {
    return this.pdfDownloading().has(id);
  }

  setPdfDownloading(id: number, active: boolean): void {
    this.toggleInFlight(this.pdfDownloading, id, active);
  }

  isWhatsappSending(id: number): boolean {
    return this.whatsappSending().has(id);
  }

  setWhatsappSending(id: number, active: boolean): void {
    this.toggleInFlight(this.whatsappSending, id, active);
  }

  isEmailSending(id: number): boolean {
    return this.emailSending().has(id);
  }

  setEmailSending(id: number, active: boolean): void {
    this.toggleInFlight(this.emailSending, id, active);
  }

  /** La mas reciente primero; el id desempata cuando comparten fecha. */
  private sortByRecency(items: Cotizacion[]): Cotizacion[] {
    return [...items].sort(
      (left, right) =>
        Date.parse(right.fechaEmision || '') - Date.parse(left.fechaEmision || '') ||
        Number(right.id) - Number(left.id),
    );
  }

  private toggleInFlight(
    target: { update: (fn: (current: ReadonlySet<number>) => ReadonlySet<number>) => void },
    id: number,
    active: boolean,
  ): void {
    target.update((current) => {
      const next = new Set(current);
      if (active) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }
}
