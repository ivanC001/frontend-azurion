import { DatePipe } from '@angular/common';
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

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-crm-dashboard-page',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './crm-dashboard-page.html',
  styleUrl: './crm-dashboard-page.scss',
})
export class CrmDashboardPage {
  readonly now = input.required<Date>();
  readonly kpis = input<readonly CrmExecutiveKpiView[]>([]);
  readonly pipelineRows = input<readonly CrmExecutivePipelineRowView[]>([]);
  readonly pipelineTotal = input('S/ 0');
  readonly revenueChart = input.required<CrmExecutiveRevenueChartView>();

  readonly exportRequested = output<void>();
  readonly createOpportunityRequested = output<void>();
  readonly pipelineRequested = output<void>();
}
