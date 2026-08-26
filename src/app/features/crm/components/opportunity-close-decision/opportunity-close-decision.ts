import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { CrmPaymentPlan } from '../../models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-opportunity-close-decision',
  standalone: true,
  templateUrl: './opportunity-close-decision.html',
  styleUrl: './opportunity-close-decision.scss',
})
export class OpportunityCloseDecision {
  readonly canClose = input.required<boolean>();
  readonly hasFinalAgreement = input.required<boolean>();
  readonly paymentPlan = input.required<CrmPaymentPlan>();
  readonly requiredPaymentRegistered = input.required<boolean>();
  readonly actionInProgress = input(false);

  readonly agreementRequested = output<void>();
  readonly paymentRequested = output<void>();
  readonly wonRequested = output<void>();
  readonly lostRequested = output<void>();
}
