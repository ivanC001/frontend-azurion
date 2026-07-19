import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import {
  CreateFacturadorTenantRequest,
  FacturadorApiService,
  FacturadorTenant,
  FacturadorTenantDetail,
} from '../../data/facturador-api.service';

type SunatMode = 'beta' | 'production';
type Severity = 'success' | 'info' | 'warn' | 'danger';

interface FacturadorTenantForm {
  ruc: string;
  business_name: string;
  sunat_mode: SunatMode;
  api_client_name: string;
  ruc_sol: string;
  usuario_sol: string;
  clave_sol: string;
  certificado_password: string;
  certificado_url: string;
  logo_pdf_url: string;
  logo_file: File | null;
  certificado_file: File | null;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-facturador-companies-page',
  imports: [
    FormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    PasswordModule,
    SelectModule,
    TableModule,
    TagModule,
    TooltipModule,
  ],
  templateUrl: './facturador-companies-page.html',
  styleUrl: './facturador-companies-page.scss',
})
export class FacturadorCompaniesPage {
  private readonly facturadorApi = inject(FacturadorApiService);
  private readonly router = inject(Router);

  protected readonly tenants = signal<FacturadorTenant[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly detailLoading = signal(false);
  protected readonly detailVisible = signal(false);
  protected readonly apiKeyVisible = signal(false);
  protected readonly logoVisible = signal(false);
  protected readonly selectedTenantDetail = signal<FacturadorTenantDetail | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly lastCreated = signal<FacturadorTenant | null>(null);

  protected form: FacturadorTenantForm = this.createEmptyForm();

  protected readonly activeTenants = computed(
    () => this.tenants().filter((tenant) => tenant.is_active !== false).length,
  );

  protected readonly betaTenants = computed(
    () =>
      this.tenants().filter((tenant) => (tenant.sunat_mode || tenant.modo_sunat) === 'beta').length,
  );

  protected readonly sunatModeOptions = [
    { label: 'Beta SUNAT', value: 'beta' },
    { label: 'Produccion SUNAT', value: 'production' },
  ];

  constructor() {
    this.loadTenants();
  }

  protected loadTenants(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.facturadorApi
      .listTenants()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => this.tenants.set([...response.items]),
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected saveTenant(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.lastCreated.set(null);

    if (!this.isValidForm()) {
      this.errorMessage.set('Completa RUC y razon social. El RUC debe tener 11 digitos.');
      return;
    }

    if (!this.hasLogoConfigured()) {
      this.errorMessage.set(
        'Debes registrar el logo de la empresa (archivo o URL) para crear el tenant.',
      );
      return;
    }

    if (this.form.sunat_mode === 'production' && !this.form.certificado_file) {
      this.errorMessage.set(
        'En modo production debes adjuntar el archivo de firma digital (.pem, .pfx o .p12).',
      );
      return;
    }

    const request = this.buildRequest();

    this.saving.set(true);
    this.facturadorApi
      .createTenant(request)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (tenant) => {
          this.lastCreated.set(tenant);
          this.successMessage.set(
            tenant.already_exists
              ? 'La empresa ya existia en facturador. Se recupero su configuracion.'
              : 'Empresa registrada correctamente en facturador.',
          );
          this.form = this.createEmptyForm();
          this.loadTenants();
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected openTenantDetail(tenant: FacturadorTenant): void {
    this.loadTenantDetailAndOpenModal(tenant, 'detail');
  }

  protected openTenantApiKey(tenant: FacturadorTenant): void {
    this.loadTenantDetailAndOpenModal(tenant, 'apikey');
  }

  protected openTenantLogo(tenant: FacturadorTenant): void {
    this.loadTenantDetailAndOpenModal(tenant, 'logo');
  }

  protected openSeriesConfig(tenant: FacturadorTenant): void {
    void this.router.navigate(['/admin/facturador/configuracion'], {
      queryParams: { tenantId: tenant.tenant_id },
    });
  }

  protected openSeriesConfigFirst(): void {
    const tenant = this.lastCreated() ?? this.tenants()[0];
    if (!tenant) {
      return;
    }
    this.openSeriesConfig(tenant);
  }

  protected modeSeverity(mode?: string): Severity {
    if (mode === 'production') {
      return 'success';
    }
    if (mode === 'beta') {
      return 'warn';
    }
    return 'info';
  }

  protected activeSeverity(active?: boolean): 'success' | 'danger' {
    return active === false ? 'danger' : 'success';
  }

  protected copyApiKey(): void {
    const apiKey = this.lastCreated()?.api_key;
    if (!apiKey) {
      return;
    }

    void navigator.clipboard.writeText(apiKey);
    this.successMessage.set('API key copiada al portapapeles.');
  }

  protected copyDetailApiKey(): void {
    const apiKey =
      this.selectedTenantDetail()?.api_key || this.selectedTenantDetail()?.configuracion?.token_api;
    if (!apiKey) {
      this.errorMessage.set('No hay API key disponible para este tenant.');
      return;
    }

    void navigator.clipboard.writeText(apiKey);
    this.successMessage.set('API key del tenant copiada al portapapeles.');
  }

  protected tenantLogoValue(tenant: FacturadorTenantDetail | null): string {
    if (!tenant) {
      return '-';
    }
    return tenant.configuracion?.logo_pdf_url || tenant.logo_pdf_url || '-';
  }

  protected hasTenantLogo(tenant: FacturadorTenantDetail | null): boolean {
    const value = this.tenantLogoValue(tenant);
    return value !== '-';
  }

  protected selectedTenantApiKey(): string {
    const value =
      this.selectedTenantDetail()?.api_key || this.selectedTenantDetail()?.configuracion?.token_api;
    return value || 'No disponible';
  }

  protected isHttpUrl(value: string | null): boolean {
    if (!value) {
      return false;
    }
    return /^https?:\/\//i.test(value.trim());
  }

  protected onLogoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;

    if (!file) {
      this.form.logo_file = null;
      return;
    }

    if (!this.isValidLogoFile(file)) {
      this.form.logo_file = null;
      input.value = '';
      this.errorMessage.set('Logo invalido. Usa PNG, JPG, JPEG, WEBP o SVG (maximo 2 MB).');
      return;
    }

    this.form.logo_file = file;
  }

  protected onCertificateFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;

    if (!file) {
      this.form.certificado_file = null;
      return;
    }

    if (!this.isValidCertificateFile(file)) {
      this.form.certificado_file = null;
      input.value = '';
      this.errorMessage.set('Certificado invalido. Usa .pem, .pfx o .p12 (maximo 5 MB).');
      return;
    }

    this.form.certificado_file = file;
  }

  private buildRequest(): CreateFacturadorTenantRequest {
    const request: CreateFacturadorTenantRequest = {
      ruc: this.form.ruc.trim(),
      business_name: this.form.business_name.trim(),
      sunat_mode: this.form.sunat_mode,
      api_client_name: this.form.api_client_name.trim() || undefined,
      ruc_sol: this.form.ruc_sol.trim() || undefined,
      usuario_sol: this.form.usuario_sol.trim() || undefined,
      clave_sol: this.form.clave_sol || undefined,
      certificado_password: this.form.certificado_password || undefined,
      certificado_url: this.form.certificado_url.trim() || undefined,
      logo_pdf_url: this.form.logo_pdf_url.trim() || undefined,
      logo_file: this.form.logo_file,
      certificado_file: this.form.certificado_file,
    };

    return request;
  }

  private isValidForm(): boolean {
    return /^[0-9]{11}$/.test(this.form.ruc.trim()) && this.form.business_name.trim().length > 0;
  }

  private hasLogoConfigured(): boolean {
    return !!this.form.logo_file || this.form.logo_pdf_url.trim().length > 0;
  }

  private createEmptyForm(): FacturadorTenantForm {
    return {
      ruc: '',
      business_name: '',
      sunat_mode: 'beta',
      api_client_name: 'default-client',
      ruc_sol: '',
      usuario_sol: '',
      clave_sol: '',
      certificado_password: '',
      certificado_url: '',
      logo_pdf_url: '',
      logo_file: null,
      certificado_file: null,
    };
  }

  private resolveError(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const httpError = error as {
        status?: number;
        error?: { message?: string; context?: unknown };
      };
      if (httpError.status === 0) {
        return 'No se pudo conectar con el servicio de facturacion. Intenta nuevamente.';
      }

      const backendMessage = httpError.error?.message?.trim() || '';
      const normalizedMessage = backendMessage.toLowerCase();
      if (
        normalizedMessage.includes('authentication required') ||
        normalizedMessage.includes('invalid jwt token') ||
        normalizedMessage.includes('invalid api key')
      ) {
        return 'No se pudo completar la operacion en el servicio de facturacion.';
      }

      return httpError.error?.message || 'No se pudo completar la operacion en el facturador.';
    }

    return 'No se pudo completar la operacion en el facturador.';
  }

  private isValidLogoFile(file: File): boolean {
    const maxBytes = 2 * 1024 * 1024;
    const allowedMimeTypes = new Set([
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'image/svg+xml',
    ]);
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];
    const lowerName = file.name.toLowerCase();
    const hasAllowedExtension = allowedExtensions.some((extension) =>
      lowerName.endsWith(extension),
    );
    const hasAllowedMime = allowedMimeTypes.has(file.type.toLowerCase());

    return file.size <= maxBytes && (hasAllowedMime || hasAllowedExtension);
  }

