import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import {
  CreateFacturadorTenantRequest,
  FacturadorApiService,
  FacturadorTenant,
  FacturadorTenantDetail,
} from '../../data/facturador-api.service';

interface SeriesForm {
  serie_factura: string;
  serie_boleta: string;
  serie_nc: string;
  serie_nd: string;
  serie_guia: string;
  igv: number;
  moneda: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-facturador-config-page',
  imports: [FormsModule, ButtonModule, DialogModule, InputTextModule, TableModule, TagModule],
  templateUrl: './facturador-config-page.html',
  styleUrl: './facturador-config-page.scss',
})
export class FacturadorConfigPage {
  private static readonly DEFAULT_SERIE_FACTURA = 'F001';
  private static readonly DEFAULT_SERIE_BOLETA = 'B001';
  private static readonly DEFAULT_SERIE_NC = 'FC01';
  private static readonly DEFAULT_SERIE_ND = 'FD01';
  private static readonly DEFAULT_SERIE_GUIA = 'T001';
  private static readonly DEFAULT_IGV = 18;
  private static readonly DEFAULT_MONEDA = 'PEN';
  private static readonly DEFAULT_CORRELATIVO = '00000000';

  private readonly facturadorApi = inject(FacturadorApiService);
  private readonly route = inject(ActivatedRoute);
  private pendingTenantIdFromUrl: number | null = null;

