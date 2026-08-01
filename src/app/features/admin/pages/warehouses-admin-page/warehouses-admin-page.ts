import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { AdminSaasApiService, Almacen, Sucursal } from '../../data/admin-saas-api.service';

interface AlmacenForm {
  id: number | null;
  codigo: string;
  nombre: string;
  direccion: string;
  sucursalId: number | null;
  tipoAlmacen: 'PRINCIPAL' | 'SECUNDARIO' | 'TRANSITO' | 'DEVOLUCIONES';
  permiteVenta: boolean;
  activo: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-warehouses-admin-page',
  imports: [
    FormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    TableModule,
    TagModule,
    TooltipModule,
  ],
  templateUrl: './warehouses-admin-page.html',
  styleUrl: './warehouses-admin-page.scss',
})
export class WarehousesAdminPage {
  private readonly api = inject(AdminSaasApiService);
  private manualName = false;
  private manualAddress = false;

  protected readonly almacenes = signal<Almacen[]>([]);
  protected readonly sucursales = signal<Sucursal[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dialogVisible = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected form: AlmacenForm = this.emptyForm();
  protected readonly sucursalOptions = computed(() =>
    this.sucursales()
      .filter((sucursal) => sucursal.activo)
      .map((sucursal) => ({
        label: `${sucursal.codigo} - ${sucursal.nombre}`,
        value: sucursal.id,
      })),
  );
  protected readonly warehouseStats = computed(() => ({
    total: this.almacenes().length,
    active: this.almacenes().filter((item) => item.activo).length,
    branches: new Set(this.almacenes().map((item) => item.sucursalId)).size,
  }));
  protected readonly warehouseTypeOptions = [
    { label: 'Principal', value: 'PRINCIPAL' as const },
    { label: 'Secundario', value: 'SECUNDARIO' as const },
    { label: 'Transito', value: 'TRANSITO' as const },
    { label: 'Devoluciones', value: 'DEVOLUCIONES' as const },
  ];

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    forkJoin({
      almacenes: this.api.listAlmacenes(),
      sucursales: this.api.listSucursales(),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ almacenes, sucursales }) => {
          this.almacenes.set(almacenes);
          this.sucursales.set(sucursales);
          this.form.sucursalId ||= sucursales.find((sucursal) => sucursal.activo)?.id || null;
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected openCreate(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.manualName = false;
    this.manualAddress = false;
    const sucursalId =
      this.form.sucursalId || this.sucursales().find((sucursal) => sucursal.activo)?.id || null;
    this.form = {
      id: null,
      codigo: '',
      nombre: '',
      direccion: '',
      sucursalId,
      tipoAlmacen: this.hasActivePrincipal(sucursalId) ? 'SECUNDARIO' : 'PRINCIPAL',
      permiteVenta: true,
      activo: true,
    };
    this.applySucursalDefaults();
    this.dialogVisible.set(true);
  }

  protected openEdit(item: Almacen): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.manualName = true;
    this.manualAddress = true;
    this.form = {
      id: item.id,
      codigo: item.codigo,
      nombre: item.nombre,
      direccion: item.direccion || '',
      sucursalId: item.sucursalId,
      tipoAlmacen: this.normalizeType(item.tipoAlmacen),
      permiteVenta: item.permiteVenta,
      activo: item.activo,
    };
    this.dialogVisible.set(true);
  }

  protected save(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (!this.form.nombre.trim() || !this.form.sucursalId) {
      this.errorMessage.set('Completa el nombre y selecciona la sucursal del almacen.');
      return;
    }

    this.saving.set(true);
    const request = {
      nombre: this.form.nombre.trim(),
      direccion: this.form.direccion.trim() || null,
      sucursalId: this.form.sucursalId,
      tipoAlmacen: this.form.tipoAlmacen,
      permiteVenta: this.form.permiteVenta,
    };
    const operation = this.form.id
      ? this.api.updateAlmacen(this.form.id, { ...request, activo: this.form.activo })
      : this.api.createAlmacen({ ...request, codigo: this.form.codigo.trim().toUpperCase() });

    operation
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set(
            this.form.id ? 'Almacen actualizado correctamente.' : 'Almacen creado correctamente.',
          );
          this.form = this.emptyForm(this.form.sucursalId);
          this.dialogVisible.set(false);
          this.load();
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected statusSeverity(active: boolean): 'success' | 'danger' {
    return active ? 'success' : 'danger';
  }

  protected dialogTitle(): string {
    return this.form.id ? 'Editar almacen' : 'Registrar almacen';
  }

  protected selectedSucursal(): Sucursal | null {
    return this.sucursales().find((item) => item.id === this.form.sucursalId) ?? null;
  }

  protected onSucursalChange(): void {
    if (this.form.id === null && this.hasActivePrincipal(this.form.sucursalId)) {
      this.form.tipoAlmacen = 'SECUNDARIO';
    }
    this.applySucursalDefaults();
  }

  protected onWarehouseTypeChange(): void {
    if (this.form.id === null && !this.manualName) {
      this.form.nombre = this.defaultWarehouseName();
    }
    if (this.form.tipoAlmacen === 'TRANSITO' || this.form.tipoAlmacen === 'DEVOLUCIONES') {
      this.form.permiteVenta = false;
    } else if (this.form.id === null) {
      this.form.permiteVenta = true;
    }
  }

  protected markNameManual(): void {
    this.manualName = true;
  }

  protected markAddressManual(): void {
    this.manualAddress = true;
  }

  protected warehouseTypeLabel(): string {
    return (
      this.warehouseTypeOptions.find((option) => option.value === this.form.tipoAlmacen)?.label ||
      'Principal'
    );
  }

  protected principalUnavailable(): boolean {
    if (!this.form.activo || this.form.tipoAlmacen !== 'PRINCIPAL' || !this.form.sucursalId) {
      return false;
    }
    return this.almacenes().some(
      (item) =>
        item.activo &&
        item.sucursalId === this.form.sucursalId &&
        item.tipoAlmacen?.toUpperCase() === 'PRINCIPAL' &&
        item.id !== this.form.id,
    );
  }

  private emptyForm(sucursalId: number | null = null): AlmacenForm {
    return {
      id: null,
      codigo: '',
      nombre: '',
      direccion: '',
      sucursalId,
      tipoAlmacen: 'PRINCIPAL',
      permiteVenta: true,
      activo: true,
    };
  }

  private normalizeType(value: string): AlmacenForm['tipoAlmacen'] {
    const normalized = String(value || '').toUpperCase();
    return this.warehouseTypeOptions.some((item) => item.value === normalized)
      ? (normalized as AlmacenForm['tipoAlmacen'])
      : 'PRINCIPAL';
  }

  private applySucursalDefaults(): void {
    const sucursal = this.selectedSucursal();
    if (!sucursal || this.form.id !== null) {
      return;
    }
    this.form.codigo = this.nextWarehouseCode(sucursal);
    if (!this.manualName) {
      this.form.nombre = this.defaultWarehouseName();
    }
    if (!this.manualAddress) {
      this.form.direccion = sucursal.direccion || '';
    }
  }

  private defaultWarehouseName(): string {
    const sucursal = this.selectedSucursal();
    if (!sucursal) {
      return '';
    }
    const typeName = this.warehouseTypeLabel().toLowerCase();
    return `Almacen ${typeName} - ${sucursal.nombre}`;
  }

  private hasActivePrincipal(sucursalId: number | null): boolean {
    if (!sucursalId) {
      return false;
    }
    return this.almacenes().some(
      (item) =>
        item.activo &&
        item.sucursalId === sucursalId &&
        item.tipoAlmacen?.toUpperCase() === 'PRINCIPAL',
    );
  }

  private nextWarehouseCode(sucursal: Sucursal): string {
    const branchCode = String(sucursal.codigo || 'SUC')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/(^-+|-+$)/g, '')
      .slice(0, 35);
    const prefix = `ALM-${branchCode || 'SUC'}-`;
    const usedCodes = new Set(this.almacenes().map((item) => item.codigo.toUpperCase()));
    for (let sequence = 1; sequence <= 9999; sequence += 1) {
      const candidate = `${prefix}${String(sequence).padStart(2, '0')}`;
      if (!usedCodes.has(candidate)) {
        return candidate;
      }
    }
    return `${prefix}${Date.now()}`;
  }

  private resolveError(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const apiError = (error as { error?: { message?: string; details?: string[] } }).error;
      return apiError?.details?.[0] || apiError?.message || 'No se pudo completar la operacion.';
    }
    return 'No se pudo completar la operacion.';
  }
}
