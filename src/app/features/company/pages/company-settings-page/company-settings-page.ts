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
import { catchError, finalize, forkJoin, of, switchMap } from 'rxjs';
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
  fiscal_document_type: string;
  trade_name: string;
  country_code: string;
  country_name: string;
  fiscal_address: string;
  district: string;
  province: string;
  department: string;
  primary_email: string;
  phone: string;
  mobile: string;
  website: string;
  facebook: string;
  instagram: string;
  legal_representative_name: string;
  legal_representative_document_type: string;
  legal_representative_document: string;
  legal_representative_role: string;
  legal_representative_email: string;
  legal_representative_phone: string;
  timezone: string;
  language: string;
  date_format: string;
  time_format: string;
  currency_code: string;
  currency_symbol: string;
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
    : 'Administra la identidad, contacto, representante legal y configuracion regional de tu empresa.';
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

  protected readonly countryOptions = [
    { code: 'PE', name: 'Peru', document: 'RUC', currency: 'PEN', symbol: 'S/', timezone: 'America/Lima', language: 'es-PE' },
    { code: 'AR', name: 'Argentina', document: 'CUIT', currency: 'ARS', symbol: '$', timezone: 'America/Argentina/Buenos_Aires', language: 'es-AR' },
    { code: 'BO', name: 'Bolivia', document: 'NIT', currency: 'BOB', symbol: 'Bs', timezone: 'America/La_Paz', language: 'es-BO' },
    { code: 'BR', name: 'Brasil', document: 'CNPJ', currency: 'BRL', symbol: 'R$', timezone: 'America/Sao_Paulo', language: 'pt-BR' },
    { code: 'CA', name: 'Canada', document: 'BN', currency: 'CAD', symbol: 'C$', timezone: 'America/Toronto', language: 'en-CA' },
    { code: 'CL', name: 'Chile', document: 'RUT', currency: 'CLP', symbol: '$', timezone: 'America/Santiago', language: 'es-CL' },
    { code: 'CO', name: 'Colombia', document: 'NIT', currency: 'COP', symbol: '$', timezone: 'America/Bogota', language: 'es-CO' },
    { code: 'CR', name: 'Costa Rica', document: 'CEDULA', currency: 'CRC', symbol: 'CRC', timezone: 'America/Costa_Rica', language: 'es-CR' },
    { code: 'EC', name: 'Ecuador', document: 'RUC', currency: 'USD', symbol: '$', timezone: 'America/Guayaquil', language: 'es-EC' },
    { code: 'ES', name: 'Espana', document: 'NIF', currency: 'EUR', symbol: 'EUR', timezone: 'Europe/Madrid', language: 'es-ES' },
    { code: 'US', name: 'Estados Unidos', document: 'EIN', currency: 'USD', symbol: '$', timezone: 'America/New_York', language: 'en-US' },
    { code: 'FR', name: 'Francia', document: 'TVA', currency: 'EUR', symbol: 'EUR', timezone: 'Europe/Paris', language: 'fr-FR' },
    { code: 'GT', name: 'Guatemala', document: 'NIT', currency: 'GTQ', symbol: 'Q', timezone: 'America/Guatemala', language: 'es-GT' },
    { code: 'MX', name: 'Mexico', document: 'RFC', currency: 'MXN', symbol: '$', timezone: 'America/Mexico_City', language: 'es-MX' },
    { code: 'PA', name: 'Panama', document: 'RUC', currency: 'USD', symbol: '$', timezone: 'America/Panama', language: 'es-PA' },
    { code: 'PY', name: 'Paraguay', document: 'RUC', currency: 'PYG', symbol: 'Gs.', timezone: 'America/Asuncion', language: 'es-PY' },
    { code: 'DO', name: 'Republica Dominicana', document: 'RNC', currency: 'DOP', symbol: 'RD$', timezone: 'America/Santo_Domingo', language: 'es-DO' },
    { code: 'GB', name: 'Reino Unido', document: 'VAT', currency: 'GBP', symbol: 'GBP', timezone: 'Europe/London', language: 'en-GB' },
    { code: 'UY', name: 'Uruguay', document: 'RUT', currency: 'UYU', symbol: '$U', timezone: 'America/Montevideo', language: 'es-UY' },
    { code: 'VE', name: 'Venezuela', document: 'RIF', currency: 'VES', symbol: 'Bs', timezone: 'America/Caracas', language: 'es-VE' },
  ] as const;
  protected readonly fiscalDocumentOptions = ['RUC', 'NIT', 'RFC', 'RUT', 'CUIT', 'CNPJ', 'EIN', 'NIF', 'VAT', 'RNC', 'RIF', 'BN', 'OTRO'];
  protected readonly representativeDocumentOptions = ['DNI', 'CE', 'PASAPORTE', 'NATIONAL ID', 'OTRO'];
  protected readonly timezoneOptions = [...new Set(this.countryOptions.map((country) => country.timezone))];
  protected readonly languageOptions = [
    { value: 'es-PE', label: 'Espanol (Peru)' },
    { value: 'es-MX', label: 'Espanol (Mexico)' },
    { value: 'es-CO', label: 'Espanol (Colombia)' },
    { value: 'es-AR', label: 'Espanol (Argentina)' },
    { value: 'es-CL', label: 'Espanol (Chile)' },
    { value: 'es-ES', label: 'Espanol (Espana)' },
    { value: 'en-US', label: 'English (US)' },
    { value: 'en-CA', label: 'English (Canada)' },
    { value: 'en-GB', label: 'English (UK)' },
    { value: 'pt-BR', label: 'Portugues (Brasil)' },
    { value: 'fr-FR', label: 'Francais (France)' },
  ] as const;
  protected readonly currencyOptions = [...new Map(this.countryOptions.map((country) => [country.currency, { code: country.currency, symbol: country.symbol }])).values()];

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
          this.hydrateCompanyFromEmpresa(empresa);
          if (empresa) {
            this.session.updateEmpresaData({
              id: empresa.id,
              ruc: empresa.ruc,
              razonSocial: empresa.razonSocial,
              tipoDocumentoFiscal: empresa.tipoDocumentoFiscal,
              nombreComercial: empresa.nombreComercial,
              paisCodigo: empresa.paisCodigo,
              paisNombre: empresa.paisNombre,
              zonaHoraria: empresa.zonaHoraria,
              idioma: empresa.idioma,
              formatoFecha: empresa.formatoFecha,
              formatoHora: empresa.formatoHora,
              monedaCodigo: empresa.monedaCodigo,
              monedaSimbolo: empresa.monedaSimbolo,
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
    if (!this.isValidInternationalProfile()) {
      this.errorMessage.set('Completa el identificador fiscal, pais, zona horaria, idioma y moneda con valores validos.');
      return;
    }
    if (
      this.isFacturadorView &&
      (this.form.country_code !== 'PE' || !/^\d{11}$/.test(this.form.ruc.trim()))
    ) {
      this.errorMessage.set(
        'La configuracion SUNAT solo esta disponible para empresas de Peru con RUC de 11 digitos.',
      );
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
    this.companyApi
      .updateCurrentEmpresaProfile(this.buildProfileRequest())
      .pipe(
        switchMap((profile) =>
          this.form.panel_logo_file || this.clearPanelLogoRequested()
            ? this.persistPanelBranding()
            : of(profile),
        ),
      )
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (empresa) => {
          this.hydrateCompanyFromEmpresa(empresa);
          this.session.updateEmpresaData({
            ruc: empresa.ruc,
            razonSocial: empresa.razonSocial,
            tipoDocumentoFiscal: empresa.tipoDocumentoFiscal,
            nombreComercial: empresa.nombreComercial,
            paisCodigo: empresa.paisCodigo,
            paisNombre: empresa.paisNombre,
            zonaHoraria: empresa.zonaHoraria,
            idioma: empresa.idioma,
            formatoFecha: empresa.formatoFecha,
            formatoHora: empresa.formatoHora,
            monedaCodigo: empresa.monedaCodigo,
            monedaSimbolo: empresa.monedaSimbolo,
            logoPanelUrl: this.apiUrl.publicFileUrl(empresa.logoPanelUrl),
          });
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

  protected onCountryChanged(countryCode: string): void {
    const country = this.countryOptions.find((item) => item.code === countryCode);
    if (!country) {
      return;
    }
    this.form.country_code = country.code;
    this.form.country_name = country.name;
    this.form.fiscal_document_type = country.document;
    this.form.currency_code = country.currency;
    this.form.currency_symbol = country.symbol;
    this.form.timezone = country.timezone;
    this.form.language = country.language;
  }

  protected onCurrencyChanged(currencyCode: string): void {
    this.form.currency_code = currencyCode;
    const currency = this.currencyOptions.find((item) => item.code === currencyCode);
    if (currency) {
      this.form.currency_symbol = currency.symbol;
    }
  }

  protected fiscalIdLabel(): string {
    return this.form.fiscal_document_type || 'Identificador fiscal';
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

  private buildProfileRequest() {
    return {
      ruc: this.form.ruc.trim().toUpperCase(),
      razonSocial: this.form.business_name.trim(),
      tipoDocumentoFiscal: this.form.fiscal_document_type.trim().toUpperCase(),
      nombreComercial: this.optional(this.form.trade_name),
      direccionFiscal: this.optional(this.form.fiscal_address),
      distrito: this.optional(this.form.district),
      provincia: this.optional(this.form.province),
      departamento: this.optional(this.form.department),
      paisCodigo: this.form.country_code.trim().toUpperCase(),
      paisNombre: this.form.country_name.trim(),
      correoPrincipal: this.optional(this.form.primary_email),
      telefono: this.optional(this.form.phone),
      celular: this.optional(this.form.mobile),
      sitioWeb: this.optional(this.form.website),
      facebook: this.optional(this.form.facebook),
      instagram: this.optional(this.form.instagram),
      representanteNombre: this.optional(this.form.legal_representative_name),
      representanteTipoDocumento: this.optional(this.form.legal_representative_document_type),
      representanteNumeroDocumento: this.optional(this.form.legal_representative_document),
      representanteCargo: this.optional(this.form.legal_representative_role),
      representanteCorreo: this.optional(this.form.legal_representative_email),
      representanteTelefono: this.optional(this.form.legal_representative_phone),
      zonaHoraria: this.form.timezone,
      idioma: this.form.language,
      formatoFecha: this.form.date_format,
      formatoHora: this.form.time_format,
      monedaCodigo: this.form.currency_code,
      monedaSimbolo: this.form.currency_symbol.trim(),
    } as const;
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

  private hydrateCompanyFromEmpresa(empresa: Empresa | null): void {
    if (!empresa) {
      return;
    }

    this.form.ruc = empresa.ruc || '';
    this.form.business_name = empresa.razonSocial || '';
    this.form.fiscal_document_type = empresa.tipoDocumentoFiscal || 'RUC';
    this.form.trade_name = empresa.nombreComercial || '';
    this.form.fiscal_address = empresa.direccionFiscal || '';
    this.form.district = empresa.distrito || '';
    this.form.province = empresa.provincia || '';
    this.form.department = empresa.departamento || '';
    this.form.country_code = empresa.paisCodigo || 'PE';
    this.form.country_name = empresa.paisNombre || 'Peru';
    this.form.primary_email = empresa.correoPrincipal || '';
    this.form.phone = empresa.telefono || '';
    this.form.mobile = empresa.celular || '';
    this.form.website = empresa.sitioWeb || '';
    this.form.facebook = empresa.facebook || '';
    this.form.instagram = empresa.instagram || '';
    this.form.legal_representative_name = empresa.representanteNombre || '';
    this.form.legal_representative_document_type = empresa.representanteTipoDocumento || '';
    this.form.legal_representative_document = empresa.representanteNumeroDocumento || '';
    this.form.legal_representative_role = empresa.representanteCargo || '';
    this.form.legal_representative_email = empresa.representanteCorreo || '';
    this.form.legal_representative_phone = empresa.representanteTelefono || '';
    this.form.timezone = empresa.zonaHoraria || 'America/Lima';
    this.form.language = empresa.idioma || 'es-PE';
    this.form.date_format = empresa.formatoFecha || 'DD/MM/YYYY';
    this.form.time_format = empresa.formatoHora || '24H';
    this.form.currency_code = empresa.monedaCodigo || 'PEN';
    this.form.currency_symbol = empresa.monedaSimbolo || 'S/';
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
      fiscal_document_type: 'RUC',
      trade_name: '',
      country_code: 'PE',
      country_name: 'Peru',
      fiscal_address: '',
      district: '',
      province: '',
      department: '',
      primary_email: '',
      phone: '',
      mobile: '',
      website: '',
      facebook: '',
      instagram: '',
      legal_representative_name: '',
      legal_representative_document_type: 'DNI',
      legal_representative_document: '',
      legal_representative_role: '',
      legal_representative_email: '',
      legal_representative_phone: '',
      timezone: 'America/Lima',
      language: 'es-PE',
      date_format: 'DD/MM/YYYY',
      time_format: '24H',
      currency_code: 'PEN',
      currency_symbol: 'S/',
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

    if (!ruc) {
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

  private isValidInternationalProfile(): boolean {
    return (
      /^[A-Za-z0-9][A-Za-z0-9._/-]{2,39}$/.test(this.form.ruc.trim()) &&
      /^[A-Z]{2}$/.test(this.form.country_code.trim().toUpperCase()) &&
      this.form.country_name.trim().length >= 2 &&
      this.form.fiscal_document_type.trim().length >= 2 &&
      this.form.timezone.trim().includes('/') &&
      /^[a-z]{2}(?:-[A-Z]{2})?$/.test(this.form.language.trim()) &&
      /^[A-Z]{3}$/.test(this.form.currency_code.trim().toUpperCase()) &&
      this.form.currency_symbol.trim().length > 0
    );
  }

  private optional(value: string): string | null {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const httpError = error as { error?: { message?: string; details?: string[] } };
      return httpError.error?.details?.[0] || httpError.error?.message || fallback;
    }

    return fallback;
  }
}
