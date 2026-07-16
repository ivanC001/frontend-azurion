import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import { CrmClientCompletionAction, CrmClientCompletionDraft } from '../../models';

interface ClientSelectOption {
  readonly label: string;
  readonly value: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-complete-client-data-modal',
  standalone: true,
  imports: [DialogModule, FormsModule, InputTextModule, SelectModule],
  templateUrl: './complete-client-data-modal.html',
  styleUrl: './complete-client-data-modal.scss',
})
export class CompleteClientDataModal {
  readonly visible = input(false);
  readonly prospectName = input('Prospecto');
  readonly opportunityTitle = input('Oportunidad');
  readonly action = input<CrmClientCompletionAction>('WON');
  readonly form = input.required<CrmClientCompletionDraft>();
  readonly personTypeOptions = input<ClientSelectOption[]>([]);
  readonly documentTypeOptions = input<ClientSelectOption[]>([]);
  readonly saving = input(false);

  readonly closed = output<void>();
  readonly formChange = output<CrmClientCompletionDraft>();
  readonly saveRequested = output<void>();

  protected patchForm<K extends keyof CrmClientCompletionDraft>(field: K, value: CrmClientCompletionDraft[K]): void {
    const next = { ...this.form(), [field]: value };
    if (field === 'tipoPersona') {
      next.tipoDocumento = value === 'JURIDICA' ? '6' : '1';
    }
    this.formChange.emit(next);
  }

  protected actionTitle(): string {
    if (this.action() === 'EDIT') {
      return 'actualizar los datos comerciales';
    }
    return this.action() === 'PAYMENT' ? 'registrar el pago' : 'marcar la oportunidad como ganada';
  }

  protected saveLabel(): string {
    if (this.action() === 'EDIT') {
      return 'Guardar datos';
    }
    return this.action() === 'PAYMENT' ? 'Guardar y registrar pago' : 'Guardar y marcar ganado';
  }

  protected documentHint(): string {
    return this.form().tipoDocumento === '6' ? 'El RUC debe tener 11 digitos.' : 'El DNI debe tener 8 digitos.';
  }
}
