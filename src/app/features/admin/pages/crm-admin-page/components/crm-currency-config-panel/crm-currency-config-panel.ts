import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';

import type { CrmCurrencyConfig } from '../../../../data/admin-saas-api.service';
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
  imports: [DecimalPipe, FormsModule, InputTextModule],
  templateUrl: './crm-currency-config-panel.html',
  styleUrl: './crm-currency-config-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CrmCurrencyConfigPanel {
  readonly currencies = input<readonly CrmCurrencyConfig[]>([]);
  readonly baseCurrencyCode = input('PEN');
  readonly baseCurrencySymbol = input('S/');
  readonly canManage = input(false);
  readonly savingCurrency = input<string | null>(null);

  readonly fieldChange = output<CrmCurrencyFieldChange>();
  readonly activeChange = output<CrmCurrencyActiveChange>();
  readonly saveCurrency = output<CrmCurrencyConfig>();

  protected updateField(
    moneda: string,
    field: CrmCurrencyField,
    value: string | number,
  ): void {
    this.fieldChange.emit({ moneda, field, value });
  }

  protected updateActive(moneda: string, activo: boolean): void {
    this.activeChange.emit({ moneda, activo });
  }
}
