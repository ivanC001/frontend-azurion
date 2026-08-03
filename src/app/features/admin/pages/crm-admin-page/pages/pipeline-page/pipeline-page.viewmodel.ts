import type {
  PipelineColumn,
  PipelineDealRow,
  PipelineQuickFilter,
  PipelineSortMode,
  VisiblePipelineColumn,
} from '../../models';

export function buildVisiblePipelineColumns(
  columns: readonly PipelineColumn[],
  quickFilter: PipelineQuickFilter,
  sortMode: PipelineSortMode,
): VisiblePipelineColumn[] {
  return columns.map((column) => {
    const visibleItems = column.items
      .filter((row) => matchesQuickFilter(row, quickFilter))
      .sort(sorter(sortMode));
    const visibleTotal = visibleItems.reduce((total, row) => total + row.amount, 0);
    const visibleAverageProbability = visibleItems.length
      ? Math.round(
          visibleItems.reduce((total, row) => total + row.probability, 0) / visibleItems.length,
        )
      : 0;

    return {
      ...column,
      visibleItems,
      visibleTotal,
      visibleAverageProbability,
    };
  });
}

function matchesQuickFilter(row: PipelineDealRow, filter: PipelineQuickFilter): boolean {
  switch (filter) {
    case 'RISK':
      return row.riskBadges.length > 0;
    case 'NO_ACTION':
      return row.nextActionTone === 'muted';
    case 'OVERDUE':
      return row.riskBadges.includes('Cierre vencido');
    default:
      return true;
  }
}

function sorter(
  sortMode: PipelineSortMode,
): (left: PipelineDealRow, right: PipelineDealRow) => number {
  switch (sortMode) {
    case 'AMOUNT':
      return (left, right) => right.amount - left.amount;
    case 'PROBABILITY':
      return (left, right) => right.probability - left.probability;
    default:
      return (left, right) => closingTimestamp(left) - closingTimestamp(right);
  }
}

function closingTimestamp(row: PipelineDealRow): number {
  return Date.parse(row.closingDate || '') || Number.MAX_SAFE_INTEGER;
}
