import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';

import type { CrmAdminPage } from '../../crm-admin-page';
import { OpportunityCloseDecision } from '../../components/opportunity-close-decision/opportunity-close-decision';
import { OpportunityFinancialSummaryComponent } from '../../components/opportunity-financial-summary/opportunity-financial-summary';
import { OpportunityQuoteCard } from '../../components/opportunity-quote-card/opportunity-quote-card';
import { CrmStageBar } from '../../components/crm-stage-bar/crm-stage-bar';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-opportunity-detail-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CrmStageBar,
    DialogModule,
    InputTextModule,
    OpportunityCloseDecision,
    OpportunityFinancialSummaryComponent,
    OpportunityQuoteCard,
    SelectModule,
    TableModule,
    TagModule,
    TextareaModule,
  ],
  templateUrl: './opportunity-detail-modal.html',
  styleUrl: './opportunity-detail-modal.scss',
  encapsulation: ViewEncapsulation.None,
})
export class OpportunityDetailModal {
  readonly host = input.required<CrmAdminPage>();
}
