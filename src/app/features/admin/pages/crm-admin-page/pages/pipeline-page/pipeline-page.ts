import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';

import { CrmOportunidad } from '../../../../data/admin-saas-api.service';

export interface PipelineSummaryCard {
  label: string;
  value: string;
  detail: string;
  icon: string;
  tone: string;
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
  won: boolean;
  lost: boolean;
}

export interface PipelineColumn {
  label: string;
  value: string;
  total: number;
  color: string;
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
  readonly query = input.required<string>();
  readonly canManageConfig = input(false);
  readonly summaryCards = input.required<PipelineSummaryCard[]>();
  readonly columns = input.required<PipelineColumn[]>();

  readonly queryChange = output<string>();
  readonly clearStageFilterRequested = output<void>();
  readonly configureStagesRequested = output<void>();
  readonly createOpportunityRequested = output<void>();
  readonly opportunitySelected = output<{ opportunity: CrmOportunidad; stage: string }>();
  readonly editOpportunityRequested = output<CrmOportunidad>();
  readonly closedOutcomeRequested = output<'GANADA' | 'PERDIDA'>();
}
