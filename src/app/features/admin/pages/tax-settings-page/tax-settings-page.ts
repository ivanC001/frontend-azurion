import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import { UiToastService } from '@core/services/ui-toast.service';
import { AdminSaasApiService } from '../../data/admin-saas-api.service';

interface TaxSettingsForm {
  tipoOperacionDefaultId: string;
  tipoAfectacionDefaultId: string;
  tributoDefaultId: string;
  porcentajeIgvDefault: number;
  monedaDefault: string;
  estado: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-tax-settings-page',
  imports: [FormsModule, ButtonModule, InputTextModule, SelectModule],
  templateUrl: './tax-settings-page.html',
  styleUrl: './tax-settings-page.scss',
})
export class TaxSettingsPage {
  private readonly api = inject(AdminSaasApiService);
  private readonly toast = inject(UiToastService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected form: TaxSettingsForm = {
    tipoOperacionDefaultId: '0101',
    tipoAfectacionDefaultId: '10',
    tributoDefaultId: '1000',
    porcentajeIgvDefault: 18,
    monedaDefault: 'PEN',
    estado: 'ACTIVO',
  };

  protected readonly operationOptions = [
    { label: '0101 - Venta interna', value: '0101' },
    { label: '0200 - Exportacion', value: '0200' },
  ];
  protected readonly afectacionOptions = [
    { label: '10 - Gravado', value: '10' },
    { label: '20 - Exonerado', value: '20' },
    { label: '30 - Inafecto', value: '30' },
    { label: '40 - Exportacion', value: '40' },
  ];
  protected readonly tributoOptions = [
    { label: '1000 - IGV', value: '1000' },
    { label: '9997 - Exonerado', value: '9997' },
    { label: '9998 - Inafecto', value: '9998' },
  ];
  protected readonly monedaOptions = [
    { label: 'PEN - Sol peruano', value: 'PEN' },
    { label: 'USD - Dolar estadounidense', value: 'USD' },
  ];

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.api
      .getConfiguracionTributaria()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (config) => (this.form = { ...config }),
        error: (error: unknown) => this.toast.error(this.resolveError(error)),
      });
  }

  protected onAfectacionChange(value: string): void {
    if (value === '20') {
      this.form.tributoDefaultId = '9997';
      this.form.porcentajeIgvDefault = 0;
    } else if (value === '30') {
      this.form.tributoDefaultId = '9998';
      this.form.porcentajeIgvDefault = 0;
    } else if (value === '10' && this.form.porcentajeIgvDefault === 0) {
      this.form.tributoDefaultId = '1000';
      this.form.porcentajeIgvDefault = 18;
    }
  }

  protected save(): void {
    const porcentaje = Number(this.form.porcentajeIgvDefault);
    if (Number.isNaN(porcentaje) || porcentaje < 0 || porcentaje > 100) {
      this.toast.warn('El porcentaje debe estar entre 0 y 100.');
      return;
    }
    this.saving.set(true);
    this.api
      .updateConfiguracionTributaria({ ...this.form, porcentajeIgvDefault: porcentaje })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (config) => {
          this.form = { ...config };
          this.toast.success('La configuracion se aplicara automaticamente en las nuevas ventas.');
        },
        error: (error: unknown) => this.toast.error(this.resolveError(error)),
      });
  }

  private resolveError(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const apiError = (error as { error?: { message?: string; details?: string[] } }).error;
      return apiError?.details?.[0] || apiError?.message || 'No se pudo completar la operacion.';
    }
    return 'No se pudo completar la operacion.';
  }
}
