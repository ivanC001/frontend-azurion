import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, switchMap } from 'rxjs/operators';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { AdminSaasApiService, Sucursal, Ubigeo } from '../../data/admin-saas-api.service';
import { UbigeoPickerComponent } from '../../components/ubigeo-picker/ubigeo-picker';
import { AuthSessionService } from '@core/auth/auth-session.service';

interface SucursalForm {
  codigo: string;
  nombre: string;
  direccion: string;
  ubigeoCodigo: string | null;
  departamento: string;
  provincia: string;
  distrito: string;
  igvPorcentaje: number;
  usarConfiguracionEmpresa: boolean;
  tipoOperacionDefaultId: string;
  tipoAfectacionDefaultId: string;
  tributoDefaultId: string;
  porcentajeIgvDefault: number;
  crearAlmacenPrincipal: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-branches-admin-page',
  imports: [
    FormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    TableModule,
    TagModule,
    TooltipModule,
    UbigeoPickerComponent,
  ],
  templateUrl: './branches-admin-page.html',
  styleUrl: './branches-admin-page.scss',
})
export class BranchesAdminPage {
  private readonly api = inject(AdminSaasApiService);
  private readonly confirmationService = inject(ConfirmationService);
<<<<<<< HEAD
  private readonly auth = inject(AuthSessionService);
=======
>>>>>>> b50118bff6d4d47a3981a187eab708420ee804bc

  protected readonly sucursales = signal<Sucursal[]>([]);
  protected readonly ubigeos = signal<Ubigeo[]>([]);
  protected readonly loading = signal(false);
  protected readonly loadingUbigeos = signal(false);
  protected readonly saving = signal(false);
  protected readonly changingStatusId = signal<number | null>(null);
  protected readonly createDialogVisible = signal(false);
  protected readonly editDialogVisible = signal(false);
  protected readonly editingSucursal = signal<Sucursal | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly ubigeoSearch = signal('LIMA');
  protected form: SucursalForm = this.emptyForm();
  protected editForm: SucursalForm = this.emptyForm();
  protected readonly afectacionOptions = [
    { label: '10 - Gravado', value: '10' },
    { label: '20 - Exonerado', value: '20' },
    { label: '30 - Inafecto', value: '30' },
  ];
  protected readonly tributoOptions = [
    { label: '1000 - IGV', value: '1000' },
    { label: '9997 - Exonerado', value: '9997' },
    { label: '9998 - Inafecto', value: '9998' },
  ];

  protected readonly ubigeoOptions = computed(() =>
    this.ubigeos().map((ubigeo) => ({
      label: `${ubigeo.codigo} - ${ubigeo.distrito}, ${ubigeo.provincia}, ${ubigeo.departamento}`,
      value: ubigeo.codigo,
    })),
  );

  protected readonly branchStats = computed(() => ({
    total: this.sucursales().length,
    active: this.sucursales().filter((item) => item.activo).length,
    inactive: this.sucursales().filter((item) => !item.activo).length,
  }));

  constructor() {
    this.load();
    if (this.requiresUbigeo()) {
      this.searchUbigeos();
    }
  }

  protected load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.api
      .listSucursales()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => this.sucursales.set(items),
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected setUbigeoSearch(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.ubigeoSearch.set(input?.value ?? '');
  }

