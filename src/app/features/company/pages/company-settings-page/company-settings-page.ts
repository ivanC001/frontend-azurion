import {
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';

import { ApiUrlService } from '@core/api/api-url.service';
import { AuthSessionService } from '@core/auth/auth-session.service';
import { AdminSaasApiService, Empresa } from '@features/admin/data/admin-saas-api.service';
import {
  FacturadorApiService,
  FacturadorTenant,
} from '@features/facturador/data/facturador-api.service';

interface CompanyConfigForm {
  ruc: string;
  business_name: string;
  sunat_mode: 'beta' | 'production';
  ruc_sol: string;
  usuario_sol: string;
  direccion_fiscal: string;
  clave_sol: string;
  certificado_password: string;
  certificado_url: string;
  api_client_name: string;
  panel_logo_file: File | null;
  invoice_logo_file: File | null;
  certificado_file: File | null;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-company-settings-page',
  imports: [FormsModule, ButtonModule, InputTextModule, PasswordModule],
  templateUrl: './company-settings-page.html',
  styleUrl: './company-settings-page.scss',
})
export class CompanySettingsPage implements OnDestroy {
  private readonly companyApi = inject(AdminSaasApiService);
  private readonly facturadorApi = inject(FacturadorApiService);
  private readonly apiUrl = inject(ApiUrlService);
  private readonly session = inject(AuthSessionService);
  private readonly route = inject(ActivatedRoute);

  protected readonly settingsView: 'tenant' | 'facturador' =
    this.route.snapshot.data['settingsView'] === 'facturador' ? 'facturador' : 'tenant';
  protected readonly isFacturadorView = this.settingsView === 'facturador';
  protected readonly pageTitle = this.isFacturadorView
    ? 'Configuracion del facturador'
    : 'Configuracion del tenant';
  protected readonly pageDescription = this.isFacturadorView
    ? 'Configura SUNAT, certificado digital y el logo fiscal de los comprobantes.'
    : 'Administra la identidad y el logo del panel de tu empresa.';
  protected readonly saveLabel = this.isFacturadorView
    ? 'Guardar facturador'
    : 'Guardar tenant';

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly existingConfig = signal<FacturadorTenant | null>(null);
  protected readonly panelLogoPreviewUrl = signal<string | null>(null);
  protected readonly invoiceLogoPreviewUrl = signal<string | null>(null);
  protected readonly panelLogoLoadFailed = signal(false);
  protected readonly panelLogoSelectedFileName = signal<string | null>(null);
  protected readonly clearPanelLogoRequested = signal(false);
  protected readonly panelLogoDisplayUrl = computed(() =>
    this.panelLogoPreviewUrl() && !this.panelLogoLoadFailed()
      ? this.panelLogoPreviewUrl()!
      : 'assets/logosinfondo.png',
  );
  protected readonly panelLogoStatusLabel = computed(() => {
    if (this.panelLogoSelectedFileName()) {
      return 'Pendiente de guardar';
    }
    if (this.clearPanelLogoRequested()) {
      return 'Se quitara al guardar';
    }
    if (this.panelLogoLoadFailed()) {
      return 'No disponible';
    }
    return this.panelLogoPreviewUrl() ? 'Configurado' : 'Logo Azurion';
  });

  protected readonly sessionData = this.session.currentSession;
  protected readonly empresaContext = computed(() => this.sessionData()?.empresa ?? null);

  protected form: CompanyConfigForm = this.createEmptyForm();

  constructor() {
    const hasEmpresaContext = this.applyEmpresaIdentity();
    if (hasEmpresaContext) {
      this.loadCurrentConfig();
    }
  }

  ngOnDestroy(): void {
    this.revokeObjectUrl(this.panelLogoPreviewUrl());
    this.revokeObjectUrl(this.invoiceLogoPreviewUrl());
  }

