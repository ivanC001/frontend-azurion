import { DatePipe, DecimalPipe } from '@angular/common';
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

import { AuthSessionService } from '@core/auth/auth-session.service';
import {
  AdminSaasApiService,
  Caja,
  Cliente,
  Cotizacion,
  Producto,
  Sucursal,
  TipoComprobanteVenta,
} from '../../data/admin-saas-api.service';

interface QuoteLineForm {
  productoId: number | null;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
}

interface QuoteForm {
  clienteId: number | null;
  sucursalId: number | null;
  fechaVencimiento: string;
  moneda: string;
  observacion: string;
  detalles: QuoteLineForm[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-sales-quotes-page',
  imports: [
    DatePipe,
    DecimalPipe,
    FormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    TableModule,
    TagModule,
  ],
  templateUrl: './sales-quotes-page.html',
  styleUrl: './sales-quotes-page.scss',
})
export class SalesQuotesPage {
  private readonly api = inject(AdminSaasApiService);
  private readonly session = inject(AuthSessionService);

  protected readonly cotizaciones = signal<Cotizacion[]>([]);
  protected readonly clientes = signal<Cliente[]>([]);
  protected readonly sucursales = signal<Sucursal[]>([]);
  protected readonly productos = signal<Producto[]>([]);
  protected readonly cajas = signal<Caja[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dialogVisible = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly convertingId = signal<number | null>(null);
  protected readonly pdfId = signal<number | null>(null);
  protected readonly selectedCajaId = signal<number | null>(null);
  protected readonly convertDocumentType = signal<TipoComprobanteVenta>('TICKET_VENTA');

  protected form: QuoteForm = this.emptyForm();

  protected readonly metrics = computed(() => ({
    total: this.cotizaciones().length,
    abiertas: this.cotizaciones().filter((item) =>
      ['BORRADOR', 'ENVIADA', 'ACEPTADA'].includes(item.estado),
    ).length,
    convertidas: this.cotizaciones().filter((item) => item.estado === 'CONVERTIDA').length,
    monto: this.cotizaciones().reduce((sum, item) => sum + Number(item.total || 0), 0),
  }));

  protected readonly clienteOptions = computed(() =>
    this.clientes().map((cliente) => ({
      label: `${cliente.numeroDocumento} - ${cliente.nombre}`,
      value: cliente.id,
    })),
  );

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

  protected readonly cajaOptions = computed(() =>
    this.cajas()
      .filter((caja) => caja.estado === 'ABIERTA')
      .map((caja) => ({
        label: `${caja.codigo} - ${caja.nombre} (${caja.sucursalNombre})`,
        value: caja.id,
      })),
  );

  protected readonly documentOptions: Array<{ label: string; value: TipoComprobanteVenta }> = [
    { label: 'Ticket', value: 'TICKET_VENTA' },
    { label: 'Boleta', value: 'BOLETA' },
    { label: 'Factura', value: 'FACTURA' },
  ];

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    forkJoin({
      cotizaciones: this.api.listCotizaciones(),
      clientes: this.api.listClientes(),
      sucursales: this.api.listSucursales(),
      productos: this.api.listProductos(),
      cajas: this.api.listCajas('ABIERTA'),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ cotizaciones, clientes, sucursales, productos, cajas }) => {
          this.cotizaciones.set(cotizaciones);
          this.clientes.set(clientes);
          this.sucursales.set(sucursales);
          this.productos.set(productos);
          this.cajas.set(cajas);
          this.selectedCajaId.set(cajas[0]?.id ?? null);
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected openDialog(): void {
    this.form = this.emptyForm();
    this.form.sucursalId =
      this.session.currentSession()?.sucursales?.[0]?.id ?? this.sucursales()[0]?.id ?? null;
    this.dialogVisible.set(true);
  }

  protected addLine(): void {
    this.form.detalles.push({
      productoId: null,
      descripcion: '',
      cantidad: 1,
      precioUnitario: 0,
      descuento: 0,
    });
  }

  protected removeLine(index: number): void {
    if (this.form.detalles.length <= 1) {
      return;
    }
    this.form.detalles.splice(index, 1);
  }

  protected onProductChange(line: QuoteLineForm): void {
    const producto = this.productos().find((item) => item.id === line.productoId);
    if (!producto) {
      return;
    }
    line.descripcion = producto.nombre;
    line.precioUnitario = Number(producto.precioVentaBase ?? producto.precio ?? 0);
  }

  protected lineTotal(line: QuoteLineForm): number {
    return Math.max(
      0,
      Number(line.cantidad || 0) * Number(line.precioUnitario || 0) - Number(line.descuento || 0),
    );
  }

  protected formTotal(): number {
    return this.form.detalles.reduce((sum, line) => sum + this.lineTotal(line), 0);
  }

  protected save(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    if (!this.form.sucursalId) {
      this.errorMessage.set('Selecciona una sucursal.');
      return;
    }
    const detalles = this.form.detalles
      .filter((line) => line.productoId && Number(line.cantidad) > 0)
      .map((line) => ({
        productoId: Number(line.productoId),
        descripcion: line.descripcion.trim() || null,
        cantidad: Number(line.cantidad),
        precioUnitario: Number(line.precioUnitario || 0),
        descuento: Number(line.descuento || 0),
      }));
    if (!detalles.length) {
      this.errorMessage.set('Agrega al menos un producto o servicio.');
      return;
    }

    this.saving.set(true);
    this.api
      .createCotizacion({
        clienteId: this.form.clienteId,
        usuarioId: this.actorId(),
        usuarioNombre: this.actorName(),
        sucursalId: this.form.sucursalId,
        fechaVencimiento: this.form.fechaVencimiento || null,
        moneda: this.form.moneda || 'PEN',
        observacion: this.form.observacion.trim() || null,
        detalles,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (cotizacion) => {
          this.cotizaciones.set([cotizacion, ...this.cotizaciones()]);
          this.dialogVisible.set(false);
          this.successMessage.set('Cotizacion registrada.');
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected updateEstado(cotizacion: Cotizacion, estado: string): void {
    this.api.updateCotizacionEstado(cotizacion.id, estado).subscribe({
      next: (updated) => this.upsert(updated, `Cotizacion marcada como ${estado.toLowerCase()}.`),
      error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
    });
  }

  protected downloadPdf(cotizacion: Cotizacion): void {
    this.pdfId.set(cotizacion.id);
    this.api
      .getCotizacionPdf(cotizacion.id)
      .pipe(finalize(() => this.pdfId.set(null)))
      .subscribe({
        next: (pdf) => {
          const bytes = Uint8Array.from(atob(pdf.base64), (char) => char.charCodeAt(0));
          const blob = new Blob([bytes], { type: pdf.contentType || 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = pdf.fileName || `cotizacion-${cotizacion.id}.pdf`;
          link.click();
          URL.revokeObjectURL(url);
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected convertToSale(cotizacion: Cotizacion): void {
    if (!this.selectedCajaId()) {
      this.errorMessage.set('Abre o selecciona una caja para convertir la cotizacion.');
      return;
    }
    this.convertingId.set(cotizacion.id);
    this.api
      .convertCotizacionVenta(cotizacion.id, {
        cajaId: this.selectedCajaId() as number,
        tipoComprobante: this.convertDocumentType(),
        responsableId: this.actorId(),
        responsableNombre: this.actorName(),
        moneda: cotizacion.moneda,
        formaPago: 'CONTADO',
      })
      .pipe(finalize(() => this.convertingId.set(null)))
      .subscribe({
        next: (response) => this.upsert(response.cotizacion, 'Cotizacion convertida en venta.'),
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected statusSeverity(estado: string): 'success' | 'warn' | 'danger' | 'info' {
    if (estado === 'CONVERTIDA' || estado === 'ACEPTADA') {
      return 'success';
    }
    if (estado === 'RECHAZADA' || estado === 'VENCIDA') {
      return 'danger';
    }
    if (estado === 'ENVIADA') {
      return 'warn';
    }
    return 'info';
  }

  private upsert(cotizacion: Cotizacion, message: string): void {
    this.cotizaciones.set(
      this.cotizaciones().map((item) => (item.id === cotizacion.id ? cotizacion : item)),
    );
    this.successMessage.set(message);
  }

  private emptyForm(): QuoteForm {
    return {
      clienteId: null,
      sucursalId: null,
      fechaVencimiento: '',
      moneda: 'PEN',
      observacion: '',
      detalles: [
        { productoId: null, descripcion: '', cantidad: 1, precioUnitario: 0, descuento: 0 },
      ],
    };
  }

  private actorId(): string {
    const current = this.session.currentSession();
    return String(current?.userId ?? current?.username ?? 'usuario');
  }

  private actorName(): string {
    const current = this.session.currentSession();
    return current?.nombres || current?.username || 'Usuario';
  }

  private resolveError(error: unknown): string {
    if (typeof error === 'object' && error !== null) {
      const httpError = error as { error?: { message?: string; details?: string[] } };
      return (
        httpError.error?.details?.[0] ||
        httpError.error?.message ||
        'No se pudo completar la operacion.'
      );
    }
    return 'No se pudo completar la operacion.';
  }
}
