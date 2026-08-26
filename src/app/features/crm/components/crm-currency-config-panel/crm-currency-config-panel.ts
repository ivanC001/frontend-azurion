import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import type { CrmCurrencyConfig, CrmCurrencyOption } from '@features/crm/data/crm-api.types';
import type { CrmCurrencyField } from '../../models/crm-admin-view.model';

export interface CrmCurrencyFieldChange {
  readonly moneda: string;
  readonly field: CrmCurrencyField;
  readonly value: string | number;
}

export interface CrmCurrencyActiveChange {
  readonly moneda: string;
  readonly activo: boolean;
}

@Component({
  selector: 'app-crm-currency-config-panel',
  standalone: true,
  imports: [DecimalPipe, FormsModule, InputTextModule, SelectModule],
  templateUrl: './crm-currency-config-panel.html',
  styleUrl: './crm-currency-config-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CrmCurrencyConfigPanel {
  readonly currencies = input<readonly CrmCurrencyConfig[]>([]);
  readonly availableCurrencies = input<readonly CrmCurrencyOption[]>([]);
  readonly baseCurrencyCode = input('PEN');
  readonly baseCurrencySymbol = input('S/');
  readonly canManage = input(false);
  readonly savingCurrency = input<string | null>(null);

  readonly fieldChange = output<CrmCurrencyFieldChange>();
  readonly activeChange = output<CrmCurrencyActiveChange>();
  readonly saveCurrency = output<CrmCurrencyConfig>();
  readonly addCurrency = output<string>();

  protected selectedCurrencyCode: string | null = null;

  protected availableCurrencyOptions(): Array<{ label: string; value: string }> {
    const configured = new Set(this.currencies().map((item) => item.moneda));
    const base = this.baseCurrencyCode().toUpperCase();
    return this.availableCurrencies()
      .filter((item) => item.moneda !== base && !configured.has(item.moneda))
      .map((item) => ({
        label: `${item.moneda} - ${item.nombre} (${item.simbolo})`,
        value: item.moneda,
      }));
  }

  protected requestCurrency(): void {
    if (!this.selectedCurrencyCode) {
      return;
    }
    this.addCurrency.emit(this.selectedCurrencyCode);
    this.selectedCurrencyCode = null;
  }

  protected updateField(moneda: string, field: CrmCurrencyField, value: string | number): void {
    this.fieldChange.emit({ moneda, field, value });
  }

  protected updateActive(moneda: string, activo: boolean): void {
    this.activeChange.emit({ moneda, activo });
  }
}
