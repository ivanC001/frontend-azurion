import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { toLocalDateInputValue } from '@core/utils/local-date';
import {
  AdminSaasApiService,
  CreateEmpresaRegistrationRequest,
  Empresa,
  EmpresaOperationalSummary,
  ModuloGlobal,
  Plan,
} from '../../data/admin-saas-api.service';

interface EmpresaForm {
  ruc: string;
  razonSocial: string;
  tipoDocumentoFiscal: string;
  nombreComercial: string;
  paisCodigo: string;
  paisNombre: string;
  monedaCodigo: string;
  monedaSimbolo: string;
  zonaHoraria: string;
  idioma: string;
  tenantId: string;
  schemaName: string;
  planId: number | null;
  fechaInicio: string;
  moduloCodigos: string[];
}

interface HttpErrorLike {
  readonly status?: number;
  readonly message?: string;
  readonly error?: unknown;
}

interface ApiErrorPayload {
  readonly message?: string;
  readonly details?: readonly string[];
  readonly errors?: Record<string, readonly string[] | string>;
}

interface TenantInitialCredentials {
  readonly tenantId: string;
  readonly username: string;
  readonly password: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-companies-admin-page',
  imports: [
    FormsModule,
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    TableModule,
    TagModule,
  ],
  templateUrl: './companies-admin-page.html',
  styleUrl: './companies-admin-page.scss',
})
export class CompaniesAdminPage {
  private readonly api = inject(AdminSaasApiService);
  private readonly router = inject(Router);

