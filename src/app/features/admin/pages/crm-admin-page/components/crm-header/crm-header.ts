import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-crm-header',
  standalone: true,
  templateUrl: './crm-header.html',
  styleUrl: './crm-header.scss',
})
export class CrmHeader {
  readonly eyebrow = input('');
  readonly title = input('');
  readonly description = input('');
}