  private isValidCertificateFile(file: File): boolean {
    const maxBytes = 5 * 1024 * 1024;
    const allowedMimeTypes = new Set([
      'application/x-pkcs12',
      'application/pkcs12',
      'application/octet-stream',
      'application/x-pem-file',
      'text/plain',
    ]);
    const allowedExtensions = ['.pem', '.pfx', '.p12'];
    const lowerName = file.name.toLowerCase();
    const hasAllowedExtension = allowedExtensions.some((extension) =>
      lowerName.endsWith(extension),
    );
    const mime = file.type?.toLowerCase?.() ?? '';
    const hasAllowedMime = mime === '' || allowedMimeTypes.has(mime);

    return file.size <= maxBytes && hasAllowedExtension && hasAllowedMime;
  }

  private loadTenantDetailAndOpenModal(
    tenant: FacturadorTenant,
    modal: 'detail' | 'apikey' | 'logo',
  ): void {
    this.detailLoading.set(true);
    this.selectedTenantDetail.set(null);
    this.errorMessage.set(null);
    this.detailVisible.set(false);
    this.apiKeyVisible.set(false);
    this.logoVisible.set(false);

    this.facturadorApi
      .getTenant(tenant.tenant_id)
      .pipe(finalize(() => this.detailLoading.set(false)))
      .subscribe({
        next: (detail) => {
          this.selectedTenantDetail.set(detail);
          if (modal === 'detail') {
            this.detailVisible.set(true);
            return;
          }
          if (modal === 'apikey') {
            this.apiKeyVisible.set(true);
            return;
          }
          this.logoVisible.set(true);
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.resolveError(error));
        },
      });
  }
}
