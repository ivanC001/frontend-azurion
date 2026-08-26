import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { OpportunityFinancialStatusTone, OpportunityFinancialSummary } from '../../models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-opportunity-financial-summary',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './opportunity-financial-summary.html',
  styleUrl: './opportunity-financial-summary.scss',
})
export class OpportunityFinancialSummaryComponent {
  readonly summary = input.required<OpportunityFinancialSummary>();
  readonly currencySymbol = input.required<string>();
  readonly statusLabel = input.required<string>();
  readonly statusTone = input.required<OpportunityFinancialStatusTone>();
  readonly heading = input('');
  readonly actionLabel = input('');
  readonly showPercentLabel = input(false);
  readonly wide = input(false);

  readonly actionRequested = output<void>();
}
