import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';

import { CrmOportunidad } from '@features/crm/data/crm-api.types';
import type {
  PipelineColumn,
  PipelineQuickFilter,
  PipelineSortMode,
  PipelineSummaryCard,
} from '../../models';
import { buildVisiblePipelineColumns } from './pipeline-page.viewmodel';

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
  protected readonly quickFilter = signal<PipelineQuickFilter>('ALL');
  protected readonly sortMode = signal<PipelineSortMode>('CLOSE_DATE');

  readonly query = input.required<string>();
  readonly summaryCards = input.required<PipelineSummaryCard[]>();
  readonly columns = input.required<PipelineColumn[]>();

  readonly queryChange = output<string>();
  readonly clearStageFilterRequested = output<void>();
  readonly createOpportunityRequested = output<void>();
  readonly opportunitySelected = output<{ opportunity: CrmOportunidad; stage: string }>();
  readonly editOpportunityRequested = output<CrmOportunidad>();
  readonly closedOutcomeRequested = output<'GANADA' | 'PERDIDA'>();

  protected readonly visibleColumns = computed(() =>
    buildVisiblePipelineColumns(this.columns(), this.quickFilter(), this.sortMode()),
  );

  protected resetFilters(): void {
    this.quickFilter.set('ALL');
    this.sortMode.set('CLOSE_DATE');
    this.clearStageFilterRequested.emit();
  }
}
