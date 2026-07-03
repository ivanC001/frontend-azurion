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

import { AdminSaasApiService, Almacen, Sucursal } from '../../data/admin-saas-api.service';

interface AlmacenForm {
  codigo: string;
  nombre: string;
  direccion: string;
  sucursalId: number | null;
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
  ],
  templateUrl: './warehouses-admin-page.html',
  styleUrl: './warehouses-admin-page.scss',
})
export class WarehousesAdminPage {
  private readonly api = inject(AdminSaasApiService);

  protected readonly almacenes = signal<Almacen[]>([]);
  protected readonly sucursales = signal<Sucursal[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dialogVisible = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected form: AlmacenForm = { codigo: '', nombre: '', direccion: '', sucursalId: null };
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
    this.form = {
      codigo: '',
      nombre: '',
      direccion: '',
      sucursalId:
        this.form.sucursalId || this.sucursales().find((sucursal) => sucursal.activo)?.id || null,
    };
    this.dialogVisible.set(true);
  }

  protected save(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (!this.form.codigo.trim() || !this.form.nombre.trim() || !this.form.sucursalId) {
      this.errorMessage.set('Completa codigo, nombre y sucursal del almacen.');
      return;
    }

    this.saving.set(true);
    this.api
      .createAlmacen({
        codigo: this.form.codigo.trim(),
        nombre: this.form.nombre.trim(),
        direccion: this.form.direccion.trim() || null,
        sucursalId: this.form.sucursalId,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set('Almacen creado correctamente.');
          this.form = { codigo: '', nombre: '', direccion: '', sucursalId: this.form.sucursalId };
          this.dialogVisible.set(false);
          this.load();
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected statusSeverity(active: boolean): 'success' | 'danger' {
    return active ? 'success' : 'danger';
  }

  private resolveError(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const apiError = (error as { error?: { message?: string; details?: string[] } }).error;
      return apiError?.details?.[0] || apiError?.message || 'No se pudo completar la operacion.';
    }
    return 'No se pudo completar la operacion.';
  }
}