  protected readonly companySummaries = signal<EmpresaOperationalSummary[]>([]);
  protected readonly planes = signal<Plan[]>([]);
  protected readonly modulos = signal<ModuloGlobal[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dialogVisible = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly initialCredentials = signal<TenantInitialCredentials | null>(null);
  protected readonly selectedCompanySummary = signal<EmpresaOperationalSummary | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal<'TODAS' | 'ACTIVAS' | 'INACTIVAS'>('TODAS');
  private readonly assignableModuleCodes = new Set([
    'ERP',
    'INVENTARIO',
    'VENTAS',
    'CAJA',
    'COMPRAS',
    'CLIENTES',
    'FACTURACION',
    'CRM',
    'REPORTES',
    'COTIZACIONES',
  ]);

  protected form: EmpresaForm = this.createEmptyForm();

  protected readonly activeCompanies = computed(
    () => this.companySummaries().filter((summary) => summary.empresa.activo).length,
  );

  protected readonly activeSubscriptions = computed(
    () =>
      this.companySummaries().filter(
        (summary) => summary.suscripcionVigente,
      ).length,
  );

  protected readonly activeUsers = computed(
    () =>
      this.companySummaries().reduce(
        (total, summary) => total + (summary.usuariosActivos ?? 0),
        0,
      ),
  );

  protected readonly contractedSeats = computed(
    () =>
      this.companySummaries().reduce(
        (total, summary) =>
          total +
          (summary.suscripcionVigente && summary.suscripcion
            ? summary.suscripcion.limiteUsuarios
            : 0),
        0,
      ),
  );

  protected readonly planOptions = computed(() =>
    this.planes().map((plan) => ({
      label: `${plan.nombre} (${plan.codigo})`,
      value: plan.id,
    })),
  );

  protected readonly assignableModules = computed(() =>
    this.modulos().filter((modulo) =>
      this.assignableModuleCodes.has(this.normalizeModuleCode(modulo.codigo)),
    ),
  );

  protected readonly moduleCount = computed(() => this.assignableModules().length);
  protected readonly statusOptions = [
    { label: 'Todas', value: 'TODAS' },
    { label: 'Activas', value: 'ACTIVAS' },
    { label: 'Inactivas', value: 'INACTIVAS' },
  ];
  protected readonly countryOptions = [
    { code: 'PE', name: 'Peru', document: 'RUC', currency: 'PEN', symbol: 'S/', timezone: 'America/Lima', language: 'es-PE' },
    { code: 'AR', name: 'Argentina', document: 'CUIT', currency: 'ARS', symbol: '$', timezone: 'America/Argentina/Buenos_Aires', language: 'es-AR' },
    { code: 'BO', name: 'Bolivia', document: 'NIT', currency: 'BOB', symbol: 'Bs', timezone: 'America/La_Paz', language: 'es-BO' },
    { code: 'BR', name: 'Brasil', document: 'CNPJ', currency: 'BRL', symbol: 'R$', timezone: 'America/Sao_Paulo', language: 'pt-BR' },
    { code: 'CL', name: 'Chile', document: 'RUT', currency: 'CLP', symbol: '$', timezone: 'America/Santiago', language: 'es-CL' },
    { code: 'CO', name: 'Colombia', document: 'NIT', currency: 'COP', symbol: '$', timezone: 'America/Bogota', language: 'es-CO' },
    { code: 'EC', name: 'Ecuador', document: 'RUC', currency: 'USD', symbol: '$', timezone: 'America/Guayaquil', language: 'es-EC' },
    { code: 'ES', name: 'Espana', document: 'NIF', currency: 'EUR', symbol: 'EUR', timezone: 'Europe/Madrid', language: 'es-ES' },
    { code: 'US', name: 'Estados Unidos', document: 'EIN', currency: 'USD', symbol: '$', timezone: 'America/New_York', language: 'en-US' },
    { code: 'MX', name: 'Mexico', document: 'RFC', currency: 'MXN', symbol: '$', timezone: 'America/Mexico_City', language: 'es-MX' },
    { code: 'GB', name: 'Reino Unido', document: 'VAT', currency: 'GBP', symbol: 'GBP', timezone: 'Europe/London', language: 'en-GB' },
    { code: 'UY', name: 'Uruguay', document: 'RUT', currency: 'UYU', symbol: '$U', timezone: 'America/Montevideo', language: 'es-UY' },
  ] as const;
  protected readonly filteredCompanySummaries = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase();
    const status = this.statusFilter();
    return this.companySummaries().filter((summary) => {
      const empresa = summary.empresa;
      const matchesStatus =
        status === 'TODAS' ||
        (status === 'ACTIVAS' && empresa.activo) ||
        (status === 'INACTIVAS' && !empresa.activo);
      const matchesQuery =
        !query ||
        [
          empresa.razonSocial,
          empresa.nombreComercial,
          empresa.ruc,
          empresa.tenantId,
          empresa.schemaName,
          summary.suscripcion?.planNombre,
          ...summary.moduloCodigos,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLocaleLowerCase().includes(query));
      return matchesStatus && matchesQuery;
    });
  });

  constructor() {
    this.loadData();
  }

  protected openCreateDialog(): void {
    this.form = this.createEmptyForm();
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.initialCredentials.set(null);
    this.dialogVisible.set(true);
  }

  protected closeCreateDialog(): void {
    this.dialogVisible.set(false);
  }

  protected setSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected manageCompany(empresa: Empresa): void {
    void this.router.navigate(['/admin/control-empresas'], {
      queryParams: { empresaId: empresa.id },
    });
  }

  protected openCompanyDetails(summary: EmpresaOperationalSummary): void {
    this.selectedCompanySummary.set(summary);
  }

  protected closeCompanyDetails(): void {
    this.selectedCompanySummary.set(null);
  }

  protected generateTenantFields(): void {
    const base = this.slugify(this.form.razonSocial || this.form.ruc || 'empresa');
    this.form.tenantId = base;
    this.form.schemaName = `tenant_${base}`;
  }

  protected onCountryChanged(countryCode: string): void {
    const country = this.countryOptions.find((item) => item.code === countryCode);
    if (!country) {
      return;
    }
    this.form.paisCodigo = country.code;
    this.form.paisNombre = country.name;
    this.form.tipoDocumentoFiscal = country.document;
    this.form.monedaCodigo = country.currency;
    this.form.monedaSimbolo = country.symbol;
    this.form.zonaHoraria = country.timezone;
    this.form.idioma = country.language;
  }

  protected onPlanChanged(planId: number | null): void {
    this.form.planId = planId;
    const selectedPlan = this.planes().find((plan) => plan.id === planId) ?? null;
    this.form.moduloCodigos = this.normalizeAssignableModuleSelection(
      selectedPlan?.moduloCodigos ?? [],
    );
  }

  protected isModuleSelected(codigo: string): boolean {
    return this.form.moduloCodigos.includes(this.normalizeModuleCode(codigo));
  }

  protected saveEmpresa(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (!this.isValidForm()) {
      this.errorMessage.set(
        'Completa identificador fiscal, pais, razon social, tenantId, schemaName, plan, fecha de inicio y al menos un modulo inicial.',
      );
      return;
    }

    const request: CreateEmpresaRegistrationRequest = {
      ruc: this.form.ruc.trim(),
      razonSocial: this.form.razonSocial.trim(),
      tipoDocumentoFiscal: this.form.tipoDocumentoFiscal,
      nombreComercial: this.form.nombreComercial.trim() || undefined,
      paisCodigo: this.form.paisCodigo,
      paisNombre: this.form.paisNombre,
      monedaCodigo: this.form.monedaCodigo,
      monedaSimbolo: this.form.monedaSimbolo,
      zonaHoraria: this.form.zonaHoraria,
      idioma: this.form.idioma,
      tenantId: this.form.tenantId.trim(),
      schemaName: this.form.schemaName.trim(),
      planId: this.form.planId!,
      fechaInicio: this.form.fechaInicio || null,
    };

    this.saving.set(true);
    this.api
      .createEmpresaRegistration(request)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: ({ empresa }) => {
          this.dialogVisible.set(false);
          this.loadData();
          this.initialCredentials.set({
            tenantId: empresa.tenantId,
            username: 'admin',
            password: 'admin1',
          });

          this.successMessage.set(
            this.form.moduloCodigos.includes('ERP')
              ? 'Empresa registrada. El facturador se aprovisionara automaticamente en modo ticket.'
              : 'Empresa registrada correctamente.',
          );
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected statusSeverity(active: boolean): 'success' | 'danger' {
    return active ? 'success' : 'danger';
  }

  protected subscriptionSeverity(status?: string): 'success' | 'warn' | 'danger' | 'info' {
    if (status === 'ACTIVA') {
      return 'success';
    }
    if (status === 'SUSPENDIDA') {
      return 'warn';
    }
    if (status === 'CANCELADA') {
      return 'danger';
    }
    return 'info';
  }

  protected userUsagePercentage(summary: EmpresaOperationalSummary): number {
    const limit = summary.suscripcion?.limiteUsuarios ?? 0;
    const active = summary.usuariosActivos ?? 0;
    if (limit <= 0) {
      return 0;
    }
    return Math.min(Math.round((active / limit) * 100), 100);
  }

  private loadData(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      summaries: this.api.listEmpresaOperationalSummaries(),
      planes: this.api.listPlanes().pipe(catchError(() => of([] as Plan[]))),
      modulos: this.api.listModulos().pipe(catchError(() => of([] as ModuloGlobal[]))),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ summaries, planes, modulos }) => {
          this.companySummaries.set(summaries);
          this.planes.set(planes);
          this.modulos.set(modulos);
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  private isValidForm(): boolean {
    return (
      /^[A-Za-z0-9][A-Za-z0-9._/-]{2,39}$/.test(this.form.ruc.trim()) &&
      /^[A-Z]{2}$/.test(this.form.paisCodigo) &&
      this.form.razonSocial.trim().length > 0 &&
      /^[a-z][a-z0-9_]{2,62}$/.test(this.form.tenantId.trim()) &&
      /^[a-z][a-z0-9_]{2,62}$/.test(this.form.schemaName.trim()) &&
      this.form.planId !== null &&
      /^\d{4}-\d{2}-\d{2}$/.test(this.form.fechaInicio) &&
      this.form.moduloCodigos.length > 0
    );
  }

  private createEmptyForm(): EmpresaForm {
    return {
      ruc: '',
      razonSocial: '',
      tipoDocumentoFiscal: 'RUC',
      nombreComercial: '',
      paisCodigo: 'PE',
      paisNombre: 'Peru',
      monedaCodigo: 'PEN',
      monedaSimbolo: 'S/',
      zonaHoraria: 'America/Lima',
      idioma: 'es-PE',
      tenantId: '',
      schemaName: '',
      planId: null,
      fechaInicio: toLocalDateInputValue(),
      moduloCodigos: [],
    };
  }

  private normalizeAssignableModuleSelection(moduloCodigos: readonly string[]): string[] {
    const selected = new Set<string>();
    for (const moduloCodigo of moduloCodigos) {
      const code = this.normalizeModuleCode(moduloCodigo);
      if (this.assignableModuleCodes.has(code)) {
        selected.add(code);
      }
    }
    return [...selected];
  }

  private normalizeModuleCode(value: string): string {
    const code = value.trim().toUpperCase();
    if (code === 'FACTURACION_CORE') {
      return 'FACTURACION';
    }
    if (code === 'SAAS_CORE') {
      return 'ERP';
    }
    return code;
  }

  private slugify(value: string): string {
    const slug = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 45);

    return /^[a-z]/.test(slug) ? slug : `empresa_${slug || 'nueva'}`;
  }

  private resolveError(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const httpError = error as HttpErrorLike;
      if (httpError.status === 0) {
        return 'No se pudo conectar con el servidor. Intenta nuevamente en unos momentos.';
      }

      return (
        this.extractErrorMessage(httpError.error) ||
        httpError.message ||
        'No se pudo completar la operacion.'
      );
    }

    if (error instanceof Error && error.message.trim().length > 0) {
      return error.message.trim();
    }

    return 'No se pudo completar la operacion.';
  }

  private extractErrorMessage(payload: unknown): string {
    if (typeof payload === 'string') {
      return payload.trim();
    }

    if (!payload || typeof payload !== 'object') {
      return '';
    }

    const apiError = payload as ApiErrorPayload;
    const validationError = this.firstValidationError(apiError.errors);
    return validationError || apiError.details?.[0]?.trim() || apiError.message?.trim() || '';
  }

  private firstValidationError(
    errors: Record<string, readonly string[] | string> | undefined,
  ): string {
    if (!errors) {
      return '';
    }

    for (const value of Object.values(errors)) {
      if (Array.isArray(value)) {
        const message = value.find((item) => item.trim().length > 0);
        if (message) {
          return message.trim();
        }
        continue;
      }

      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }

    return '';
  }

}
