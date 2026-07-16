import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-crm-card',
  standalone: true,
  templateUrl: './crm-card.html',
  styleUrl: './crm-card.scss',
})
export class CrmCard {
  readonly label = input('');
  readonly value = input('');
  readonly detail = input('');
  readonly icon = input('pi pi-chart-line');
  readonly tone = input<'blue' | 'green' | 'violet' | 'amber' | 'red' | 'slate'>('blue');
}
