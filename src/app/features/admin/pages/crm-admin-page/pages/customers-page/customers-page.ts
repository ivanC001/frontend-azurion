import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';

import { CrmOportunidad } from '../../../../data/admin-saas-api.service';

export interface CustomerMetric {
  label: string;
  value: string;
  delta: string;
  detail: string;
}

export interface CustomerProductSummary {
  label: string;
  value: number;
  percent: number;
  color: string;
}

export interface CustomerPageRow {
  opportunity: CrmOportunidad;
  initials: string;
  contactName: string;
  purchaseLabel: string;
  companyLabel: string;
  documentCount: number;
  closureDate: string;
  debt: number;
}

export interface CustomerFilterOption {
  label: string;
  value: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-customers-page',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule, SelectModule],
  templateUrl: './customers-page.html',
  styleUrl: './customers-page.scss',
})
export class CustomersPage {
  readonly rows = input.required<CustomerPageRow[]>();
  readonly totalCustomers = input.required<number>();
  readonly metrics = input.required<CustomerMetric[]>();
  readonly productSummary = input.required<CustomerProductSummary[]>();
  readonly productRingBackground = input.required<string>();
  readonly filtersVisible = input(false);
  readonly outcomeFilterOptions = input.required<CustomerFilterOption[]>();
  readonly outcomeFilter = input.required<string>();
  readonly pageRangeLabel = input.required<string>();
  readonly canGoPrevious = input(false);
  readonly canGoNext = input(false);

  readonly outcomeFilterChange = output<string>();
  readonly clearRequested = output<void>();
  readonly customerSelected = output<CrmOportunidad>();
  readonly previousPageRequested = output<void>();
  readonly nextPageRequested = output<void>();
}
