import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';

import { CrmOportunidad } from '../../../../data/admin-saas-api.service';
import type {
  OpportunityFilterOption,
  OpportunityPageMeta,
  OpportunityPageRow,
  OpportunitySummaryCard,
} from '../../models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-opportunities-page',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule, SelectModule, TableModule],
  templateUrl: './opportunities-page.html',
  styleUrl: './opportunities-page.scss',
})
export class OpportunitiesPage {
  readonly summaryCards = input.required<OpportunitySummaryCard[]>();
  readonly rows = input.required<OpportunityPageRow[]>();
  readonly totalItems = input.required<number>();
  readonly pageMeta = input.required<OpportunityPageMeta>();
  readonly loading = input(false);
  readonly filtersVisible = input(false);
  readonly stageOptions = input.required<OpportunityFilterOption[]>();
  readonly responsibleOptions = input.required<OpportunityFilterOption[]>();
  readonly statusOptions = input.required<OpportunityFilterOption[]>();
  readonly stageFilter = input<string | null>(null);
  readonly responsibleFilter = input<string | null>(null);
  readonly statusFilter = input<string | null>(null);

  readonly stageFilterChange = output<string | null>();
  readonly responsibleFilterChange = output<string | null>();
  readonly statusFilterChange = output<string | null>();
  readonly filtersReset = output<void>();
  readonly previousPageRequested = output<void>();
  readonly nextPageRequested = output<void>();
  readonly opportunitySelected = output<CrmOportunidad>();
}
