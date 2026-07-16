import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface CrmMenuItem {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly count?: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-crm-menu',
  standalone: true,
  templateUrl: './crm-menu.html',
  styleUrl: './crm-menu.scss',
})
export class CrmMenu {
  readonly items = input<readonly CrmMenuItem[]>([]);
  readonly activeId = input('');
  readonly selected = output<string>();
}
