import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-crm-empty-state',
  standalone: true,
  templateUrl: './crm-empty-state.html',
  styleUrl: './crm-empty-state.scss',
})
export class CrmEmptyState {
  readonly icon = input('pi pi-inbox');
  readonly title = input('Sin registros');
  readonly detail = input('');
}
