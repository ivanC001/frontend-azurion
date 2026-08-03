import type { CrmOportunidad } from '../../../data/admin-saas-api.service';

export interface OpportunitySummaryCard {
  readonly label: string;
  readonly value: string;
  readonly delta: string;
  readonly detail: string;
  readonly icon: string;
  readonly tone: string;
}

export interface OpportunityFilterOption<T = string | null> {
  readonly label: string;
  readonly value: T;
}

export interface OpportunityPageRow {
  readonly opportunity: CrmOportunidad;
  readonly typeLabel: string;
  readonly contactName: string;
  readonly companyLabel: string;
  readonly stageName: string;
  readonly stageBackground: string;
  readonly stageColor: string;
  readonly temperatureLabel: string;
  readonly temperatureTone: string;
  readonly ownerInitials: string;
  readonly ownerName: string;
  readonly statusLabel: string;
  readonly statusTone: string;
}

export interface OpportunityPageMeta {
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
  readonly rangeLabel: string;
}

export interface OpportunityListView {
  readonly visibleItems: CrmOportunidad[];
  readonly filteredItems: CrmOportunidad[];
  readonly rows: OpportunityPageRow[];
  readonly pageMeta: OpportunityPageMeta;
}

export interface PipelineSummaryCard {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
  readonly icon: string;
  readonly tone: string;
  readonly trend?: string;
  readonly trendTone?: 'positive' | 'danger' | 'neutral';
}

export interface PipelineDealRow {
  readonly opportunity: CrmOportunidad;
  readonly title: string;
  readonly amount: number;
  readonly company: string;
  readonly campaign: string;
  readonly origin: string;
  readonly temperatureLabel: string;
  readonly temperatureTone: string;
  readonly closingDate: string | null;
  readonly probability: number;
  readonly ownerName: string;
  readonly ownerInitials: string;
  readonly nextAction: string;
  readonly nextActionDue: string;
  readonly nextActionTone: 'danger' | 'warning' | 'normal' | 'muted';
  readonly priorityLabel: string | null;
  readonly priorityTone: 'danger' | 'warning' | 'success' | 'info' | null;
  readonly riskBadges: readonly string[];
  readonly won: boolean;
  readonly lost: boolean;
}

export interface PipelineColumn {
  readonly label: string;
  readonly value: string;
  readonly total: number;
  readonly color: string;
  readonly icon: string;
  readonly averageProbability: number;
  readonly items: readonly PipelineDealRow[];
}

export interface VisiblePipelineColumn extends PipelineColumn {
  readonly visibleItems: readonly PipelineDealRow[];
  readonly visibleTotal: number;
  readonly visibleAverageProbability: number;
}

export type PipelineQuickFilter = 'ALL' | 'RISK' | 'NO_ACTION' | 'OVERDUE';
export type PipelineSortMode = 'CLOSE_DATE' | 'AMOUNT' | 'PROBABILITY';

export interface OpportunityFinancialSummary {
  readonly total: number;
  readonly paid: number;
  readonly pending: number;
  readonly percent: number;
  readonly status: 'PENDIENTE' | 'PARCIAL' | 'PAGADO' | 'VENCIDO';
}

export interface OpportunityChecklistItem {
  readonly label: string;
  readonly done: boolean;
}

export type OpportunityFinancialStatusTone = 'pending' | 'partial' | 'paid' | 'overdue';
export type OpportunityStatusTone = 'active' | 'won' | 'lost' | 'neutral';
