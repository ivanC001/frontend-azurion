import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, forkJoin, of, switchMap } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { ApiUrlService } from '@core/api/api-url.service';
import { FacturadorApiService } from '@features/facturador/data/facturador-api.service';
import {
  AdminSaasApiService,
  CreateEmpresaRequest,
  Empresa,
  ModuloGlobal,
  Plan,
  Suscripcion,
} from '../../data/admin-saas-api.service';

interface EmpresaForm {
  ruc: string;
  razonSocial: string;
  tenantId: string;
  schemaName: string;
  planId: number | null;
  fechaInicio: string;
  moduloCodigos: string[];
  syncFacturador: boolean;
  logoFile: File | null;
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

interface EmpresaCreationFlowResult {
  readonly empresa: Empresa;
  readonly suscripcion: Suscripcion | null;
  readonly suscripcionMessage: string;
  readonly facturadorSynced: boolean;
  readonly facturadorMessage: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-companies-admin-page',
  imports: [
    FormsModule,
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
  private readonly facturadorApi = inject(FacturadorApiService);
  private readonly apiUrl = inject(ApiUrlService);
  private readonly router = inject(Router);

  protected readonly empresas = signal<Empresa[]>([]);
  protected readonly planes = signal<Plan[]>([]);
  protected readonly modulos = signal<ModuloGlobal[]>([]);
  protected readonly suscripciones = signal<Suscripcion[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dialogVisible = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
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
    () => this.empresas().filter((empresa) => empresa.activo).length,
  );

  protected readonly activeSubscriptions = computed(
    () => this.suscripciones().filter((suscripcion) => suscripcion.estado === 'ACTIVA').length,
  );

  protected readonly planOptions = computed(() =>
    this.planes().map((plan) => ({
      label: `${plan.nombre} (${plan.codigo})`,
      value: plan.id,
    })),
  );

  protected readonly planById = computed(() => {
    const map = new Map<number, Plan>();
    for (const plan of this.planes()) {
      map.set(plan.id, plan);
    }
    return map;
  });

  protected readonly subscriptionByEmpresaId = computed(() => {
    const map = new Map<number, Suscripcion>();
    for (const subscription of this.suscripciones()) {
      map.set(subscription.empresaId, subscription);
    }
    return map;
  });

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
  protected readonly filteredCompanies = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase();
    const status = this.statusFilter();
    return this.empresas().filter((empresa) => {
      const matchesStatus =
        status === 'TODAS' ||
        (status === 'ACTIVAS' && empresa.activo) ||
        (status === 'INACTIVAS' && !empresa.activo);
      const matchesQuery =
        !query ||
        [empresa.razonSocial, empresa.ruc, empresa.tenantId, empresa.schemaName]
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

  protected generateTenantFields(): void {
    const base = this.slugify(this.form.razonSocial || this.form.ruc || 'empresa');
    this.form.tenantId = base;
    this.form.schemaName = `tenant_${base}`;
  }

  protected onPlanChanged(planId: number | null): void {
    this.form.planId = planId;
    const selectedPlan = this.planes().find((plan) => plan.id === planId) ?? null;
    this.form.moduloCodigos = this.normalizeAssignableModuleSelection(
      selectedPlan?.moduloCodigos ?? [],
    );
    this.normalizeFacturadorSyncState();
  }

  protected isModuleSelected(codigo: string): boolean {
    return this.form.moduloCodigos.includes(this.normalizeModuleCode(codigo));
  }

  protected toggleModule(codigo: string, checked: boolean): void {
    const normalizedCode = this.normalizeModuleCode(codigo);
    if (!this.assignableModuleCodes.has(normalizedCode)) {
      return;
    }

    const current = new Set(this.form.moduloCodigos);
    if (checked) {
      current.add(normalizedCode);
    } else {
      current.delete(normalizedCode);
    }
    this.form.moduloCodigos = [...current];
    if (normalizedCode === 'FACTURACION' && !checked) {
      this.form.syncFacturador = false;
    }
    this.normalizeFacturadorSyncState();
  }

  protected saveEmpresa(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (!this.isValidForm()) {
      this.errorMessage.set(
        'Completa RUC, razon social, tenantId, schemaName y al menos un modulo inicial.',
      );
      return;
    }

    const syncFacturador = this.shouldSyncFacturador();
    if (syncFacturador && !this.form.logoFile) {
      this.errorMessage.set(
        'Adjunta el logo de la empresa para registrar tambien en facturador, o desmarca esa opcion.',
      );
      return;
    }

    const request: CreateEmpresaRequest = {
      ruc: this.form.ruc.trim(),
      razonSocial: this.form.razonSocial.trim(),
      tenantId: this.form.tenantId.trim(),
      schemaName: this.form.schemaName.trim(),
      moduloCodigos: [...this.form.moduloCodigos],
    };

    this.saving.set(true);
    this.api
      .createEmpresa(request)
      .pipe(
        switchMap((empresa) =>
          this.createSuscripcionIfNeeded(empresa).pipe(
            map((suscripcion) => ({
              empresa,
              suscripcion,
              suscripcionMessage: '',
            })),
            catchError((error: unknown) =>
              of({
                empresa,
                suscripcion: null,
                suscripcionMessage: this.resolveError(error),
              }),
            ),
          ),
        ),
        switchMap((result) => {
          if (result.suscripcionMessage || !syncFacturador) {
            return of({ ...result, facturadorSynced: false, facturadorMessage: '' });
          }

          return this.facturadorApi
            .createTenant({
              ruc: result.empresa.ruc,
              business_name: result.empresa.razonSocial,
              sunat_mode: 'beta',
              api_client_name: `erp-${result.empresa.tenantId}`,
              logo_file: this.form.logoFile,
            })
            .pipe(
              map((tenant) => ({
                ...result,
                facturadorSynced: true,
                facturadorMessage: tenant.already_exists
                  ? 'Facturador ya tenia esta empresa y reutilizo su schema.'
                  : 'Facturador registro la empresa y creo su schema.',
              })),
              catchError((error: unknown) =>
                of({
                  ...result,
                  facturadorSynced: false,
                  facturadorMessage: this.resolveFacturadorError(error),
                }),
              ),
            );
        }),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: ({ suscripcionMessage, facturadorSynced, facturadorMessage }: EmpresaCreationFlowResult) => {
          this.dialogVisible.set(false);
          this.loadData();

          if (suscripcionMessage) {
            this.successMessage.set('Empresa registrada en AZURION.');
            this.errorMessage.set(`No se pudo asignar el plan inicial: ${suscripcionMessage}`);
            return;
          }

          if (!syncFacturador) {
            this.successMessage.set('Empresa registrada correctamente.');
            return;
          }

          if (facturadorSynced) {
            this.successMessage.set(`Empresa registrada correctamente. ${facturadorMessage}`);
            return;
          }

          this.successMessage.set('Empresa registrada en AZURION.');
          this.errorMessage.set(`No se pudo sincronizar en facturador: ${facturadorMessage}`);
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected planName(planId: number): string {
    return this.planById().get(planId)?.nombre ?? 'Sin plan';
  }

  protected subscriptionFor(empresaId: number): Suscripcion | undefined {
    return this.subscriptionByEmpresaId().get(empresaId);
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

  protected onLogoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;

    if (!file) {
      this.form.logoFile = null;
      return;
    }

    if (!this.isValidLogoFile(file)) {
      this.form.logoFile = null;
      input.value = '';
      this.errorMessage.set('Logo invalido. Usa PNG, JPG, JPEG, WEBP o SVG (maximo 2 MB).');
      return;
    }

    this.form.logoFile = file;
  }

  private createSuscripcionIfNeeded(empresa: Empresa): Observable<Suscripcion | null> {
    if (!this.form.planId) {
      return of<Suscripcion | null>(null);
    }

    return this.api.createSuscripcion({
      empresaId: empresa.id,
      planId: this.form.planId,
      fechaInicio: this.form.fechaInicio || null,
    });
  }

  private loadData(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      empresas: this.api.listEmpresas(),
      planes: this.api.listPlanes().pipe(catchError(() => of([] as Plan[]))),
      modulos: this.api.listModulos().pipe(catchError(() => of([] as ModuloGlobal[]))),
      suscripciones: this.api.listSuscripciones().pipe(catchError(() => of([] as Suscripcion[]))),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ empresas, planes, modulos, suscripciones }) => {
          this.empresas.set(empresas);
          this.planes.set(planes);
          this.modulos.set(modulos);
          this.suscripciones.set(suscripciones);
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  private isValidForm(): boolean {
    return (
      /^[0-9]{11}$/.test(this.form.ruc.trim()) &&
      this.form.razonSocial.trim().length > 0 &&
      /^[a-z][a-z0-9_]{2,62}$/.test(this.form.tenantId.trim()) &&
      /^[a-z][a-z0-9_]{2,62}$/.test(this.form.schemaName.trim()) &&
      this.form.moduloCodigos.length > 0
    );
  }

  private createEmptyForm(): EmpresaForm {
    return {
      ruc: '',
      razonSocial: '',
      tenantId: '',
      schemaName: '',
      planId: null,
      fechaInicio: new Date().toISOString().slice(0, 10),
      moduloCodigos: [],
      syncFacturador: false,
      logoFile: null,
    };
  }

  private normalizeFacturadorSyncState(): void {
    if (!this.form.moduloCodigos.includes('FACTURACION')) {
      this.form.syncFacturador = false;
    }
  }

  private shouldSyncFacturador(): boolean {
    return this.form.syncFacturador && this.form.moduloCodigos.includes('FACTURACION');
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
    if (error instanceof Error && error.message.trim().length > 0) {
      return error.message.trim();
    }

    if (typeof error === 'object' && error !== null && 'error' in error) {
      const httpError = error as HttpErrorLike;
      if (httpError.status === 0) {
        return `No se pudo conectar con la API. Verifica que el backend AZURION este activo en ${this.apiUrl.baseUrl('saasCore')}.`;
      }

      return (
        this.extractErrorMessage(httpError.error) ||
        httpError.message ||
        'No se pudo completar la operacion.'
      );
    }

    return 'No se pudo completar la operacion.';
  }

  private resolveFacturadorError(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const httpError = error as HttpErrorLike;
      if (httpError.status === 0) {
        return `No se pudo conectar con facturador en ${this.apiUrl.baseUrl('facturador')}.`;
      }

      const backendMessage = this.extractErrorMessage(httpError.error);
      const normalizedMessage = backendMessage.toLowerCase();
      if (
        normalizedMessage.includes('authentication required') ||
        normalizedMessage.includes('invalid jwt token') ||
        normalizedMessage.includes('invalid api key')
      ) {
        return 'Facturador rechazo autenticacion. En local habilita AUTH_DISABLED=true en su .env o usa integracion server-to-server.';
      }

      return backendMessage || httpError.message || 'Error no controlado en facturador.';
    }

    return 'Error no controlado en facturador.';
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
}
