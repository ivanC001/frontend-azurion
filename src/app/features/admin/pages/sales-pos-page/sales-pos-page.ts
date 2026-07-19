import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';

import { AuthSessionService } from '@core/auth/auth-session.service';
import { LowStockAlertService } from '@core/services/low-stock-alert.service';
import { UiToastService } from '@core/services/ui-toast.service';
import {
  AdminSaasApiService,
  Caja,
  Cliente,
  Producto,
  RegistrarVentaCajaResponse,
  StockItem,
  TaxResolution,
  TipoComprobanteVenta,
  VentaProductoRequest,
} from '../../data/admin-saas-api.service';

type FormaPago = 'CONTADO' | 'CREDITO';
type MetodoPago = 'EFECTIVO' | 'TARJETA' | 'YAPE' | 'PLIN' | 'TRANSFERENCIA';
type ProductFilter = 'TODOS' | 'CON_STOCK' | 'STOCK_BAJO' | 'SERVICIOS';
type PrintFormat = 'A4' | '80MM' | '58MM';

interface PosCartItem {
  readonly producto: Producto;
  cantidad: number;
  descuento: number;
}

interface SaleTicketItem {
  readonly sku: string;
  readonly nombre: string;
  readonly cantidad: number;
  readonly precioUnitario: number;
  readonly descuento: number;
  readonly total: number;
}

interface SaleTicket {
  readonly externalId: string;
  readonly fecha: string;
  readonly requestedDocument: string;
  readonly facturacionMessage: string;
  readonly empresaNombre: string;
  readonly empresaRuc: string;
  readonly logoUrl: string | null;
  readonly sucursalNombre: string;
  readonly cajaNombre: string;
  readonly vendedor: string;
  readonly clienteNombre: string;
  readonly clienteDocumento: string;
  readonly formaPago: FormaPago;
  readonly metodoPago: MetodoPago;
  readonly items: readonly SaleTicketItem[];
  readonly subtotal: number;
  readonly descuento: number;
  readonly total: number;
  readonly recibido: number;
  readonly vuelto: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-sales-pos-page',
  imports: [DecimalPipe, FormsModule, RouterLink, ButtonModule, DialogModule, SelectModule],
  templateUrl: './sales-pos-page.html',
  styleUrl: './sales-pos-page.scss',
})
export class SalesPosPage {
  private readonly api = inject(AdminSaasApiService);
  private readonly session = inject(AuthSessionService);
  private readonly toast = inject(UiToastService);
  private readonly lowStockAlerts = inject(LowStockAlertService);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly productos = signal<Producto[]>([]);
  protected readonly stockSucursal = signal<StockItem[]>([]);
  protected readonly clientes = signal<Cliente[]>([]);
  protected readonly cajas = signal<Caja[]>([]);
  protected readonly cart = signal<PosCartItem[]>([]);
  protected readonly selectedClienteId = signal<number | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly productFilter = signal<ProductFilter>('TODOS');
  protected readonly lastSale = signal<RegistrarVentaCajaResponse | null>(null);
  protected readonly ticketPreview = signal<SaleTicket | null>(null);
  protected readonly ticketDialogVisible = signal(false);
  protected readonly sucursalTax = signal<TaxResolution | null>(null);

  protected readonly selectedCajaId = signal<number | null>(null);
  protected tipoComprobante: TipoComprobanteVenta = 'TICKET_VENTA';
  protected formaPago: FormaPago = 'CONTADO';
  protected metodoPago: MetodoPago = 'EFECTIVO';
  protected montoRecibido = 0;

  protected readonly documentOptions = [
    { label: 'Ticket', value: 'TICKET_VENTA', icon: 'pi-receipt' },
    { label: 'Boleta', value: 'BOLETA', icon: 'pi-file' },
    { label: 'Factura', value: 'FACTURA', icon: 'pi-building' },
  ] as const;

  protected readonly methodOptions = [
    { label: 'Efectivo', value: 'EFECTIVO' },
    { label: 'Tarjeta', value: 'TARJETA' },
    { label: 'Yape', value: 'YAPE' },
    { label: 'Plin', value: 'PLIN' },
    { label: 'Transferencia', value: 'TRANSFERENCIA' },
  ];

