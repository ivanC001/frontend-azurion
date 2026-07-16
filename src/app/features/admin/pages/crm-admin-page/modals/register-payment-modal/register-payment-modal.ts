import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';

import {
  CrmPaymentDialogSummary,
  CrmPaymentDraft,
  CrmPaymentInstallment,
} from '../../models';

interface PaymentSelectOption {
  readonly label: string;
  readonly value: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-register-payment-modal',
  standalone: true,
  imports: [DecimalPipe, DialogModule, FormsModule, InputTextModule, SelectModule, TextareaModule],
  templateUrl: './register-payment-modal.html',
  styleUrl: './register-payment-modal.scss',
})
export class RegisterPaymentModal {
  readonly visible = input(false);
  readonly opportunityTitle = input('Oportunidad');
  readonly summary = input.required<CrmPaymentDialogSummary>();
  readonly installments = input<CrmPaymentInstallment[]>([]);
  readonly form = input.required<CrmPaymentDraft>();
  readonly typeOptions = input<PaymentSelectOption[]>([]);
  readonly statusOptions = input<PaymentSelectOption[]>([]);
  readonly methodOptions = input<PaymentSelectOption[]>([]);
  readonly saving = input(false);

  readonly closed = output<void>();
  readonly formChange = output<CrmPaymentDraft>();
  readonly installmentSelected = output<string>();
  readonly fileSelected = output<Event>();
  readonly saveRequested = output<void>();

  protected patchForm<K extends keyof CrmPaymentDraft>(field: K, value: CrmPaymentDraft[K]): void {
    this.formChange.emit({ ...this.form(), [field]: value });
  }

  protected selectInstallment(installment: CrmPaymentInstallment): void {
    if (installment.selectable) {
      this.installmentSelected.emit(installment.key);
    }
  }

  protected installmentStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      PAGADO: 'Pagado',
      PARCIAL: 'Parcial',
      VENCIDO: 'Vencido',
      PENDIENTE: 'Pendiente',
    };
    return labels[status] || status;
  }

  protected installmentStatusTone(status: string): string {
    return String(status || 'PENDIENTE').toLowerCase();
  }

  protected formatDate(value: string): string {
    const [year, month, day] = String(value || '').slice(0, 10).split('-');
    return year && month && day ? `${day}/${month}/${year}` : 'Sin fecha';
  }

  protected selectedInstallmentLabel(): string {
    const selected = this.installments().find((item) => item.key === this.form().cuotaKey);
    return selected
      ? `Cuota ${selected.number} - Vence ${this.formatDate(selected.dueDate)}`
      : 'Selecciona una cuota pendiente';
  }

  protected selectableInstallments(): CrmPaymentInstallment[] {
    return this.installments().filter((installment) => installment.selectable);
  }
}
