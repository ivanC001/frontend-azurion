import { Injectable, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { AuthSessionService } from '@core/auth/auth-session.service';
import { CrmApiService } from '@features/crm/data/crm-api.service';
import type {
  CrmCurrencyConfig,
  CrmCurrencyOption,
  UpdateCrmCurrencyConfigRequest,
} from '@features/crm/data/crm-api.types';

import { DEFAULT_CRM_CURRENCIES } from '../models/crm-admin-view.model';
import { CrmFeedbackService } from './crm-feedback.service';

export type CrmCurrencyField = keyof Pick<
  CrmCurrencyConfig,
  'nombre' | 'simbolo' | 'tipoCambioBase' | 'margenConversionPorcentaje'
>;

/**
 * Estado y operaciones de las monedas del CRM.
 *
 * Extraido de CrmPage. Es el primer dominio que sale del contenedor porque su
 * estado no lo lee ninguna otra pantalla: solo el panel de configuracion de
 * monedas y los selectores que necesitan saber que monedas estan activas.
 */
@Injectable()
export class CrmCurrencyStore {
  private static readonly RATE_PRECISION = 1_000_000;

  private readonly api = inject(CrmApiService);

  private readonly auth = inject(AuthSessionService);

  private readonly feedback = inject(CrmFeedbackService);

  readonly configs = signal<CrmCurrencyConfig[]>(
    DEFAULT_CRM_CURRENCIES.map((currency) => ({ ...currency })),
  );

  readonly options = signal<CrmCurrencyOption[]>([]);

  /** Codigo de la moneda que se esta guardando, para bloquear su fila. */
  readonly saving = signal<string | null>(null);

  /** Moneda en la que el tenant lleva su contabilidad. */
  baseCurrencyCode(): string {
    return (this.auth.currentSession()?.empresa?.monedaCodigo || 'PEN').toUpperCase();
  }

  baseCurrencySymbol(): string {
    return this.auth.currentSession()?.empresa?.monedaSimbolo || this.baseCurrencyCode();
  }

  setConfigs(currencies: CrmCurrencyConfig[]): void {
    this.configs.set(this.withDefaults(currencies));
  }

  setOptions(options: CrmCurrencyOption[]): void {
    this.options.set(options);
  }

  /**
   * Edita un campo en memoria y recalcula el tipo de venta al vuelo, para que
   * el panel muestre el efecto del margen antes de guardar.
   */
  updateField(moneda: string, field: CrmCurrencyField, value: string | number): void {
    this.configs.update((items) =>
      items.map((item) => {
        if (item.moneda !== moneda) {
          return item;
        }
        const nextValue =
          field === 'tipoCambioBase' || field === 'margenConversionPorcentaje'
            ? Number(value || 0)
            : String(value ?? '');
        const updated = { ...item, [field]: nextValue } as CrmCurrencyConfig;
        return {
          ...updated,
          tipoCambioVenta: this.saleRate(
            updated.tipoCambioBase,
            updated.margenConversionPorcentaje,
          ),
        };
      }),
    );
  }

  toggle(moneda: string, activo: boolean): void {
    this.configs.update((items) =>
      items.map((item) => (item.moneda === moneda ? { ...item, activo } : item)),
    );
  }

  /**
   * Anade una moneda del catalogo ISO. La base del tenant no se anade: ya
   * participa implicitamente en toda conversion.
   */
  add(moneda: string): void {
    const code = moneda.toUpperCase();
    if (code === this.baseCurrencyCode() || this.configs().some((item) => item.moneda === code)) {
      return;
    }

    const option = this.options().find((item) => item.moneda === code);
    if (!option) {
      this.feedback.error('Selecciona una moneda válida del catálogo ISO 4217.');
      return;
    }

    this.configs.update((items) =>
      [
        ...items,
        {
          moneda: option.moneda,
          nombre: option.nombre,
          simbolo: option.simbolo,
          tipoCambioBase: 1,
          margenConversionPorcentaje: 0,
          tipoCambioVenta: 1,
          activo: false,
        },
      ].sort((left, right) => left.moneda.localeCompare(right.moneda)),
    );
  }

  save(currency: CrmCurrencyConfig, canManage: boolean): void {
    if (!canManage) {
      this.feedback.error('No tienes permisos para administrar monedas CRM.');
      return;
    }

    const request: UpdateCrmCurrencyConfigRequest = {
      moneda: currency.moneda,
      nombre: currency.nombre?.trim() || currency.moneda,
      simbolo: currency.simbolo?.trim() || currency.moneda,
      tipoCambioBase: Number(currency.tipoCambioBase || 0),
      margenConversionPorcentaje: Number(currency.margenConversionPorcentaje || 0),
      activo: currency.activo,
    };

    this.saving.set(currency.moneda);
    this.api
      .saveCrmCurrencyConfig(request)
      .pipe(finalize(() => this.saving.set(null)))
      .subscribe({
        next: (saved) => {
          this.configs.update((items) =>
            this.withDefaults(items.map((item) => (item.moneda === saved.moneda ? saved : item))),
          );
          this.feedback.success(
            `Moneda ${saved.moneda} guardada. Tipo final: ${saved.tipoCambioVenta}.`,
          );
        },
        error: (error: unknown) => this.feedback.reportError(error),
      });
  }

  /** Tipo de cambio de venta = tipo base mas el margen configurado. */
  saleRate(base: number, margin: number): number {
    const rate = Number(base || 0) * (1 + Number(margin || 0) / 100);
    return Math.round(rate * CrmCurrencyStore.RATE_PRECISION) / CrmCurrencyStore.RATE_PRECISION;
  }

  /**
   * Monedas seleccionables en un formulario: la base del tenant, las activas y
   * -- si se indica -- la que el registro ya tenia aunque se haya desactivado,
   * para no perderla al editar.
   */
  selectableOptions(retainedCurrency?: string | null): { label: string; value: string }[] {
    const baseCode = this.baseCurrencyCode();
    const retainedCode = retainedCurrency?.toUpperCase();
    const options = [
      { label: `${baseCode} - Moneda base (${this.baseCurrencySymbol()})`, value: baseCode },
      ...this.configs()
        .filter(
          (currency) =>
            currency.moneda !== baseCode && (currency.activo || currency.moneda === retainedCode),
        )
        .map((currency) => ({
          label: `${currency.moneda} - ${currency.nombre} (${currency.simbolo})`,
          value: currency.moneda,
        })),
    ];
    return [...new Map(options.map((option) => [option.value, option])).values()];
  }

  /** Simbolo con el que prefijar un importe en la moneda indicada. */
  symbolFor(moneda: string | null | undefined): string {
    const currencyCode = (moneda || this.baseCurrencyCode()).toUpperCase();
    if (currencyCode === this.baseCurrencyCode()) {
      return this.baseCurrencySymbol();
    }
    return (
      this.configs().find((currency) => currency.moneda === currencyCode)?.simbolo ||
      ({ PEN: 'S/', USD: 'US$', EUR: '€' } as Record<string, string>)[currencyCode] ||
      currencyCode
    );
  }

  /**
   * Garantiza que las monedas estandar esten siempre presentes y que todas
   * lleven su tipo de venta recalculado.
   */
  private withDefaults(currencies: CrmCurrencyConfig[]): CrmCurrencyConfig[] {
    const configuredByCurrency = new Map(currencies.map((currency) => [currency.moneda, currency]));

    const standard = DEFAULT_CRM_CURRENCIES.map((fallback) => {
      const currency = { ...fallback, ...configuredByCurrency.get(fallback.moneda) };
      return {
        ...currency,
        tipoCambioVenta: this.saleRate(
          currency.tipoCambioBase,
          currency.margenConversionPorcentaje,
        ),
      };
    });

    const custom = currencies
      .filter(
        (currency) =>
          !DEFAULT_CRM_CURRENCIES.some((fallback) => fallback.moneda === currency.moneda),
      )
      .map((currency) => ({
        ...currency,
        tipoCambioVenta: this.saleRate(
          currency.tipoCambioBase,
          currency.margenConversionPorcentaje,
        ),
      }));

    return [...standard, ...custom].sort((left, right) => left.moneda.localeCompare(right.moneda));
  }
}