  protected readonly tenants = signal<FacturadorTenant[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly detailLoading = signal(false);
  protected readonly editVisible = signal(false);
  protected readonly selectedTenantDetail = signal<FacturadorTenantDetail | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected form: SeriesForm = this.createEmptyForm();

  protected readonly previewSeries = computed(() => ({
    factura: `${this.normalizeSerie(this.form.serie_factura, FacturadorConfigPage.DEFAULT_SERIE_FACTURA)}-${FacturadorConfigPage.DEFAULT_CORRELATIVO}`,
    boleta: `${this.normalizeSerie(this.form.serie_boleta, FacturadorConfigPage.DEFAULT_SERIE_BOLETA)}-${FacturadorConfigPage.DEFAULT_CORRELATIVO}`,
    nc: `${this.normalizeSerie(this.form.serie_nc, FacturadorConfigPage.DEFAULT_SERIE_NC)}-${FacturadorConfigPage.DEFAULT_CORRELATIVO}`,
    nd: `${this.normalizeSerie(this.form.serie_nd, FacturadorConfigPage.DEFAULT_SERIE_ND)}-${FacturadorConfigPage.DEFAULT_CORRELATIVO}`,
    guia: `${this.normalizeSerie(this.form.serie_guia, FacturadorConfigPage.DEFAULT_SERIE_GUIA)}-${FacturadorConfigPage.DEFAULT_CORRELATIVO}`,
  }));

  constructor() {
    this.pendingTenantIdFromUrl = this.parseTenantId(
      this.route.snapshot.queryParamMap.get('tenantId'),
    );
    this.loadTenants();

    this.route.queryParamMap.subscribe((params) => {
      const tenantId = this.parseTenantId(params.get('tenantId'));
      this.pendingTenantIdFromUrl = tenantId;
      if (!tenantId || this.loading()) {
        return;
      }

      const tenant = this.tenants().find((item) => item.tenant_id === tenantId);
      if (tenant) {
        this.openEditModal(tenant);
      }
    });
  }

  protected loadTenants(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.facturadorApi
      .listTenants()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          const items = [...response.items];
          this.tenants.set(items);
          this.openPendingTenantFromUrl(items);
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected openEditModal(tenant: FacturadorTenant): void {
    this.detailLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.facturadorApi
      .getTenant(tenant.tenant_id)
      .pipe(finalize(() => this.detailLoading.set(false)))
      .subscribe({
        next: (detail) => {
          this.selectedTenantDetail.set(detail);
          this.form = this.formFromTenantDetail(detail);
          this.editVisible.set(true);
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected saveConfig(): void {
    const detail = this.selectedTenantDetail();
    if (!detail) {
      this.errorMessage.set('Selecciona un tenant para guardar su configuracion.');
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);

    const payload = this.buildUpdateRequest(detail);

    this.saving.set(true);
    this.facturadorApi
      .updateTenant(detail.tenant_id, payload)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set('Series y parametros de emision actualizados correctamente.');
          this.editVisible.set(false);
          this.loadTenants();
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected modeTag(mode?: string | null): 'success' | 'warn' | 'info' {
    if (mode === 'production') {
      return 'success';
    }
    if (mode === 'beta') {
      return 'warn';
    }
    return 'info';
  }

  private openPendingTenantFromUrl(items: readonly FacturadorTenant[]): void {
    if (!this.pendingTenantIdFromUrl) {
      return;
    }
    const tenant = items.find((item) => item.tenant_id === this.pendingTenantIdFromUrl);
    this.pendingTenantIdFromUrl = null;
    if (tenant) {
      this.openEditModal(tenant);
    }
  }

  private parseTenantId(raw: string | null): number | null {
    if (!raw) {
      return null;
    }
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  }

  private formFromTenantDetail(detail: FacturadorTenantDetail): SeriesForm {
    return {
      serie_factura: this.normalizeSerie(
        detail.configuracion?.serie_factura || detail.serie_factura || '',
        FacturadorConfigPage.DEFAULT_SERIE_FACTURA,
      ),
      serie_boleta: this.normalizeSerie(
        detail.configuracion?.serie_boleta || detail.serie_boleta || '',
        FacturadorConfigPage.DEFAULT_SERIE_BOLETA,
      ),
      serie_nc: this.normalizeSerie(
        detail.configuracion?.serie_nc || detail.serie_nc || '',
        FacturadorConfigPage.DEFAULT_SERIE_NC,
      ),
      serie_nd: this.normalizeSerie(
        detail.configuracion?.serie_nd || detail.serie_nd || '',
        FacturadorConfigPage.DEFAULT_SERIE_ND,
      ),
      serie_guia: this.normalizeSerie(
        detail.configuracion?.serie_guia || detail.serie_guia || '',
        FacturadorConfigPage.DEFAULT_SERIE_GUIA,
      ),
      igv: Number(detail.configuracion?.igv ?? detail.igv ?? FacturadorConfigPage.DEFAULT_IGV),
      moneda: (detail.configuracion?.moneda || detail.moneda || FacturadorConfigPage.DEFAULT_MONEDA)
        .trim()
        .toUpperCase(),
    };
  }

  private buildUpdateRequest(detail: FacturadorTenantDetail): CreateFacturadorTenantRequest {
    return {
      ruc: detail.ruc.trim(),
      business_name: (detail.business_name || '').trim() || 'Empresa',
      sunat_mode: (detail.sunat_mode || detail.modo_sunat || 'beta') as 'beta' | 'production',
      api_client_name: detail.api_client_name || undefined,
      ruc_sol: detail.ruc_sol || detail.configuracion?.ruc_sol || undefined,
      usuario_sol: detail.sol_usuario || detail.configuracion?.usuario_sol || undefined,
      certificado_url: detail.certificado_url || detail.configuracion?.certificado_url || undefined,
      logo_pdf_url: detail.logo_pdf_url || detail.configuracion?.logo_pdf_url || undefined,
      serie_factura: this.normalizeSerie(
        this.form.serie_factura,
        FacturadorConfigPage.DEFAULT_SERIE_FACTURA,
      ),
      serie_boleta: this.normalizeSerie(
        this.form.serie_boleta,
        FacturadorConfigPage.DEFAULT_SERIE_BOLETA,
      ),
      serie_nc: this.normalizeSerie(this.form.serie_nc, FacturadorConfigPage.DEFAULT_SERIE_NC),
      serie_nd: this.normalizeSerie(this.form.serie_nd, FacturadorConfigPage.DEFAULT_SERIE_ND),
      serie_guia: this.normalizeSerie(
        this.form.serie_guia,
        FacturadorConfigPage.DEFAULT_SERIE_GUIA,
      ),
      igv: Number.isFinite(this.form.igv) ? this.form.igv : FacturadorConfigPage.DEFAULT_IGV,
      moneda: this.form.moneda.trim().toUpperCase() || FacturadorConfigPage.DEFAULT_MONEDA,
    };
  }

  private normalizeSerie(rawValue: string, fallback: string): string {
    const normalized = rawValue.trim().toUpperCase();
    if (!normalized) {
      return fallback;
    }
    return normalized.slice(0, 10);
  }

  private createEmptyForm(): SeriesForm {
    return {
      serie_factura: FacturadorConfigPage.DEFAULT_SERIE_FACTURA,
      serie_boleta: FacturadorConfigPage.DEFAULT_SERIE_BOLETA,
      serie_nc: FacturadorConfigPage.DEFAULT_SERIE_NC,
      serie_nd: FacturadorConfigPage.DEFAULT_SERIE_ND,
      serie_guia: FacturadorConfigPage.DEFAULT_SERIE_GUIA,
      igv: FacturadorConfigPage.DEFAULT_IGV,
      moneda: FacturadorConfigPage.DEFAULT_MONEDA,
    };
  }

  private resolveError(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const httpError = error as { status?: number; error?: { message?: string } };
      if (httpError.status === 0) {
        return 'No se pudo conectar con el servicio de facturacion. Intenta nuevamente.';
      }
      return httpError.error?.message || 'No se pudo completar la operacion en facturador.';
    }
    return 'No se pudo completar la operacion en facturador.';
  }
}
