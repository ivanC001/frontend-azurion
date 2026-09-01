import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface CrmExecutiveKpiView {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
  readonly trend: string;
  readonly trendTone: 'up' | 'down';
  readonly icon: string;
  readonly tone: 'money' | 'deals' | 'contacts' | 'conversion';
}

export interface CrmExecutivePipelineRowView {
  readonly label: string;
  readonly count: number;
  readonly amount: string;
  readonly color: string;
  readonly percent: number;
}

export interface CrmExecutiveRevenueChartView {
  readonly labels: readonly string[];
  readonly guides: ReadonlyArray<{ readonly label: string; readonly y: number }>;
  readonly realPoints: string;
  readonly targetPoints: string;
  readonly areaPoints: string;
}

export interface CrmExecutiveTopDealView {
  readonly id: number;
  readonly title: string;
  readonly clientName: string;
  readonly stageLabel: string;
  readonly stageColor: string;
  readonly amount: string;
  readonly rawAmount: number;
  readonly probability: number;
  readonly sellerName: string;
  readonly temperature: 'FRIO' | 'MEDIO' | 'CALIENTE';
  readonly isRisk?: boolean;
}

export interface CrmExecutiveLeadSourceView {
  readonly source: string;
  readonly label: string;
  readonly count: number;
  readonly percent: number;
  readonly icon: string;
  readonly color: string;
}

export interface CrmExecutiveSellerPerformanceView {
  readonly name: string;
  readonly wonCount: number;
  readonly wonAmount: string;
  readonly activeDealsCount: number;
  readonly pipelineAmount: string;
  readonly conversionRate: number;
}

export interface CrmExecutiveAlertView {
  readonly type: 'risk' | 'urgent_task' | 'unassigned' | 'stale';
  readonly title: string;
  readonly description: string;
  readonly count: number;
  readonly icon: string;
  readonly tone: 'danger' | 'warning' | 'info' | 'emerald';
  readonly tabTarget?: string;
  readonly actionLabel: string;
}

export interface CrmExecutiveGoalMetricView {
  readonly label: string;
  readonly icon: string;
  readonly actual: string;
  readonly target: string;
  readonly prefix?: string;
  readonly progress: number;
}

export interface CrmExecutiveGoalSummaryView {
  readonly title: string;
  readonly period: string;
  readonly progress: number;
  readonly metrics: readonly CrmExecutiveGoalMetricView[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-crm-dashboard-page',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './crm-dashboard-page.html',
  styleUrl: './crm-dashboard-page.scss',
})
export class CrmDashboardPage {
  readonly now = input.required<Date>();
  readonly kpis = input<readonly CrmExecutiveKpiView[]>([]);
  readonly pipelineRows = input<readonly CrmExecutivePipelineRowView[]>([]);
<<<<<<< HEAD
  readonly pipelineTotal = input('0');
=======
  readonly pipelineTotal = input('S/ 0');
>>>>>>> b50118bff6d4d47a3981a187eab708420ee804bc
  readonly revenueChart = input.required<CrmExecutiveRevenueChartView>();
  readonly topDeals = input<readonly CrmExecutiveTopDealView[]>([]);
  readonly leadSources = input<readonly CrmExecutiveLeadSourceView[]>([]);
  readonly sellerRankings = input<readonly CrmExecutiveSellerPerformanceView[]>([]);
  readonly alerts = input<readonly CrmExecutiveAlertView[]>([]);
  readonly goalSummary = input<CrmExecutiveGoalSummaryView | null>(null);
  readonly canManageGoals = input(false);

  readonly exportRequested = output<void>();
  readonly createOpportunityRequested = output<void>();
  readonly pipelineRequested = output<void>();
  readonly openDealRequested = output<number>();
  readonly alertActionRequested = output<string>();
  readonly tabRequested = output<string>();
  readonly configureGoalsRequested = output<void>();
}
