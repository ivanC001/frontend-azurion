import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface CrmStageBarItem {
  readonly label: string;
  readonly icon?: string;
  readonly done?: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-crm-stage-bar',
  standalone: true,
  templateUrl: './crm-stage-bar.html',
  styleUrl: './crm-stage-bar.scss',
})
export class CrmStageBar {
  readonly stages = input<readonly CrmStageBarItem[]>([]);
  readonly activeIndex = input(0);
}
