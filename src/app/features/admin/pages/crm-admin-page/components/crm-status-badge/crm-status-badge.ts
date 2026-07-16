import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-crm-status-badge',
  standalone: true,
  templateUrl: './crm-status-badge.html',
  styleUrl: './crm-status-badge.scss',
})
export class CrmStatusBadge {
  readonly label = input('');
  readonly tone = input<'green' | 'blue' | 'amber' | 'red' | 'slate'>('slate');
}