  protected readonly cajaOptions = computed(() =>
    this.cajas().map((caja) => ({
      label: `${caja.codigo} - ${caja.nombre}`,
      value: caja.id,
    })),
  );

  protected readonly selectedCaja = computed(
    () => this.cajas().find((caja) => caja.id === this.selectedCajaId()) || null,
  );
  protected readonly selectedCliente = computed(
    () => this.clientes().find((cliente) => cliente.id === this.selectedClienteId()) || null,
  );
  protected readonly sucursalTaxLabel = computed(() => {
    const tax = this.sucursalTax();
    return tax ? `IGV ${Number(tax.porcentajeIgv || 0).toFixed(0)}%` : 'IGV por resolver';
  });

  protected readonly filteredProducts = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const filter = this.productFilter();

    return this.productos()
      .filter((producto) => producto.activo)
      .filter((producto) => {
        if (filter === 'CON_STOCK') {
          return !this.isService(producto) && this.stockDisponibleSucursal(producto) > 0;
        }
        if (filter === 'STOCK_BAJO') {
          const minimum = Number(producto.stockMinimoGlobal ?? producto.stockMinimo ?? 0);
          return !this.isService(producto) && this.stockDisponibleSucursal(producto) <= minimum;
        }
        if (filter === 'SERVICIOS') {
          return this.isService(producto);
        }
        return true;
      })
      .filter((producto) => {
        if (!query) {
          return true;
        }
        return [
          producto.nombre,
          producto.sku,
          producto.codigo,
          producto.codigoBarras,
          producto.descripcion,
        ].some((value) => (value || '').toLowerCase().includes(query));
      })
      .slice(0, 60);
  });

  protected readonly subtotal = computed(() =>
    this.cart().reduce(
      (total, item) => total + Number(item.producto.precio) * Number(item.cantidad),
      0,
    ),
  );

  protected readonly descuentoTotal = computed(() =>
    this.cart().reduce((total, item) => total + Number(item.descuento || 0), 0),
  );

  protected readonly total = computed(() => Math.max(this.subtotal() - this.descuentoTotal(), 0));

  protected readonly vuelto = computed(() =>
    this.formaPago === 'CONTADO' && this.metodoPago === 'EFECTIVO'
      ? Math.max(Number(this.montoRecibido || 0) - this.total(), 0)
      : 0,
  );

  protected readonly totalUnits = computed(() =>
    this.cart().reduce((total, item) => total + Number(item.cantidad), 0),
  );

  constructor() {
    this.loadData();
  }

  protected loadData(): void {
    this.loading.set(true);
    forkJoin({
      productos: this.api.listProductos(),
      clientes: this.api.listClientes(),
      cajas: this.api.listCajas('ABIERTA'),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ productos, clientes, cajas }) => {
          this.productos.set(productos);
          this.clientes.set(clientes);
          this.cajas.set(cajas);
          const cajaId = this.selectedCajaId() || cajas[0]?.id || null;
          this.selectedCajaId.set(cajaId);
          this.loadStockSucursal();
        },
        error: (error: unknown) => this.toast.error(this.resolveError(error)),
      });
  }

  protected selectFilter(filter: ProductFilter): void {
    this.productFilter.set(filter);
  }

  protected addSearchMatch(): void {
    const query = this.searchTerm().trim().toLowerCase();
    if (!query) {
      return;
    }

    const exact = this.productos().find((producto) =>
      [producto.codigoBarras, producto.sku, producto.codigo].some(
        (value) => (value || '').trim().toLowerCase() === query,
      ),
    );
    const product =
      exact || (this.filteredProducts().length === 1 ? this.filteredProducts()[0] : null);
    if (!product) {
      this.toast.info('Selecciona un producto de los resultados o completa su codigo.');
      return;
    }

    this.addProduct(product);
    this.searchTerm.set('');
  }

  protected addProduct(producto: Producto): void {
    const disponibleSucursal = this.stockDisponibleSucursal(producto);
    if (!this.isService(producto) && disponibleSucursal <= 0) {
      const stockEmpresa = Number(producto.stockCantidad || 0);
      const message =
        stockEmpresa > 0
          ? `${producto.nombre} tiene ${stockEmpresa} unidad(es) en la empresa, pero no puede venderse desde esta sucursal.`
          : `${producto.nombre} no tiene stock disponible.`;
      this.toast.warn(message);
      return;
    }

    const current = this.cart();
    const existing = current.find((item) => item.producto.id === producto.id);
    if (existing) {
      this.changeQuantity(producto.id, 1);
      return;
    }

    this.cart.set([...current, { producto, cantidad: 1, descuento: 0 }]);
    this.montoRecibido = this.total();
  }

  protected changeQuantity(productId: number, delta: number): void {
    this.cart.update((items) =>
      items.map((item) => {
        if (item.producto.id !== productId) {
          return item;
        }
        const max = this.isService(item.producto)
          ? 9999
          : this.stockDisponibleSucursal(item.producto);
        const cantidad = Math.min(Math.max(item.cantidad + delta, 1), max);
        return { ...item, cantidad };
      }),
    );
    this.montoRecibido = this.total();
  }

  protected updateQuantity(productId: number, quantity: number): void {
    const item = this.cart().find((row) => row.producto.id === productId);
    if (!item) {
      return;
    }
    const max = this.isService(item.producto) ? 9999 : this.stockDisponibleSucursal(item.producto);
    const safeQuantity = Math.min(Math.max(Number(quantity || 1), 1), max);
    this.cart.update((items) =>
      items.map((row) =>
        row.producto.id === productId ? { ...row, cantidad: safeQuantity } : row,
      ),
    );
    this.montoRecibido = this.total();
  }

  protected updateDiscount(productId: number, discount: number): void {
    this.cart.update((items) =>
      items.map((item) => {
        if (item.producto.id !== productId) {
          return item;
        }
        const maximum = Number(item.producto.precio) * item.cantidad;
        return { ...item, descuento: Math.min(Math.max(Number(discount || 0), 0), maximum) };
      }),
    );
    this.montoRecibido = this.total();
  }

  protected removeProduct(productId: number): void {
    this.cart.update((items) => items.filter((item) => item.producto.id !== productId));
    this.montoRecibido = this.total();
  }

  protected clearSale(): void {
    this.cart.set([]);
    this.selectedClienteId.set(null);
    this.tipoComprobante = 'TICKET_VENTA';
    this.formaPago = 'CONTADO';
    this.metodoPago = 'EFECTIVO';
    this.montoRecibido = 0;
    this.lastSale.set(null);
    this.ticketDialogVisible.set(false);
  }

  protected selectDocument(type: TipoComprobanteVenta): void {
    this.tipoComprobante = type;
    if (type === 'TICKET_VENTA') {
      this.selectedClienteId.set(null);
      return;
    }

    if (type === 'FACTURA' && !this.isClienteRucValido(this.selectedCliente())) {
      this.selectedClienteId.set(null);
      this.toast.info(
        'Para emitir una factura selecciona un cliente registrado con RUC de 11 digitos.',
      );
    }
  }

  protected clienteOptions(): { label: string; value: number }[] {
    return this.clientes()
      .filter((cliente) => cliente.activo)
      .filter((cliente) => this.tipoComprobante !== 'FACTURA' || this.isClienteRucValido(cliente))
      .map((cliente) => ({
        label: `${cliente.tipoDocumento === '6' ? 'RUC' : 'DNI'} ${cliente.numeroDocumento} - ${cliente.nombre}`,
        value: cliente.id,
      }));
  }

  protected clientePlaceholder(): string {
    return this.tipoComprobante === 'FACTURA'
      ? 'Buscar empresa por RUC o razon social'
      : 'Buscar DNI, RUC o nombre';
  }

  protected itemTotal(item: PosCartItem): number {
    return Math.max(
      Number(item.producto.precio) * Number(item.cantidad) - Number(item.descuento || 0),
      0,
    );
  }

  protected isService(producto: Producto): boolean {
    return (
      (producto.tipoProducto || '').toUpperCase() === 'SERVICIO' ||
      producto.manejaStock === false ||
      producto.stock === false
    );
  }

  protected onCajaChange(cajaId: number | null): void {
    if (cajaId === this.selectedCajaId()) {
      return;
    }
    this.selectedCajaId.set(cajaId);
    this.cart.set([]);
    this.montoRecibido = 0;
    this.loadStockSucursal();
  }

  protected stockDisponibleSucursal(producto: Producto): number {
    if (this.isService(producto)) {
      return 9999;
    }
    return this.stockSucursal()
      .filter((row) => row.productoId === producto.id)
      .reduce((total, row) => total + Math.max(Number(row.cantidad || 0), 0), 0);
  }

  protected stockEmpresa(producto: Producto): number {
    return Number(producto.stockCantidad || 0);
  }

  protected productImage(producto: Producto): string | null {
    return producto.foto || producto.imagenUrl || null;
  }

  protected productInitials(producto: Producto): string {
    return producto.nombre
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase();
  }

  protected submitSale(): void {
    const error = this.validateSale();
    if (error) {
      this.toast.warn(error);
      return;
    }

    const cajaId = this.selectedCajaId() as number;
    const cliente = this.selectedCliente();
    const ticketDraft = this.buildTicketDraft();
    this.saving.set(true);

    this.api
      .registrarVentaCaja(cajaId, {
        tipoComprobante: this.tipoComprobante,
        total: Number(this.total().toFixed(2)),
        responsableId: this.actorId(),
        responsableNombre: this.actorName(),
        clienteId: cliente?.id || null,
        clienteTipoDocumento: cliente?.tipoDocumento || null,
        clienteNumeroDocumento: cliente?.numeroDocumento || null,
        clienteNombre: cliente?.nombre || null,
        moneda: 'PEN',
        tipoCambio: 1,
        formaPago: this.formaPago,
        descripcion: `Venta POS - ${this.metodoPago}`,
        items: this.cart().flatMap((item) => this.buildSaleRequestItems(item)),
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (response) => {
          this.lastSale.set(response);
          this.ticketPreview.set({
            ...ticketDraft,
            externalId: response.venta.externalId,
            fecha: response.venta.fechaVenta || ticketDraft.fecha,
            facturacionMessage: response.facturacion.message,
          });
          this.ticketDialogVisible.set(true);
          this.toast.success(response.facturacion.message, 'Venta registrada');
          this.lowStockAlerts.refresh(true);
          this.cart.set([]);
          this.montoRecibido = 0;
          this.loadData();
        },
        error: (error: unknown) => this.toast.error(this.resolveError(error)),
      });
  }

  protected openLastTicket(): void {
    if (!this.ticketPreview()) {
      this.toast.info('Aun no existe un ticket generado en esta sesion.');
      return;
    }
    this.ticketDialogVisible.set(true);
  }

  protected printTicket(format: PrintFormat): void {
    const ticket = this.ticketPreview();
    if (!ticket) {
      return;
    }

    const printWindow = window.open(
      '',
      '_blank',
      format === 'A4' ? 'width=980,height=900' : 'width=480,height=900',
    );
    if (!printWindow) {
      this.toast.warn(
        'El navegador bloqueo la ventana de impresion. Habilita ventanas emergentes para Azurion.',
      );
      return;
    }

    printWindow.document.open();
    printWindow.document.write(this.buildPrintableTicket(ticket, format));
    printWindow.document.close();
  }

  protected documentTypeLabel(type: TipoComprobanteVenta): string {
    if (type === 'FACTURA') {
      return 'Factura electronica';
    }
    if (type === 'BOLETA') {
      return 'Boleta electronica';
    }
    return 'Ticket de venta';
  }

  protected previewDate(value: string): string {
    return this.formatTicketDate(value);
  }

  private validateSale(): string | null {
    if (!this.selectedCajaId()) {
      return 'Abre o selecciona una caja antes de vender.';
    }
    if (!this.cart().length) {
      return 'Agrega al menos un producto al carrito.';
    }
    const cliente = this.selectedCliente();
    if (this.tipoComprobante === 'FACTURA' && !this.isClienteRucValido(cliente)) {
      return 'La factura requiere un cliente registrado con RUC de 11 digitos.';
    }
    if (
      this.tipoComprobante === 'BOLETA' &&
      this.total() > 500 &&
      (!cliente || cliente.tipoDocumento !== '1' || !/^\d{8}$/.test(cliente.numeroDocumento))
    ) {
      return 'La boleta mayor a S/ 500 requiere un cliente con DNI.';
    }
    if (this.formaPago === 'CREDITO') {
      if (!cliente) {
        return 'Selecciona un cliente para realizar una venta al credito.';
      }
      if (Number(cliente.creditoDisponible) < this.total()) {
        return `El cliente solo tiene S/ ${Number(cliente.creditoDisponible).toFixed(2)} de credito disponible.`;
      }
    }
    if (
      this.formaPago === 'CONTADO' &&
      this.metodoPago === 'EFECTIVO' &&
      Number(this.montoRecibido) < this.total()
    ) {
      return 'El monto recibido es menor al total de la venta.';
    }
    const invalidStock = this.cart().find(
      (item) =>
        !this.isService(item.producto) &&
        this.stockDisponibleSucursal(item.producto) < item.cantidad,
    );
    if (invalidStock) {
      return `${invalidStock.producto.nombre} no tiene suficiente stock en esta sucursal.`;
    }
    return null;
  }

  private isClienteRucValido(cliente: Cliente | null): boolean {
    return !!cliente && cliente.tipoDocumento === '6' && /^\d{11}$/.test(cliente.numeroDocumento);
  }

  private loadStockSucursal(): void {
    const sucursalId = this.selectedCaja()?.sucursalId;
    if (!sucursalId) {
      this.stockSucursal.set([]);
      this.sucursalTax.set(null);
      return;
    }

    this.api.getSucursalTributaria(sucursalId).subscribe({
      next: (tax) => this.sucursalTax.set(tax),
      error: () => this.sucursalTax.set(null),
    });
    this.api.listStockBySucursal(sucursalId).subscribe({
      next: (stock) => this.stockSucursal.set(stock),
      error: (error: unknown) => {
        this.stockSucursal.set([]);
        this.toast.error(this.resolveError(error));
      },
    });
  }

  private buildSaleRequestItems(item: PosCartItem): VentaProductoRequest[] {
    const base = {
      productoId: item.producto.id,
      precioUnitario: Number(item.producto.precio),
      descripcion: item.producto.nombre,
      unidad: 'NIU',
    };

    if (this.isService(item.producto)) {
      return [
        {
          ...base,
          almacenId: item.producto.almacenId,
          cantidad: item.cantidad,
          descuento: Number(item.descuento || 0),
        },
      ];
    }

    let cantidadPendiente = Number(item.cantidad);
    let descuentoPendiente = Number(item.descuento || 0);
    const rows = this.stockSucursal()
      .filter((row) => row.productoId === item.producto.id && Number(row.cantidad || 0) > 0)
      .sort((a, b) => Number(b.cantidad || 0) - Number(a.cantidad || 0));
    const requestItems: VentaProductoRequest[] = [];

    for (const row of rows) {
      if (cantidadPendiente <= 0) {
        break;
      }
      const cantidad = Math.min(cantidadPendiente, Number(row.cantidad || 0));
      const maxDescuentoLinea = Number(item.producto.precio) * cantidad;
      const descuento = Math.min(descuentoPendiente, maxDescuentoLinea);
      requestItems.push({
        ...base,
        almacenId: row.almacenId,
        cantidad,
        descuento,
      });
      cantidadPendiente -= cantidad;
      descuentoPendiente -= descuento;
    }

    return requestItems;
  }

  private buildTicketDraft(): SaleTicket {
    const current = this.session.currentSession();
    const caja = this.selectedCaja();
    const cliente = this.selectedCliente();

    return {
      externalId: '',
      fecha: new Date().toISOString(),
      requestedDocument: this.documentTypeLabel(this.tipoComprobante),
      facturacionMessage: '',
      empresaNombre: current?.empresa?.razonSocial || 'AZURION',
      empresaRuc: current?.empresa?.ruc || '',
      logoUrl: current?.empresa?.logoPanelUrl || null,
      sucursalNombre: caja?.sucursalNombre || 'Sucursal',
      cajaNombre: caja ? `${caja.codigo} - ${caja.nombre}` : 'Caja',
      vendedor: this.actorName(),
      clienteNombre: cliente?.nombre || 'Cliente general',
      clienteDocumento: cliente?.numeroDocumento || '-',
      formaPago: this.formaPago,
      metodoPago: this.metodoPago,
      items: this.cart().map((item) => ({
        sku: item.producto.sku,
        nombre: item.producto.nombre,
        cantidad: item.cantidad,
        precioUnitario: Number(item.producto.precio),
        descuento: Number(item.descuento || 0),
        total: this.itemTotal(item),
      })),
      subtotal: this.subtotal(),
      descuento: this.descuentoTotal(),
      total: this.total(),
      recibido:
        this.formaPago === 'CONTADO' && this.metodoPago === 'EFECTIVO'
          ? Number(this.montoRecibido || 0)
          : this.total(),
      vuelto: this.vuelto(),
    };
  }

  private buildPrintableTicket(ticket: SaleTicket, format: PrintFormat): string {
    const thermal = format !== 'A4';
    const width = format === '58MM' ? '58mm' : format === '80MM' ? '80mm' : '210mm';
    const margin = format === '58MM' ? '2mm' : format === '80MM' ? '3mm' : '12mm';
    const fontSize = format === '58MM' ? '9px' : format === '80MM' ? '11px' : '12px';
    const titleSize = format === '58MM' ? '14px' : format === '80MM' ? '18px' : '24px';
    const rows = ticket.items
      .map(
        (item) => `
      <tr>
        <td><strong>${this.escapeHtml(item.nombre)}</strong><small>${this.escapeHtml(item.sku)}</small></td>
        <td class="number">${this.formatNumber(item.cantidad, 0)}</td>
        <td class="number">${this.formatNumber(item.precioUnitario)}</td>
        ${thermal ? '' : `<td class="number">${this.formatNumber(item.descuento)}</td>`}
        <td class="number">${this.formatNumber(item.total)}</td>
      </tr>
    `,
      )
      .join('');
    const logo = ticket.logoUrl
      ? `<img class="logo" src="${this.escapeHtml(ticket.logoUrl)}" alt="Logo" />`
      : '';

    return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${this.escapeHtml(ticket.externalId)}</title>
  <style>
    @page { size: ${thermal ? width + ' auto' : 'A4'}; margin: ${margin}; }
    * { box-sizing: border-box; }
    body { color: #111; font-family: Arial, sans-serif; font-size: ${fontSize}; margin: 0 auto; padding: 0; width: ${thermal ? width : '100%'}; }
    .ticket { margin: 0 auto; max-width: ${thermal ? width : '185mm'}; padding: ${thermal ? '1mm' : '8mm'}; }
    .header { align-items: center; border-bottom: ${thermal ? '1px dashed #111' : '2px solid #111'}; display: ${thermal ? 'block' : 'grid'}; gap: 12px; grid-template-columns: auto 1fr auto; padding-bottom: 8px; text-align: ${thermal ? 'center' : 'left'}; }
    .logo { max-height: ${thermal ? '16mm' : '24mm'}; max-width: ${thermal ? '35mm' : '42mm'}; object-fit: contain; }
    h1 { font-size: ${titleSize}; margin: 4px 0; }
    p { margin: 2px 0; }
    .doc { border: 1px solid #111; padding: 6px; text-align: center; }
    .doc strong, .doc span { display: block; }
    .meta { display: grid; gap: 3px 12px; grid-template-columns: ${thermal ? '1fr' : 'repeat(2, 1fr)'}; padding: 8px 0; }
    .meta div { display: flex; justify-content: space-between; gap: 6px; }
    .meta span { color: #555; }
    table { border-collapse: collapse; margin-top: 4px; width: 100%; }
    th { border-bottom: 1px solid #111; font-size: .86em; padding: 5px 2px; text-align: left; }
    td { border-bottom: 1px ${thermal ? 'dashed' : 'solid'} #aaa; padding: 5px 2px; vertical-align: top; }
    td small { color: #555; display: block; font-size: .78em; margin-top: 2px; }
    .number { text-align: right; white-space: nowrap; }
    .totals { margin-left: ${thermal ? '0' : 'auto'}; margin-top: 8px; width: ${thermal ? '100%' : '74mm'}; }
    .totals div { display: flex; justify-content: space-between; padding: 2px 0; }
    .totals .grand { border-top: 2px solid #111; font-size: 1.35em; font-weight: 800; margin-top: 4px; padding-top: 6px; }
    .footer { border-top: 1px ${thermal ? 'dashed' : 'solid'} #111; margin-top: 12px; padding-top: 8px; text-align: center; }
    .notice { font-size: .82em; margin-top: 5px; }
    @media print { .ticket { padding: 0; } }
  </style>
</head>
<body>
  <main class="ticket">
    <header class="header">
      ${logo}
      <div>
        <h1>${this.escapeHtml(ticket.empresaNombre)}</h1>
        <p>RUC: ${this.escapeHtml(ticket.empresaRuc || '-')}</p>
        <p>${this.escapeHtml(ticket.sucursalNombre)}</p>
      </div>
      <div class="doc">
        <strong>Ticket de venta</strong>
        <span>${this.escapeHtml(ticket.externalId)}</span>
      </div>
    </header>
    <section class="meta">
      <div><span>Fecha</span><strong>${this.escapeHtml(this.formatTicketDate(ticket.fecha))}</strong></div>
      <div><span>Caja</span><strong>${this.escapeHtml(ticket.cajaNombre)}</strong></div>
      <div><span>Vendedor</span><strong>${this.escapeHtml(ticket.vendedor)}</strong></div>
      <div><span>Cliente</span><strong>${this.escapeHtml(ticket.clienteNombre)}</strong></div>
      <div><span>Documento</span><strong>${this.escapeHtml(ticket.clienteDocumento)}</strong></div>
      <div><span>Comprobante solicitado</span><strong>${this.escapeHtml(ticket.requestedDocument)}</strong></div>
      <div><span>Pago</span><strong>${this.escapeHtml(ticket.formaPago === 'CREDITO' ? 'Credito' : ticket.metodoPago)}</strong></div>
    </section>
    <table>
      <thead><tr><th>Producto</th><th class="number">Cant.</th><th class="number">P. Unit.</th>${thermal ? '' : '<th class="number">Desc.</th>'}<th class="number">Total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <section class="totals">
      <div><span>Subtotal</span><strong>S/ ${this.formatNumber(ticket.subtotal)}</strong></div>
      <div><span>Descuento</span><strong>- S/ ${this.formatNumber(ticket.descuento)}</strong></div>
      <div class="grand"><span>TOTAL</span><strong>S/ ${this.formatNumber(ticket.total)}</strong></div>
      <div><span>Recibido</span><strong>S/ ${this.formatNumber(ticket.recibido)}</strong></div>
      <div><span>Vuelto</span><strong>S/ ${this.formatNumber(ticket.vuelto)}</strong></div>
    </section>
    <footer class="footer">
      <strong>Gracias por su compra</strong>
      <p class="notice">${this.escapeHtml(ticket.requestedDocument === 'Ticket de venta' ? 'Ticket interno. No representa comprobante electronico SUNAT.' : `${ticket.requestedDocument} solicitada. El comprobante oficial se procesa mediante Azurion Facturador.`)}</p>
    </footer>
  </main>
  <script>window.addEventListener('load', () => { window.print(); });<\/script>
</body>
</html>`;
  }

  private formatTicketDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('es-PE');
  }

  private formatNumber(value: number, decimals = 2): string {
    return Number(value || 0).toFixed(decimals);
  }

  private escapeHtml(value: string): string {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
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
      if (httpError.status === 0) {
        return 'No se pudo conectar con el servidor. Intenta nuevamente.';
      }
      return httpError.error?.message || 'No se pudo completar la venta.';
    }
    return 'No se pudo completar la venta.';
  }
}
