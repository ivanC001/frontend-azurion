import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import type { Cotizacion } from '@core/api/cotizacion-api.types';
import { quoteCode } from '@shared/utils/quote-code';
import {
  type NegotiationQuoteDecision,
  quoteStatusLabel,
  quoteStatusTone,
  quoteStatusValue,
} from '../../modals/opportunity-detail-modal/opportunity-detail.viewmodel';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-opportunity-quote-card',
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  templateUrl: './opportunity-quote-card.html',
  styleUrl: './opportunity-quote-card.scss',
})
export class OpportunityQuoteCard {
  readonly quote = input.required<Cotizacion>();
  readonly currencySymbol = input('');
  readonly nextStep = input('');
  readonly appearance = input<'default' | 'interest'>('default');
  readonly mode = input<'standard' | 'negotiation'>('standard');
  readonly negotiationDecision = input<NegotiationQuoteDecision | null>(null);
  readonly actionInProgress = input(false);
  readonly whatsappAvailable = input(false);
  readonly whatsappSending = input(false);
  readonly whatsappLocked = input(false);
  readonly whatsappProcessing = input(false);
  readonly whatsappLabel = input('WhatsApp');
  readonly emailAvailable = input(false);
  readonly emailSending = input(false);
  readonly isDownloadingPdf = input(false);

  readonly downloadRequested = output<void>();
  readonly whatsappRequested = output<void>();
  readonly emailRequested = output<void>();
  readonly followUpRequested = output<void>();
  readonly acceptedRequested = output<void>();
  readonly adjustmentRequested = output<void>();
  readonly rejectedRequested = output<void>();

  protected readonly quoteCode = quoteCode;

  protected readonly status = computed(() => quoteStatusValue(this.quote()));
  protected readonly statusLabel = computed(() => quoteStatusLabel(this.quote()));
  protected readonly statusTone = computed(() => quoteStatusTone(this.quote()));
  protected readonly canFollowUp = computed(() => this.status() === 'ENVIADA');
  protected readonly canDecide = computed(() =>
    ['ENVIADA', 'EN_SEGUIMIENTO'].includes(this.status()),
  );
}
