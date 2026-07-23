import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';

import { CrmProspecto } from '../../../../data/admin-saas-api.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-delete-prospect-modal',
  standalone: true,
  imports: [DialogModule],
  templateUrl: './delete-prospect-modal.html',
  styleUrl: './delete-prospect-modal.scss',
})
export class DeleteProspectModal {
  readonly visible = input(false);
  readonly prospect = input<CrmProspecto | null>(null);
  readonly deleting = input(false);

  readonly closed = output<void>();
  readonly confirmed = output<void>();

  protected closeFromVisibility(visible: boolean): void {
    if (!visible) {
      this.closed.emit();
    }
  }
}
