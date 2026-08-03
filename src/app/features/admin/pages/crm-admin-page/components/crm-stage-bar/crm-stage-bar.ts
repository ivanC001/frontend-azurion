import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { PipelineStageOption } from '../../models';
import { buildOpportunityStageSteps } from './crm-stage-bar.viewmodel';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-crm-stage-bar',
  standalone: true,
  templateUrl: './crm-stage-bar.html',
  styleUrl: './crm-stage-bar.scss',
})
export class CrmStageBar {
  readonly stages = input.required<readonly PipelineStageOption[]>();
  readonly currentStage = input.required<string>();
  readonly opportunityStatus = input.required<string>();
  readonly compact = input(false);

  protected readonly steps = computed(() =>
    buildOpportunityStageSteps(this.stages(), this.currentStage(), this.opportunityStatus()),
  );
}