  protected loadCurrentConfig(): void {
    if (!this.applyEmpresaIdentity()) {
      this.errorMessage.set('No se encontro una empresa asociada a tu sesion.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      empresa: this.companyApi.getCurrentEmpresa().pipe(catchError(() => of(null))),
      facturador: this.isFacturadorView
        ? this.facturadorApi
            .listTenants()
            .pipe(catchError(() => of({ total: 0, items: [] as readonly FacturadorTenant[] })))
        : of({ total: 0, items: [] as readonly FacturadorTenant[] }),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ empresa, facturador }) => {
          this.hydrateBrandingFromEmpresa(empresa);
          if (empresa) {
            this.session.updateEmpresaData({
              id: empresa.id,
              ruc: empresa.ruc,
              razonSocial: empresa.razonSocial,
              tenantId: empresa.tenantId,
              schemaName: empresa.schemaName,
              logoPanelUrl: this.apiUrl.publicFileUrl(empresa.logoPanelUrl),
              activo: empresa.activo,
            });
          }

          const existing = facturador.items.find((item) => item.ruc === this.form.ruc) ?? null;
          this.existingConfig.set(existing);
          if (!existing) {
            return;
          }

          this.hydrateFormFromTenant(existing);
          if (existing.tenant_id) {
            this.loadTenantDetail(existing.tenant_id);
          }
        },
        error: () =>
          this.errorMessage.set(
            this.isFacturadorView
              ? 'No se pudo cargar la configuracion actual del facturador.'
              : 'No se pudo cargar la configuracion actual del tenant.',
          ),
      });
  }

  protected save(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (!this.applyEmpresaIdentity()) {
      this.errorMessage.set('No se encontro una empresa asociada a tu sesion.');
      return;
    }
    if (!this.form.business_name.trim()) {
      this.errorMessage.set('Debes indicar la razon social.');
      return;
    }
    if (
      this.isFacturadorView &&
      this.form.sunat_mode === 'production' &&
      !this.form.certificado_file &&
      !this.form.certificado_url.trim() &&
      !this.existingConfig()?.certificado_url
    ) {
      this.errorMessage.set(
        'Para produccion debes adjuntar o conservar el archivo de firma digital.',
      );
      return;
    }

    if (this.isFacturadorView) {
      this.saveFacturadorSettings();
      return;
    }

    this.saveTenantSettings();
  }

  private saveTenantSettings(): void {
    this.saving.set(true);
    this.persistPanelBranding()
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (empresa) => {
          this.hydrateBrandingFromEmpresa(empresa);
          this.session.updateEmpresaData({ logoPanelUrl: this.apiUrl.publicFileUrl(empresa.logoPanelUrl) });
          this.form.panel_logo_file = null;
          this.panelLogoSelectedFileName.set(null);
          this.clearPanelLogoRequested.set(false);
          this.successMessage.set('Configuracion del tenant guardada correctamente.');
        },
        error: (error: unknown) =>
          this.errorMessage.set(
            this.resolveErrorMessage(error, 'No se pudo guardar la configuracion del tenant.'),
          ),
      });
  }

  private saveFacturadorSettings(): void {
    this.saving.set(true);
    this.persistFacturadorConfig()
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (tenant) => {
          this.existingConfig.set(tenant);
          this.form.clave_sol = '';
          this.form.invoice_logo_file = null;
          this.form.certificado_file = null;
          this.hydrateFormFromTenant(tenant);
          this.successMessage.set('Configuracion del facturador guardada correctamente.');
        },
        error: (error: unknown) =>
          this.errorMessage.set(
            this.resolveErrorMessage(error, 'No se pudo guardar la configuracion del facturador.'),
          ),
      });
  }

  protected onSunatModeToggle(isProduction: boolean): void {
    this.form.sunat_mode = isProduction ? 'production' : 'beta';
  }

  protected isProductionMode(): boolean {
    return this.form.sunat_mode === 'production';
  }

  protected onPanelLogoFileSelected(event: Event): void {
    this.handleLogoFileSelection(event, 'panel');
  }

  protected clearPanelLogoSelection(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.form.panel_logo_file = null;
    this.panelLogoSelectedFileName.set(null);
    this.clearPanelLogoRequested.set(true);
    this.panelLogoLoadFailed.set(false);
    this.setPanelLogoPreview(null, false);
  }

  protected handlePanelLogoError(event: Event): void {
    const current = this.panelLogoPreviewUrl();
    const failedUrl = event.target instanceof HTMLImageElement
      ? event.target.currentSrc || event.target.src
      : '';

    if (
      !current ||
      this.panelLogoDisplayUrl() === 'assets/logosinfondo.png' ||
      !this.sameBrowserUrl(failedUrl, current)
    ) {
      return;
    }

    this.panelLogoLoadFailed.set(true);
    this.errorMessage.set(
      current.startsWith('blob:')
        ? 'No se pudo previsualizar el archivo seleccionado. Usa una imagen PNG, JPG/JPEG o WEBP valida.'
        : 'El logo guardado no se pudo cargar. Sube un logo nuevo y guarda la configuracion.',
    );
  }

  protected onInvoiceLogoFileSelected(event: Event): void {
    this.handleLogoFileSelection(event, 'invoice');
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

  private persistPanelBranding() {
    return this.companyApi.updateCurrentEmpresaBranding({
      logoPanelFile: this.form.panel_logo_file,
      clearLogoPanel: this.clearPanelLogoRequested(),
    });
  }

  private persistFacturadorConfig() {
    const empresa = this.empresaContext();
    const empresaRuc = (empresa?.ruc || '').trim();
    const empresaRazonSocial = (empresa?.razonSocial || '').trim();

    const payload = {
      ruc: empresaRuc || this.form.ruc.trim(),
      business_name: this.form.business_name.trim() || empresaRazonSocial,
      sunat_mode: this.form.sunat_mode,
      ruc_sol: this.form.ruc_sol.trim() || empresaRuc || undefined,
      usuario_sol: this.form.usuario_sol.trim() || undefined,
      clave_sol: this.form.clave_sol || undefined,
      certificado_password: this.form.certificado_password || undefined,
      certificado_url: this.form.certificado_url.trim() || undefined,
      api_client_name: this.form.api_client_name.trim() || undefined,
      logo_file: this.form.invoice_logo_file,
      certificado_file: this.form.certificado_file,
    } as const;

    const existing = this.existingConfig();
    if (existing?.tenant_id) {
      return this.facturadorApi.updateTenant(existing.tenant_id, payload);
    }

    return this.facturadorApi.createTenant(payload);
  }

  private loadTenantDetail(tenantId: number): void {
    this.facturadorApi
      .getTenant(tenantId)
      .pipe(catchError(() => of(null)))
      .subscribe((tenant) => {
        if (!tenant) {
          return;
        }
        this.existingConfig.set(tenant);
        this.hydrateFormFromTenant(tenant);
      });
  }

  private hydrateBrandingFromEmpresa(empresa: Empresa | null): void {
    if (!empresa) {
      return;
    }

    this.panelLogoLoadFailed.set(false);
    this.panelLogoSelectedFileName.set(null);
    this.clearPanelLogoRequested.set(false);
    this.setPanelLogoPreview(this.apiUrl.publicFileUrl(empresa.logoPanelUrl), false);
  }

  private hydrateFormFromTenant(tenant: FacturadorTenant): void {
    this.applyEmpresaIdentity();
    this.form.sunat_mode = (tenant.sunat_mode || tenant.modo_sunat || 'beta') as
      | 'beta'
      | 'production';
    this.form.ruc_sol = tenant.ruc_sol || this.form.ruc_sol || this.form.ruc;
    this.form.usuario_sol = tenant.sol_usuario || this.form.usuario_sol;
    this.form.certificado_url = tenant.certificado_url || this.form.certificado_url;
    this.form.api_client_name = tenant.api_client_name || this.form.api_client_name;

    const logoUrl = (tenant.logo_pdf_url || '').trim();
    if (/^https?:\/\//i.test(logoUrl)) {
      this.setInvoiceLogoPreview(logoUrl, false);
    }
  }

  private handleLogoFileSelection(event: Event, type: 'panel' | 'invoice'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;

    if (!file) {
      if (type === 'panel') {
        this.form.panel_logo_file = null;
        this.panelLogoSelectedFileName.set(null);
      } else {
        this.form.invoice_logo_file = null;
      }
      return;
    }

    if (!this.isValidLogoFile(file)) {
      if (type === 'panel') {
        this.form.panel_logo_file = null;
        this.panelLogoSelectedFileName.set(null);
      } else {
        this.form.invoice_logo_file = null;
      }
      input.value = '';
      this.errorMessage.set('Logo invalido. Usa PNG, JPG, JPEG o WEBP (maximo 2 MB).');
      return;
    }

    const preview = URL.createObjectURL(file);
    if (type === 'panel') {
      this.form.panel_logo_file = file;
      this.panelLogoSelectedFileName.set(file.name);
      this.clearPanelLogoRequested.set(false);
      this.panelLogoLoadFailed.set(false);
      this.setPanelLogoPreview(preview, true);
      return;
    }

    this.form.invoice_logo_file = file;
    this.setInvoiceLogoPreview(preview, true);
  }

  private createEmptyForm(): CompanyConfigForm {
    return {
      ruc: '',
      business_name: '',
      sunat_mode: 'beta',
      ruc_sol: '',
      usuario_sol: '',
      direccion_fiscal: '',
      clave_sol: '',
      certificado_password: '',
      certificado_url: '',
      api_client_name: 'default-client',
      panel_logo_file: null,
      invoice_logo_file: null,
      certificado_file: null,
    };
  }

  private isValidLogoFile(file: File): boolean {
    const maxBytes = 2 * 1024 * 1024;
    const allowedMimeTypes = new Set([
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
    ]);
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
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

  private setPanelLogoPreview(url: string | null, isObjectUrl: boolean): void {
    const current = this.panelLogoPreviewUrl();
    this.revokeObjectUrl(current);
    this.panelLogoPreviewUrl.set(url);

    if (!isObjectUrl) {
      return;
    }
  }

  private setInvoiceLogoPreview(url: string, isObjectUrl: boolean): void {
    const current = this.invoiceLogoPreviewUrl();
    this.revokeObjectUrl(current);
    this.invoiceLogoPreviewUrl.set(url);

    if (!isObjectUrl) {
      return;
    }
  }

  private revokeObjectUrl(value: string | null): void {
    if (value && value.startsWith('blob:')) {
      URL.revokeObjectURL(value);
    }
  }

  private sameBrowserUrl(left: string, right: string): boolean {
    if (!left || !right) {
      return false;
    }

    if (typeof window === 'undefined') {
      return left === right;
    }

    try {
      return new URL(left, window.location.href).href === new URL(right, window.location.href).href;
    } catch {
      return left === right;
    }
  }

  private applyEmpresaIdentity(): boolean {
    const empresa = this.empresaContext();
    const ruc = (empresa?.ruc || '').trim();

    if (!/^[0-9]{11}$/.test(ruc)) {
      return false;
    }

    this.form.ruc = ruc;
    if (!this.form.business_name.trim()) {
      this.form.business_name = (empresa?.razonSocial || '').trim();
    }
    if (!this.form.ruc_sol.trim()) {
      this.form.ruc_sol = ruc;
    }

    return true;
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const httpError = error as { error?: { message?: string; details?: string[] } };
      return httpError.error?.details?.[0] || httpError.error?.message || fallback;
    }

    return fallback;
  }
}
