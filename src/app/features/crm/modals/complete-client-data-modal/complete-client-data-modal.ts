import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import {
  CrmClientCompletionAction,
  CrmClientCompletionDraft,
  PROSPECT_COUNTRIES,
  ProspectDocumentOption,
  ProspectPersonType,
  prospectCountry,
  prospectDocuments,
} from '../../models';

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

  readonly countryOptions = PROSPECT_COUNTRIES.map((country) => ({
    label: country.name,
    value: country.code,
  }));

  protected currentCountryCode(): string {
    return this.form().paisCodigo || 'PE';
  }

  protected currentCountryName(): string {
    return prospectCountry(this.currentCountryCode()).name;
  }

  protected currentPersonType(): ProspectPersonType {
    const type = this.form().tipoPersona;
    if (type === 'JURIDICA' || type === 'NATURAL') {
      return type;
    }
    return 'SIN_DEFINIR';
  }

  protected availableDocumentOptions(): { label: string; value: string }[] {
    const docs = prospectDocuments(this.currentCountryCode(), this.currentPersonType());
    if (docs.length > 0) {
      return docs.map((d) => ({ label: d.label, value: d.value }));
    }
    return this.documentTypeOptions();
  }

  protected selectedDocumentOption(): ProspectDocumentOption | null {
    const docs = prospectDocuments(this.currentCountryCode(), this.currentPersonType());
    return docs.find((d) => d.value === this.form().tipoDocumento) ?? null;
  }

  protected patchForm<K extends keyof CrmClientCompletionDraft>(
    field: K,
    value: CrmClientCompletionDraft[K],
  ): void {
    const next = { ...this.form(), [field]: value };
    this.formChange.emit(next);
  }

  protected onCountryChange(countryCode: string): void {
    const next = { ...this.form(), paisCodigo: countryCode };
    const docs = prospectDocuments(countryCode, this.currentPersonType());
    next.tipoDocumento = docs[0]?.value || '';
    this.formChange.emit(next);
  }

  protected onPersonTypeChange(personType: string): void {
    const next = { ...this.form(), tipoPersona: personType };
    const normalizedType: ProspectPersonType =
      personType === 'JURIDICA' || personType === 'NATURAL' ? personType : 'SIN_DEFINIR';
    const docs = prospectDocuments(this.currentCountryCode(), normalizedType);
    next.tipoDocumento = docs[0]?.value || '';
    this.formChange.emit(next);
  }

  protected actionTitle(): string {
    return {
      EDIT: 'actualizar los datos comerciales',
      PAYMENT: 'registrar el pago',
      WON: 'marcar la oportunidad como ganada',
      QUOTE_CREATE: 'crear la cotización',
      QUOTE_PDF: 'emitir el PDF de la cotización',
      QUOTE_EMAIL: 'enviar la cotización por correo',
      QUOTE_WHATSAPP: 'enviar la cotización por WhatsApp',
    }[this.action()];
  }

  protected saveLabel(): string {
    return {
      EDIT: 'Guardar datos',
      PAYMENT: 'Guardar y registrar pago',
      WON: 'Guardar y marcar ganado',
      QUOTE_CREATE: 'Guardar y crear cotización',
      QUOTE_PDF: 'Guardar y generar PDF',
      QUOTE_EMAIL: 'Guardar y enviar correo',
      QUOTE_WHATSAPP: 'Guardar y enviar WhatsApp',
    }[this.action()];
  }

  protected documentHint(): string {
    if (this.currentPersonType() === 'SIN_DEFINIR') {
      return 'Primero selecciona persona natural o empresa.';
    }
    const doc = this.selectedDocumentOption();
    if (doc) {
      return doc.help;
    }
    return 'Ingresa el número o código de identificación.';
  }

  protected documentPlaceholder(): string {
    const doc = this.selectedDocumentOption();
    return doc?.placeholder || 'Número de documento';
  }

  protected documentInputMode(): 'numeric' | 'text' {
    const doc = this.selectedDocumentOption();
    return doc?.inputMode || 'text';
  }
}
