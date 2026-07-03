import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import { AuthSessionService } from '@core/auth/auth-session.service';
import {
  AdminSaasApiService,
  GuiaRemisionRecord,
  Producto,
  Sucursal,
} from '../../data/admin-saas-api.service';

interface GuiaItemForm {
  productoId: number | null;
  descripcion: string;
  cantidad: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-sales-remission-guide-page',
  imports: [FormsModule, ButtonModule, InputTextModule, SelectModule],
  templateUrl: './sales-remission-guide-page.html',
  styleUrl: './sales-remission-guide-page.scss',
})
export class SalesRemissionGuidePage {
  private readonly api = inject(AdminSaasApiService);
  private readonly session = inject(AuthSessionService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly sucursales = signal<Sucursal[]>([]);
  protected readonly productos = signal<Producto[]>([]);
  protected readonly guias = signal<GuiaRemisionRecord[]>([]);
  protected readonly guiaQuery = signal('');

  protected readonly sucursalOrigenId = signal<number | null>(null);
  protected readonly sucursalDestinoId = signal<number | null>(null);
  protected readonly fechaTraslado = signal(this.todayIso());
  protected readonly motivoTraslado = signal('VENTA');
  protected readonly transportista = signal('');
  protected readonly observacion = signal('');
  protected readonly items = signal<GuiaItemForm[]>([this.createItem()]);

  protected readonly sucursalOptions = computed(() =>
    this.sucursales().map((sucursal) => ({
      label: `${sucursal.codigo} - ${sucursal.nombre}`,
      value: sucursal.id,
    })),
  );

  protected readonly productoOptions = computed(() =>
    this.productos().map((producto) => ({
      label: `${producto.sku} - ${producto.nombre}`,
      value: producto.id,
    })),
  );

  protected readonly filteredGuias = computed(() => {
    const query = this.guiaQuery().trim().toLowerCase();
    const rows = [...this.guias()].sort((a, b) => Number(b.id) - Number(a.id));
    if (!query) {
      return rows;
    }
    return rows.filter((guia) =>
      [
        guia.externalId,
        guia.sucursalOrigenNombre,
        guia.sucursalDestinoNombre,
        guia.responsableNombre,
        guia.facturacionEstado,
        guia.facturadorSunatEstado,
        guia.facturadorMensaje,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  });

  protected readonly metrics = computed(() => {
    const guias = this.guias();
    const today = this.todayIso();
    return {
      total: guias.length,
      hoy: guias.filter((guia) => guia.fechaEmision === today).length,
      aceptadas: guias.filter((guia) => this.resolveStatus(guia) === 'ACEPTADO').length,
      pendientes: guias.filter((guia) =>
        ['PENDIENTE', 'PROCESANDO'].includes(this.resolveStatus(guia)),
      ).length,
    };
  });

  constructor() {
    this.loadData();
  }

  protected loadData(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    forkJoin({
      sucursales: this.api.listSucursales(),
      productos: this.api.listProductos(),
      guias: this.api.listGuiasRemision(),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ sucursales, productos, guias }) => {
          this.sucursales.set(sucursales);
          this.productos.set(productos);
          this.guias.set(guias);
          if (!this.sucursalOrigenId() && sucursales.length) {
            this.sucursalOrigenId.set(sucursales[0].id);
          }
        },
        error: () =>
          this.errorMessage.set('No se pudo cargar sucursales o productos para guia de remision.'),
      });
  }

  protected addItem(): void {
    this.items.set([...this.items(), this.createItem()]);
  }

  protected removeItem(index: number): void {
    if (this.items().length <= 1) {
      return;
    }
    this.items.set(this.items().filter((_, current) => current !== index));
  }

  protected onProductoChange(index: number): void {
    const currentItems = [...this.items()];
    const item = currentItems[index];
    if (!item) {
      return;
    }
    const producto = this.productos().find((row) => row.id === item.productoId);
    if (producto && !item.descripcion.trim()) {
      item.descripcion = producto.nombre;
      this.items.set(currentItems);
    }
  }

  protected registrarGuia(): void {
    if (this.saving()) {
      return;
    }
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (!this.sucursalOrigenId()) {
      this.errorMessage.set('Selecciona la sucursal de origen.');
      return;
    }
    if (!this.sucursalDestinoId()) {
      this.errorMessage.set('Selecciona la sucursal de destino.');
      return;
    }
    if (this.sucursalOrigenId() === this.sucursalDestinoId()) {
      this.errorMessage.set('La sucursal de destino debe ser diferente a origen.');
      return;
    }
    if (!this.fechaTraslado()) {
      this.errorMessage.set('Ingresa la fecha de traslado.');
      return;
    }

    const invalid = this.items().find((item) => !item.productoId || Number(item.cantidad) <= 0);
    if (invalid) {
      this.errorMessage.set('Cada item de guia debe tener producto y cantidad valida.');
      return;
    }

    const origen = this.sucursales().find((sucursal) => sucursal.id === this.sucursalOrigenId());
    const destino = this.sucursales().find((sucursal) => sucursal.id === this.sucursalDestinoId());
    if (!origen || !destino) {
      this.errorMessage.set('No se pudo resolver la sucursal de origen o destino.');
      return;
    }

    const request = {
      sucursalOrigenId: origen.id,
      sucursalDestinoId: destino.id,
      fechaTraslado: this.fechaTraslado(),
      motivoTraslado: this.motivoTraslado().trim() || null,
      transportista: this.transportista().trim() || null,
      observacion: this.observacion().trim() || null,
      responsableId: this.actorId(),
      responsableNombre: this.actorName(),
      items: this.items().map((item) => ({
        productoId: item.productoId as number,
        descripcion: item.descripcion.trim() || null,
        cantidad: Number(item.cantidad),
      })),
    } as const;

    this.saving.set(true);
    this.api
      .registrarGuiaRemision(request)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (response) => {
          const status = response.facturacion?.status ?? 0;
          const message = response.facturacion?.message || 'Guia registrada.';
          if (response.guia) {
            this.upsertGuia(response.guia);
          }
          this.refreshGuias(false);
          this.successMessage.set(
            `Guia ${response.externalId} enviada. Facturador ${status}: ${message}`,
          );
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.resolveError(error));
        },
      });
  }

  protected refreshGuias(showError = true): void {
    this.api.listGuiasRemision(this.guiaQuery()).subscribe({
      next: (guias) => this.guias.set(guias),
      error: () => {
        if (showError) {
          this.errorMessage.set('No se pudo cargar el registro de guias de remision.');
        }
      },
    });
  }

  protected statusLabel(guia: GuiaRemisionRecord): string {
    return this.resolveStatus(guia);
  }

  protected statusClass(guia: GuiaRemisionRecord): string {
    const status = this.resolveStatus(guia);
    if (status === 'ACEPTADO') {
      return 'status-pill status-pill--ok';
    }
    if (status === 'RECHAZADO' || status === 'ERROR') {
      return 'status-pill status-pill--error';
    }
    if (status === 'PROCESANDO') {
      return 'status-pill status-pill--processing';
    }
    return 'status-pill status-pill--pending';
  }

  protected openAsset(url?: string | null): void {
    const target = url?.trim();
    if (!target) {
      this.info('Archivo aun no disponible para esta guia.');
      return;
    }
    window.open(target, '_blank', 'noopener,noreferrer');
  }

  protected shortMessage(guia: GuiaRemisionRecord): string {
    return guia.facturadorMensaje?.trim() || 'Pendiente de respuesta del facturador.';
  }

  protected documentLabel(guia: GuiaRemisionRecord): string {
    const serie = guia.facturadorTipoComprobante === '09' ? 'GRE' : 'GUIA';
    const documentoId = guia.facturadorDocumentoId?.trim();
    return documentoId ? `${serie} #${documentoId}` : guia.externalId;
  }

  private upsertGuia(guia: GuiaRemisionRecord): void {
    const current = this.guias();
    const index = current.findIndex(
      (item) => item.id === guia.id || item.externalId === guia.externalId,
    );
    if (index < 0) {
      this.guias.set([guia, ...current]);
      return;
    }
    const next = [...current];
    next[index] = guia;
    this.guias.set(next);
  }

  private resolveStatus(guia: GuiaRemisionRecord): string {
    return (guia.facturadorSunatEstado || guia.facturacionEstado || 'PENDIENTE')
      .trim()
      .toUpperCase();
  }

  private info(message: string): void {
    this.successMessage.set(null);
    this.errorMessage.set(message);
  }

  private createItem(): GuiaItemForm {
    return {
      productoId: null,
      descripcion: '',
      cantidad: 1,
    };
  }

  private todayIso(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  private actorId(): string {
    const current = this.session.currentSession();
    return current?.userId ? String(current.userId) : current?.username || 'system';
  }

  private actorName(): string {
    const current = this.session.currentSession();
    return current?.nombres?.trim() || current?.username || 'Usuario';
  }

  private resolveError(error: unknown): string {
    if (typeof error === 'object' && error !== null) {
      const httpError = error as { status?: number; error?: { message?: string } };
      if (httpError.status === 400 || httpError.status === 422) {
        return httpError.error?.message || 'La guia no pudo ser procesada.';
      }
      if (httpError.status === 403) {
        return 'No tienes permisos para registrar guias de remision.';
      }
      if (httpError.status === 0) {
        return 'No se pudo conectar con el backend.';
      }
      return httpError.error?.message || 'No se pudo registrar la guia.';
    }
    return 'No se pudo registrar la guia.';
  }
}
