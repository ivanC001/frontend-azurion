import type { CrmOportunidad } from '@features/crm/data/crm-api.types';
<<<<<<< HEAD
import { currencySymbol } from '@shared/utils/currency-symbol';
=======
>>>>>>> b50118bff6d4d47a3981a187eab708420ee804bc
import type {
  OpportunityListView,
  OpportunityPageRow,
  OpportunitySummaryCard,
  OpportunityView,
} from '../../models';

export interface OpportunityListViewInput {
  readonly items: readonly CrmOportunidad[];
  readonly view: OpportunityView;
  readonly query: string;
  readonly stage: string | null;
  readonly responsible: string | null;
  readonly status: string | null;
  readonly page: number;
  readonly pageSize: number;
  readonly isActive: (item: CrmOportunidad) => boolean;
  readonly toRow: (item: CrmOportunidad) => OpportunityPageRow;
}

export interface OpportunitySummaryInput {
  readonly items: readonly CrmOportunidad[];
  readonly isActive: (item: CrmOportunidad) => boolean;
  readonly isThisMonth: (date: string | null | undefined) => boolean;
  readonly formatAmount: (value: number) => string;
  readonly deltaLabel: (current: number, previous: number, decimal?: boolean) => string;
}

export function buildOpportunityListView(input: OpportunityListViewInput): OpportunityListView {
  const query = input.query.trim().toLowerCase();
  const visibleItems = input.items
    .filter((item) => matchesView(item, input.view, input.isActive))
    .filter((item) => matchesQuery(item, query));
  const filteredItems = visibleItems
    .filter((item) => !input.stage || item.etapa === input.stage)
    .filter((item) => !input.responsible || item.responsableId === input.responsible)
    .filter((item) => !input.status || matchesStatus(item, input.status, input.isActive));

  const pageSize = Math.max(1, input.pageSize);
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const page = Math.min(Math.max(input.page, 0), totalPages - 1);
  const startIndex = page * pageSize;
  const pageItems = filteredItems.slice(startIndex, startIndex + pageSize);
  const rangeLabel = filteredItems.length
    ? `${startIndex + 1}-${Math.min(startIndex + pageSize, filteredItems.length)} de ${filteredItems.length}`
    : '0 de 0';

  return {
    visibleItems,
    filteredItems,
    rows: pageItems.map(input.toRow),
    pageMeta: {
      page,
      pageSize,
      totalItems: filteredItems.length,
      totalPages,
      rangeLabel,
    },
  };
}

export function buildOpportunitySummaryCards(
  input: OpportunitySummaryInput,
): OpportunitySummaryCard[] {
  const all = input.items;
  const active = all.filter(input.isActive);
  const won = all.filter((item) => item.estado === 'GANADA' || item.etapa === 'GANADO');
  const wonThisMonth = won.filter((item) =>
    input.isThisMonth(
      item.fechaCierreReal || item.fechaCierreEstimada || item.updatedAt || item.createdAt,
    ),
  ).length;
  const pipelineByCurrency = groupAmountsByCurrency(active);
  const activeRate = toRate(active.length, all.length);
  const conversionRate = toRate(won.length, all.length);

  return [
    summaryCard(
      'Total oportunidades',
      String(all.length),
      input.deltaLabel(all.length, 0),
      'vs mes anterior',
      'pi pi-briefcase',
      'blue',
    ),
    summaryCard(
      'Valor total pipeline',
      formatCurrencyGroups(pipelineByCurrency, input.formatAmount),
      input.deltaLabel(active.length, 0),
      'vs mes anterior',
      'pi pi-wallet',
      'violet',
    ),
    summaryCard(
      'Oportunidades activas',
      String(active.length),
      `${activeRate}%`,
      'del total',
      'pi pi-money-bill',
      'green',
    ),
    summaryCard(
      'Ganadas este mes',
      String(wonThisMonth),
      input.deltaLabel(wonThisMonth, 0),
      'vs mes anterior',
      'pi pi-gift',
      'amber',
    ),
    summaryCard(
      'Tasa de conversion',
      `${conversionRate}%`,
      input.deltaLabel(conversionRate, 0, true),
      'vs mes anterior',
      'pi pi-check-square',
      'teal',
    ),
  ];
}

function groupAmountsByCurrency(items: readonly CrmOportunidad[]): ReadonlyMap<string, number> {
  return items.reduce((totals, item) => {
    const currency = (item.moneda || 'PEN').trim().toUpperCase();
    totals.set(currency, (totals.get(currency) || 0) + Number(item.montoEstimado || 0));
    return totals;
  }, new Map<string, number>());
}

function formatCurrencyGroups(
  totals: ReadonlyMap<string, number>,
  formatAmount: (value: number) => string,
): string {
  if (!totals.size) {
<<<<<<< HEAD
    return '0';
  }
  return [...totals.entries()]
    .map(([currency, amount]) => `${currencySymbol(currency)} ${formatAmount(amount)}`)
=======
    return 'S/ 0';
  }
  const symbols: Record<string, string> = { PEN: 'S/', USD: 'US$', EUR: '€' };
  return [...totals.entries()]
    .map(([currency, amount]) => `${symbols[currency] || currency} ${formatAmount(amount)}`)
>>>>>>> b50118bff6d4d47a3981a187eab708420ee804bc
    .join(' · ');
}

function matchesView(
  item: CrmOportunidad,
  view: OpportunityView,
  isActive: (item: CrmOportunidad) => boolean,
): boolean {
  if (view === 'COTIZADAS') {
    return item.etapa === 'COTIZADO' && isActive(item);
  }
  if (view === 'NEGOCIACION') {
    return ['COTIZADO', 'NEGOCIACION'].includes(item.etapa) && isActive(item);
  }
  if (view === 'GANADAS') {
    return item.estado === 'GANADA' || item.etapa === 'GANADO';
  }
  return isActive(item);
}

function matchesQuery(item: CrmOportunidad, query: string): boolean {
  return (
    !query ||
    `${item.titulo} ${item.prospectoNombre ?? ''} ${item.clienteNombre ?? ''} ${item.tipoOportunidad ?? ''} ${item.etapa} ${item.estado}`
      .toLowerCase()
      .includes(query)
  );
}

function matchesStatus(
  item: CrmOportunidad,
  status: string,
  isActive: (item: CrmOportunidad) => boolean,
): boolean {
  return status === 'ABIERTA' ? isActive(item) : item.estado === status;
}

function toRate(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function summaryCard(
  label: string,
  value: string,
  delta: string,
  detail: string,
  icon: string,
  tone: string,
): OpportunitySummaryCard {
  return { label, value, delta, detail, icon, tone };
}
