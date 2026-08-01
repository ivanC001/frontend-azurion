import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';

import { CrmOportunidad } from '../../../../data/admin-saas-api.service';

export interface PipelineSummaryCard {
  label: string;
  value: string;
  detail: string;
  icon: string;
  tone: string;
  trend?: string;
  trendTone?: 'positive' | 'danger' | 'neutral';
}

export interface PipelineDealRow {
  opportunity: CrmOportunidad;
  title: string;
  amount: number;
  company: string;
  campaign: string;
  origin: string;
  temperatureLabel: string;
  temperatureTone: string;
  closingDate: string | null;
  probability: number;
  ownerName: string;
  ownerInitials: string;
  nextAction: string;
  nextActionDue: string;
  nextActionTone: 'danger' | 'warning' | 'normal' | 'muted';
  priorityLabel: string | null;
  priorityTone: 'danger' | 'warning' | 'success' | 'info' | null;
  riskBadges: string[];
  won: boolean;
  lost: boolean;
}

export interface PipelineColumn {
  label: string;
  value: string;
  total: number;
  color: string;
  icon: string;
  averageProbability: number;
  items: PipelineDealRow[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-pipeline-page',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule, InputTextModule],
  templateUrl: './pipeline-page.html',
  styleUrl: './pipeline-page.scss',
})
export class PipelinePage {
  protected readonly filterOpen = signal(false);
  protected readonly quickFilter = signal<'ALL' | 'RISK' | 'NO_ACTION' | 'OVERDUE'>('ALL');
  protected readonly sortMode = signal<'CLOSE_DATE' | 'AMOUNT' | 'PROBABILITY'>('CLOSE_DATE');

  readonly query = input.required<string>();
  readonly summaryCards = input.required<PipelineSummaryCard[]>();
  readonly columns = input.required<PipelineColumn[]>();

  readonly queryChange = output<string>();
  readonly clearStageFilterRequested = output<void>();
  readonly createOpportunityRequested = output<void>();
  readonly opportunitySelected = output<{ opportunity: CrmOportunidad; stage: string }>();
  readonly editOpportunityRequested = output<CrmOportunidad>();
  readonly closedOutcomeRequested = output<'GANADA' | 'PERDIDA'>();

  protected visibleRows(column: PipelineColumn): PipelineDealRow[] {
    const filtered = column.items.filter((row) => {
      switch (this.quickFilter()) {
        case 'RISK':
          return row.riskBadges.length > 0;
        case 'NO_ACTION':
          return row.nextActionTone === 'muted';
        case 'OVERDUE':
          return row.riskBadges.includes('Cierre vencido');
        default:
          return true;
      }
    });
    return [...filtered].sort((left, right) => {
      if (this.sortMode() === 'AMOUNT') {
        return right.amount - left.amount;
      }
      if (this.sortMode() === 'PROBABILITY') {
        return right.probability - left.probability;
      }
      const leftDate = Date.parse(left.closingDate || '') || Number.MAX_SAFE_INTEGER;
      const rightDate = Date.parse(right.closingDate || '') || Number.MAX_SAFE_INTEGER;
      return leftDate - rightDate;
    });
  }

  protected visibleTotal(column: PipelineColumn): number {
    return this.visibleRows(column).reduce((total, row) => total + row.amount, 0);
  }

  protected visibleAverageProbability(column: PipelineColumn): number {
    const rows = this.visibleRows(column);
    return rows.length
      ? Math.round(rows.reduce((total, row) => total + row.probability, 0) / rows.length)
      : 0;
  }

  protected resetFilters(): void {
    this.quickFilter.set('ALL');
    this.sortMode.set('CLOSE_DATE');
    this.clearStageFilterRequested.emit();
  }
}