  protected searchUbigeos(): void {
    this.loadingUbigeos.set(true);
    this.api
      .listUbigeos(this.ubigeoSearch())
      .pipe(finalize(() => this.loadingUbigeos.set(false)))
      .subscribe({
        next: (items) => {
          this.ubigeos.set(items);
          if (!this.form.ubigeoCodigo && items.length) {
            this.form.ubigeoCodigo = items[0].codigo;
          }
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected openCreate(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.form = {
      ...this.emptyForm(),
      codigo: this.nextBranchCode(),
      ubigeoCodigo: this.requiresUbigeo() ? (this.ubigeos()[0]?.codigo ?? null) : null,
    };
    this.createDialogVisible.set(true);
  }

  protected save(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const igvPorcentaje = Number(this.form.igvPorcentaje);
    if (!this.form.nombre.trim()) {
      this.errorMessage.set('Completa el nombre de la sucursal.');
      return;
    }
    if (this.requiresUbigeo() && !this.form.ubigeoCodigo) {
      this.errorMessage.set('Selecciona el ubigeo SUNAT de la sucursal.');
      return;
    }
    if (Number.isNaN(igvPorcentaje) || igvPorcentaje < 0 || igvPorcentaje > 100) {
      this.errorMessage.set('Ingresa un IGV entre 0 y 100.');
      return;
    }

    this.saving.set(true);
    this.api
      .createSucursal({
        codigo: this.form.codigo.trim(),
        nombre: this.form.nombre.trim(),
        direccion: this.form.direccion.trim() || null,
        ubigeoCodigo: this.requiresUbigeo() ? this.form.ubigeoCodigo : null,
        departamento: this.requiresUbigeo() ? null : this.form.departamento.trim() || null,
        provincia: this.requiresUbigeo() ? null : this.form.provincia.trim() || null,
        distrito: this.requiresUbigeo() ? null : this.form.distrito.trim() || null,
        igvPorcentaje,
        crearAlmacenPrincipal: this.form.crearAlmacenPrincipal,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          const principalCreated = this.form.crearAlmacenPrincipal;
          this.createDialogVisible.set(false);
          this.successMessage.set(
            principalCreated
              ? 'Sucursal y almacen principal creados correctamente.'
              : 'Sucursal creada correctamente.',
          );
          this.form = {
            ...this.emptyForm(),
            codigo: this.nextBranchCode(),
            ubigeoCodigo: this.requiresUbigeo() ? (this.ubigeos()[0]?.codigo ?? null) : null,
          };
          this.load();
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected openEdit(item: Sucursal): void {
    const hasLegacyOverride = Number(item.igvPorcentaje) !== 18;
    const usarConfiguracionEmpresa =
      !hasLegacyOverride &&
      !item.tipoAfectacionDefaultId &&
      !item.tributoDefaultId &&
      item.porcentajeIgvDefault == null;
    const effectivePercentage = Number(item.porcentajeIgvDefault ?? item.igvPorcentaje ?? 18);
    this.editingSucursal.set(item);
    this.editForm = {
      codigo: item.codigo,
      nombre: item.nombre,
      direccion: item.direccion || '',
      ubigeoCodigo: item.ubigeoCodigo,
      departamento: item.departamento || '',
      provincia: item.provincia || '',
      distrito: item.distrito || '',
      igvPorcentaje: Number(item.igvPorcentaje),
      usarConfiguracionEmpresa,
      tipoOperacionDefaultId: item.tipoOperacionDefaultId || '0101',
      tipoAfectacionDefaultId:
        item.tipoAfectacionDefaultId || (effectivePercentage === 0 ? '20' : '10'),
      tributoDefaultId: item.tributoDefaultId || (effectivePercentage === 0 ? '9997' : '1000'),
      porcentajeIgvDefault: effectivePercentage,
      crearAlmacenPrincipal: false,
    };
    const ubigeoActual = item.ubigeoCodigo;
    if (ubigeoActual && !this.ubigeos().some((ubigeo) => ubigeo.codigo === ubigeoActual)) {
      this.ubigeos.update((items) => [
        {
          codigo: ubigeoActual,
          departamento: item.departamento ?? '',
          provincia: item.provincia ?? '',
          distrito: item.distrito ?? '',
        },
        ...items,
      ]);
    }
    this.editDialogVisible.set(true);
  }

  protected saveEdit(): void {
    const item = this.editingSucursal();
    if (!item || !this.validateForm(this.editForm)) {
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.api
      .updateSucursal(item.id, this.toRequest(this.editForm))
      .pipe(
        switchMap(() =>
          this.api.updateSucursalTributaria(
            item.id,
            this.editForm.usarConfiguracionEmpresa
              ? {
                  tipoOperacionDefaultId: null,
                  tipoAfectacionDefaultId: null,
                  tributoDefaultId: null,
                  porcentajeIgvDefault: null,
                }
              : {
                  tipoOperacionDefaultId: this.editForm.tipoOperacionDefaultId,
                  tipoAfectacionDefaultId: this.editForm.tipoAfectacionDefaultId,
                  tributoDefaultId: this.editForm.tributoDefaultId,
                  porcentajeIgvDefault: Number(this.editForm.porcentajeIgvDefault),
                },
          ),
        ),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.editDialogVisible.set(false);
          this.editingSucursal.set(null);
          this.successMessage.set('Sucursal actualizada correctamente.');
          this.load();
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected toggleStatus(item: Sucursal): void {
    const nextStatus = !item.activo;
    const action = nextStatus ? 'habilitar' : 'deshabilitar';
    this.confirmationService.confirm({
      header: `Confirmar ${action}`,
      message: `¿Estás seguro de que deseas ${action} la sucursal "${item.nombre}"?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: nextStatus ? 'Habilitar' : 'Deshabilitar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: nextStatus ? 'p-button-success' : 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary p-button-outlined',
      accept: () => {
        this.changingStatusId.set(item.id);
        this.errorMessage.set(null);
        this.successMessage.set(null);
        this.api
          .changeSucursalStatus(item.id, nextStatus)
          .pipe(finalize(() => this.changingStatusId.set(null)))
          .subscribe({
            next: () => {
              this.successMessage.set(
                `Sucursal ${nextStatus ? 'habilitada' : 'deshabilitada'} correctamente.`,
              );
              this.load();
            },
            error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
          });
      },
    });
  }

  protected statusSeverity(active: boolean): 'success' | 'danger' {
    return active ? 'success' : 'danger';
  }

  protected selectedUbigeo(): Ubigeo | null {
    return this.ubigeos().find((ubigeo) => ubigeo.codigo === this.form.ubigeoCodigo) ?? null;
  }

  protected selectedEditUbigeo(): Ubigeo | null {
    return this.ubigeos().find((ubigeo) => ubigeo.codigo === this.editForm.ubigeoCodigo) ?? null;
  }

  private validateForm(form: SucursalForm): boolean {
    const igvPorcentaje = Number(form.igvPorcentaje);
    if (!form.codigo.trim() || !form.nombre.trim()) {
      this.errorMessage.set('Completa el codigo y el nombre de la sucursal.');
      return false;
    }
    if (this.requiresUbigeo() && !form.ubigeoCodigo) {
      this.errorMessage.set('Selecciona el ubigeo SUNAT de la sucursal.');
      return false;
    }
    if (Number.isNaN(igvPorcentaje) || igvPorcentaje < 0 || igvPorcentaje > 100) {
      this.errorMessage.set('Ingresa un IGV entre 0 y 100.');
      return false;
    }
    return true;
  }

  private toRequest(form: SucursalForm) {
    const usaUbigeo = this.requiresUbigeo();
    return {
      codigo: form.codigo.trim(),
      nombre: form.nombre.trim(),
      direccion: form.direccion.trim() || null,
      ubigeoCodigo: usaUbigeo ? form.ubigeoCodigo : null,
      departamento: usaUbigeo ? null : form.departamento.trim() || null,
      provincia: usaUbigeo ? null : form.provincia.trim() || null,
      distrito: usaUbigeo ? null : form.distrito.trim() || null,
      igvPorcentaje: Number(form.igvPorcentaje),
    };
  }

  /**
   * El ubigeo es un codigo de SUNAT y solo existe en Peru. Fuera de ahi la
   * ubicacion se captura como texto libre, igual que hace el backend en
   * SucursalLocationResolver.
   */
  protected readonly requiresUbigeo = computed(
    () => (this.auth.currentSession()?.empresa?.paisCodigo || 'PE').toUpperCase() === 'PE',
  );

  /** Etiqueta del pais, para orientar al usuario en el formulario libre. */
  protected readonly countryLabel = computed(
    () => this.auth.currentSession()?.empresa?.paisNombre || 'tu pais',
  );

  private emptyForm(): SucursalForm {
    return {
      codigo: '',
      nombre: '',
      direccion: '',
      ubigeoCodigo: null,
      departamento: '',
      provincia: '',
      distrito: '',
      igvPorcentaje: 18,
      usarConfiguracionEmpresa: true,
      tipoOperacionDefaultId: '0101',
      tipoAfectacionDefaultId: '10',
      tributoDefaultId: '1000',
      porcentajeIgvDefault: 18,
      crearAlmacenPrincipal: true,
    };
  }

  private nextBranchCode(): string {
    const usedCodes = new Set(this.sucursales().map((item) => item.codigo.toUpperCase()));
    for (let sequence = 1; sequence <= 9999; sequence += 1) {
      const candidate = `SUC-${String(sequence).padStart(3, '0')}`;
      if (!usedCodes.has(candidate)) {
        return candidate;
      }
    }
    return `SUC-${Date.now()}`;
  }

  private resolveError(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const apiError = (error as { error?: { message?: string; details?: string[] } }).error;
      return apiError?.details?.[0] || apiError?.message || 'No se pudo completar la operacion.';
    }
    return 'No se pudo completar la operacion.';
  }
}
