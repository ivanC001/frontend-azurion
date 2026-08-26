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

  protected patchForm<K extends keyof CrmClientCompletionDraft>(
    field: K,
    value: CrmClientCompletionDraft[K],
  ): void {
    const next = { ...this.form(), [field]: value };
    if (field === 'tipoPersona') {
      next.tipoDocumento = value === 'JURIDICA' ? '6' : value === 'NATURAL' ? '1' : '';
    }
    this.formChange.emit(next);
  }

  protected actionTitle(): string {
    return {
      EDIT: 'actualizar los datos comerciales',
      PAYMENT: 'registrar el pago',
      WON: 'marcar la oportunidad como ganada',
      QUOTE_CREATE: 'crear la cotizacion',
      QUOTE_PDF: 'emitir el PDF de la cotizacion',
      QUOTE_EMAIL: 'enviar la cotizacion por correo',
      QUOTE_WHATSAPP: 'enviar la cotizacion por WhatsApp',
    }[this.action()];
  }

  protected saveLabel(): string {
    return {
      EDIT: 'Guardar datos',
      PAYMENT: 'Guardar y registrar pago',
      WON: 'Guardar y marcar ganado',
      QUOTE_CREATE: 'Guardar y crear cotizacion',
      QUOTE_PDF: 'Guardar y generar PDF',
      QUOTE_EMAIL: 'Guardar y enviar correo',
      QUOTE_WHATSAPP: 'Guardar y enviar WhatsApp',
    }[this.action()];
  }

  protected documentHint(): string {
    if (this.form().tipoPersona === 'SIN_DEFINIR') {
      return 'Primero selecciona persona natural o empresa.';
    }
    return this.form().tipoDocumento === '6'
      ? 'El RUC debe tener 11 digitos.'
      : 'El DNI debe tener 8 digitos.';
  }
}
