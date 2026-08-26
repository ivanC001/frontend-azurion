import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, Subscription, finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';

import { AuthSessionService } from '@core/auth/auth-session.service';
import { LowStockAlertService } from '@features/admin/services/low-stock-alert.service';
import { UiToastService } from '@core/services/ui-toast.service';
import { createClientOperationId } from '@core/utils/client-operation-id';
import { canIssueElectronicDocuments } from '@features/facturador/data/facturador-capability';
import {
  AdminSaasApiService,
  Caja,
  Cliente,
  FormatoImpresionComprobante,
  Producto,
  RegistrarVentaCajaResponse,
  StockItem,
  TaxResolution,
  TipoComprobanteVenta,
  VentaRecord,
  VentaProductoRequest,
  VentaStatusStreamEvent,
} from '../../data/admin-saas-api.service';
import { isIdentifiedCustomer } from '../../shared/customer-document-rules';

type FormaPago = 'CONTADO' | 'CREDITO';
type MetodoPago = 'EFECTIVO' | 'TARJETA' | 'YAPE' | 'PLIN' | 'TRANSFERENCIA';
type ProductFilter = 'TODOS' | 'CON_STOCK' | 'STOCK_BAJO' | 'SERVICIOS';

interface PosCartItem {
  readonly producto: Producto;
  cantidad: number;
  descuento: number;
}

interface SaleDocumentStatus {
  readonly ventaId: number;
  readonly externalId: string;
  readonly fecha: string;
  readonly requestedDocument: string;
  readonly clienteNombre: string;
  readonly clienteDocumento: string;
  readonly formaPago: string;
  readonly metodoPago: string;
  readonly total: number;
  readonly facturacionEstado: string;
  readonly facturacionMessage: string;
  readonly officialNumber: string | null;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-sales-pos-page',
  imports: [DecimalPipe, FormsModule, RouterLink, ButtonModule, DialogModule, SelectModule],
  templateUrl: './sales-pos-page.html',
  styleUrl: './sales-pos-page.scss',
})
export class SalesPosPage implements OnDestroy {
  private static readonly STATUS_STREAM_RECONNECT_MS = 3000;
  private static readonly DOCUMENT_POLL_INTERVAL_MS = 2000;
  private static readonly DOCUMENT_MAX_POLL_ATTEMPTS = 30;

  private readonly api = inject(AdminSaasApiService);
  private readonly session = inject(AuthSessionService);
  private readonly toast = inject(UiToastService);
  private readonly lowStockAlerts = inject(LowStockAlertService);
  private pendingSaleOperationId: string | null = null;

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
  protected readonly saleDocument = signal<SaleDocumentStatus | null>(null);
  protected readonly documentDialogVisible = signal(false);
  protected readonly downloadingDocument = signal<FormatoImpresionComprobante | null>(null);
  protected readonly retryingDocument = signal(false);
  protected readonly sucursalTax = signal<TaxResolution | null>(null);

  private ventaStatusStreamSubscription: Subscription | null = null;
  private statusStreamReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private documentPollTimer: ReturnType<typeof setTimeout> | null = null;
  private documentPollAttempts = 0;
  private destroyed = false;

  protected readonly selectedCajaId = signal<number | null>(null);
  protected readonly tipoComprobante = signal<TipoComprobanteVenta>('TICKET_VENTA');
  protected readonly formaPago = signal<FormaPago>('CONTADO');
  protected readonly metodoPago = signal<MetodoPago>('EFECTIVO');
  protected readonly montoRecibido = signal(0);

  protected readonly documentOptions = computed(() => {
    const options: Array<{
      label: string;
      value: TipoComprobanteVenta;
      icon: string;
    }> = [{ label: 'Ticket', value: 'TICKET_VENTA', icon: 'pi-receipt' }];

    if (canIssueElectronicDocuments(this.session.currentSession()?.empresa)) {
      options.push(
        { label: 'Boleta', value: 'BOLETA', icon: 'pi-file' },
        { label: 'Factura', value: 'FACTURA', icon: 'pi-building' },
      );
    }
    return options;
  });

  protected readonly methodOptions = [
    { label: 'Efectivo', value: 'EFECTIVO' },
    { label: 'Tarjeta', value: 'TARJETA' },
    { label: 'Yape', value: 'YAPE' },
    { label: 'Plin', value: 'PLIN' },
    { label: 'Transferencia', value: 'TRANSFERENCIA' },
  ];

  protected readonly cajaOptions = computed(() =>
    this.cajas().map((caja) => ({
      label: `${caja.cajaCodigo} - ${caja.cajaNombre}`,
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
    if (!tax) {
      return 'IGV por resolver';
    }
    return Number(tax.porcentajeIgv || 0) > 0
      ? `Precio final incluye IGV ${Number(tax.porcentajeIgv).toFixed(0)}%`
      : 'Operacion sin IGV';
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

  protected readonly totalUnits = computed(() =>
    this.cart().reduce((acc, item) => acc + item.cantidad, 0),
  );

  protected readonly vuelto = computed(() => {
    const received = Number(this.montoRecibido() || 0);
    const tot = this.total();
    return Math.max(received - tot, 0);
  });

  protected readonly taxBreakdown = computed(() => {
    let operacionGravada = 0;
    let operacionExonerada = 0;
    let operacionInafecta = 0;
    let igv = 0;

    for (const item of this.cart()) {
      const lineTotal = this.itemTotal(item);
      const affectation = this.productTaxAffectation(item.producto);
      const rate = this.productTaxRate(item.producto);
      if (affectation.startsWith('1') && rate > 0) {
        const base = this.roundMoney(lineTotal / (1 + rate / 100));
        operacionGravada += base;
        igv += this.roundMoney(lineTotal - base);
      } else if (affectation.startsWith('2')) {
        operacionExonerada += lineTotal;
      } else {
        operacionInafecta += lineTotal;
      }
    }

    return {
      operacionGravada: this.roundMoney(operacionGravada),
      operacionExonerada: this.roundMoney(operacionExonerada),
      operacionInafecta: this.roundMoney(operacionInafecta),
      igv: this.roundMoney(igv),
    };
  });

  constructor() {
    this.startVentasStatusStream();
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.stopVentasStatusStream();
    this.stopDocumentPolling();
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
    const rawQuery = this.searchTerm().trim();
    const query = rawQuery.toLowerCase();
    if (!rawQuery) {
      return;
    }

    const exact = this.productos().find((producto) =>
      [producto.codigoBarras, producto.sku, producto.codigo].some(
        (value) => (value || '').trim().toLowerCase() === query,
      ),
    );
    if (exact) {
      this.addProduct(exact);
      this.searchTerm.set('');
      return;
    }

    this.api.lookupProducto(rawQuery).subscribe({
      next: (remoteProduct) => {
        const product =
          remoteProduct ||
          (this.filteredProducts().length === 1 ? this.filteredProducts()[0] : null);
        if (!product) {
          this.toast.info('No se encontró un producto con ese código, SKU o código de barras.');
          return;
        }
        if (!product.activo) {
          this.toast.info(`${product.nombre} está inactivo y no puede agregarse a la venta.`);
          return;
        }
        this.addProduct(product);
        this.searchTerm.set('');
      },
      error: () =>
        this.toast.error('No se pudo consultar el código escaneado. Intenta nuevamente.'),
    });
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
    this.montoRecibido.set(this.total());
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
    this.montoRecibido.set(this.total());
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
    this.montoRecibido.set(this.total());
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
    this.montoRecibido.set(this.total());
  }

  protected removeProduct(productId: number): void {
    this.cart.update((items) => items.filter((item) => item.producto.id !== productId));
    this.montoRecibido.set(this.total());
  }

  protected clearSale(): void {
    this.cart.set([]);
    this.selectedClienteId.set(null);
    this.tipoComprobante.set('TICKET_VENTA');
    this.formaPago.set('CONTADO');
    this.metodoPago.set('EFECTIVO');
    this.montoRecibido.set(0);
    this.saleDocument.set(null);
    this.documentDialogVisible.set(false);
    this.stopDocumentPolling();
  }

  protected selectDocument(type: TipoComprobanteVenta): void {
    if (
      type !== 'TICKET_VENTA' &&
      !canIssueElectronicDocuments(this.session.currentSession()?.empresa)
    ) {
      this.tipoComprobante.set('TICKET_VENTA');
      this.toast.info(
        'Completa la configuracion fiscal de una empresa peruana para emitir boletas o facturas.',
        'Solo ticket disponible',
      );
      return;
    }
    this.tipoComprobante.set(type);
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
      .filter((cliente) => this.tipoComprobante() !== 'FACTURA' || this.isClienteRucValido(cliente))
      .map((cliente) => ({
        label: `${cliente.tipoDocumento === '6' ? 'RUC' : 'DNI'} ${cliente.numeroDocumento} - ${cliente.nombre}`,
        value: cliente.id,
      }));
  }

  protected clientePlaceholder(): string {
    return this.tipoComprobante() === 'FACTURA'
      ? 'Buscar empresa por RUC o razon social'
      : 'Buscar DNI, RUC o nombre';
  }

  protected itemTotal(item: PosCartItem): number {
    return Math.max(
      Number(item.producto.precio || 0) * Number(item.cantidad || 0) - Number(item.descuento || 0),
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
    this.montoRecibido.set(0);
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
    if (this.saving()) {
      return;
    }
    const error = this.validateSale();
    if (error) {
      this.toast.warn(error);
      return;
    }

    const cajaId = this.selectedCajaId() as number;
    const cliente = this.selectedCliente();
    const clientOperationId = this.pendingSaleOperationId ?? createClientOperationId('sale-pos');
    this.pendingSaleOperationId = clientOperationId;
    this.saving.set(true);

    this.api
      .registrarVentaCaja(cajaId, {
        tipoComprobante: this.tipoComprobante(),
        total: Number(this.total().toFixed(2)),
        clienteId: cliente?.id || null,
        clienteTipoDocumento: cliente?.tipoDocumento || null,
        clienteNumeroDocumento: cliente?.numeroDocumento || null,
        clienteNombre: cliente?.nombre || null,
        moneda: 'PEN',
        tipoCambio: 1,
        formaPago: this.formaPago(),
        metodoPago: this.formaPago() === 'CREDITO' ? 'CREDITO' : this.metodoPago(),
        descripcion: `Venta POS - ${this.metodoPago()}`,
        clientOperationId,
        items: this.cart().flatMap((item) => this.buildSaleRequestItems(item)),
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (response) => {
          this.pendingSaleOperationId = null;
          this.saleDocument.set(this.documentFromSaleResponse(response));
          this.documentDialogVisible.set(true);
          this.startDocumentPolling();
          this.toast.success(response.facturacion.message, 'Venta registrada');
          this.lowStockAlerts.refresh(true);
          this.cart.set([]);
          this.montoRecibido.set(0);
          this.loadData();
        },
        error: (error: unknown) => this.toast.error(this.resolveError(error)),
      });
  }

  protected openLastDocument(): void {
    if (!this.saleDocument()) {
      this.toast.info('Aun no existe un documento generado en esta sesion.');
      return;
    }
    this.documentDialogVisible.set(true);
  }

  private productTaxAffectation(producto: Producto): string {
    return producto.usaConfiguracionEmpresa === false
      ? String(producto.tipoAfectacionIgvId || (producto.afectoIgv === false ? '30' : '10'))
      : String(this.sucursalTax()?.tipoAfectacionCodigo || '10');
  }

  private productTaxRate(producto: Producto): number {
    const affectation = this.productTaxAffectation(producto);
    if (!affectation.startsWith('1')) {
      return 0;
    }
    return Number(
      producto.usaConfiguracionEmpresa === false
        ? (producto.porcentajeImpuesto ?? 18)
        : (this.sucursalTax()?.porcentajeIgv ?? 18),
    );
  }

  private roundMoney(value: number): number {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  protected openOfficialDocument(formato: FormatoImpresionComprobante): void {
    const sale = this.saleDocument();
    if (!sale || !this.isOfficialDocumentReady(sale) || this.downloadingDocument()) {
      return;
    }

    this.downloadingDocument.set(formato);
    this.api
      .downloadVentaPdf(sale.ventaId, formato)
      .pipe(finalize(() => this.downloadingDocument.set(null)))
      .subscribe({
        next: (blob) => {
          const objectUrl = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = objectUrl;
          anchor.target = '_blank';
          anchor.rel = 'noopener noreferrer';
          anchor.click();
          window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
        },
        error: (error: unknown) => this.toast.error(this.resolveError(error)),
      });
  }

  protected retryOfficialDocument(): void {
    const sale = this.saleDocument();
    if (!sale || this.retryingDocument()) {
      return;
    }

    this.retryingDocument.set(true);
    this.api
      .retryVentaDocument(sale.ventaId)
      .pipe(finalize(() => this.retryingDocument.set(false)))
      .subscribe({
        next: (record) => {
          this.applyVentaRecord(record);
          this.startDocumentPolling();
          this.toast.success(
            'El documento volvio a la cola de generacion.',
            'Reintento programado',
          );
        },
        error: (error: unknown) => this.toast.error(this.resolveError(error)),
      });
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

  protected isOfficialDocumentReady(document: SaleDocumentStatus): boolean {
    return document.facturacionEstado === 'ACEPTADO';
  }

  protected documentHasError(document: SaleDocumentStatus): boolean {
    return document.facturacionEstado === 'ERROR' || document.facturacionEstado === 'RECHAZADO';
  }

  protected documentStateLabel(document: SaleDocumentStatus): string {
    if (this.isOfficialDocumentReady(document)) {
      return 'Documento oficial generado';
    }
    if (document.facturacionEstado === 'RECHAZADO') {
      return 'Documento rechazado';
    }
    if (document.facturacionEstado === 'ERROR') {
      return 'No se pudo generar el documento';
    }
    return 'Generando documento oficial';
  }

  private validateSale(): string | null {
    if (!this.selectedCajaId()) {
      return 'Abre o selecciona una caja antes de vender.';
    }
    if (!this.cart().length) {
      return 'Agrega al menos un producto al carrito.';
    }
    const cliente = this.selectedCliente();
    if (this.tipoComprobante() === 'FACTURA' && !this.isClienteRucValido(cliente)) {
      return 'La factura requiere un cliente registrado con RUC de 11 digitos.';
    }
    if (
      this.tipoComprobante() === 'BOLETA' &&
      this.total() > 500 &&
      !isIdentifiedCustomer(cliente?.tipoDocumento, cliente?.numeroDocumento, cliente?.nombre)
    ) {
      return 'La boleta mayor a S/ 500 requiere un cliente identificado con DNI o RUC.';
    }
    if (this.formaPago() === 'CREDITO') {
      if (!cliente) {
        return 'Selecciona un cliente para realizar una venta al credito.';
      }
      if (Number(cliente.creditoDisponible) < this.total()) {
        return `El cliente solo tiene S/ ${Number(cliente.creditoDisponible).toFixed(2)} de credito disponible.`;
      }
    }
    if (
      this.formaPago() === 'CONTADO' &&
      this.metodoPago() === 'EFECTIVO' &&
      Number(this.montoRecibido()) < this.total()
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

  private documentFromSaleResponse(response: RegistrarVentaCajaResponse): SaleDocumentStatus {
    return {
      ventaId: response.venta.id,
      externalId: response.venta.externalId,
      fecha: response.venta.fechaVenta,
      requestedDocument: this.documentTypeLabel(this.tipoComprobante()),
      clienteNombre: response.venta.clienteNombre || 'Cliente general',
      clienteDocumento: response.venta.clienteDocumento || '-',
      formaPago: response.venta.formaPago || this.formaPago(),
      metodoPago: response.venta.metodoPago || this.metodoPago(),
      total: Number(response.venta.total || 0),
      facturacionEstado: this.normalizeDocumentState(response.venta.facturacionEstado),
      facturacionMessage: response.venta.facturadorMensaje || response.facturacion.message,
      officialNumber: response.venta.facturadorTicket || null,
    };
  }

  private applyVentaRecord(record: VentaRecord): void {
    const current = this.saleDocument();
    if (!current || current.ventaId !== record.id) {
      return;
    }

    const updated: SaleDocumentStatus = {
      ...current,
      externalId: record.externalId,
      fecha: record.fechaVenta || current.fecha,
      requestedDocument: this.documentTypeFromBackend(record.facturadorTipoComprobante),
      clienteNombre: record.clienteNombre || current.clienteNombre,
      clienteDocumento: record.clienteDocumento || current.clienteDocumento,
      formaPago: record.formaPago || current.formaPago,
      metodoPago: record.metodoPago || current.metodoPago,
      total: Number(record.total || current.total),
      facturacionEstado: this.normalizeDocumentState(record.facturacionEstado),
      facturacionMessage: record.facturadorMensaje || current.facturacionMessage,
      officialNumber: record.facturadorTicket || current.officialNumber,
    };
    this.updateSaleDocument(current, updated);
  }

  private applyVentaStatusEvent(event: VentaStatusStreamEvent): void {
    const current = this.saleDocument();
    if (!current || current.externalId !== event.externalId) {
      return;
    }

    const updated: SaleDocumentStatus = {
      ...current,
      facturacionEstado: this.normalizeDocumentState(event.facturacionEstado),
      facturacionMessage: event.facturadorMensaje || current.facturacionMessage,
      officialNumber: event.facturadorTicket || current.officialNumber,
    };
    this.updateSaleDocument(current, updated);
  }

  private updateSaleDocument(previous: SaleDocumentStatus, updated: SaleDocumentStatus): void {
    this.saleDocument.set(updated);
    if (this.isOfficialDocumentReady(updated) || this.documentHasError(updated)) {
      this.stopDocumentPolling();
    }
    if (!this.isOfficialDocumentReady(previous) && this.isOfficialDocumentReady(updated)) {
      this.toast.success('El PDF oficial ya esta disponible.', 'Documento generado');
    }
  }

  private startVentasStatusStream(): void {
    this.stopVentasStatusStream();
    this.ventaStatusStreamSubscription = this.api.streamVentasStatus().subscribe({
      next: (event) => this.applyVentaStatusEvent(event),
      error: (error: unknown) => {
        if (!this.isVentasStatusAuthorizationError(error)) {
          this.scheduleVentasStatusReconnect();
        }
      },
      complete: () => this.scheduleVentasStatusReconnect(),
    });
  }

  private stopVentasStatusStream(): void {
    if (this.statusStreamReconnectTimer !== null) {
      clearTimeout(this.statusStreamReconnectTimer);
      this.statusStreamReconnectTimer = null;
    }
    this.ventaStatusStreamSubscription?.unsubscribe();
    this.ventaStatusStreamSubscription = null;
  }

  private scheduleVentasStatusReconnect(): void {
    if (this.destroyed || this.statusStreamReconnectTimer !== null) {
      return;
    }
    this.statusStreamReconnectTimer = setTimeout(() => {
      this.statusStreamReconnectTimer = null;
      if (!this.destroyed) {
        this.startVentasStatusStream();
      }
    }, SalesPosPage.STATUS_STREAM_RECONNECT_MS);
  }

  private isVentasStatusAuthorizationError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error ?? '');
    return message.includes('SSE_HTTP_401') || message.includes('SSE_HTTP_403');
  }

  private startDocumentPolling(): void {
    this.stopDocumentPolling();
    this.documentPollAttempts = 0;
    this.scheduleDocumentRefresh();
  }

  private scheduleDocumentRefresh(): void {
    const sale = this.saleDocument();
    if (
      this.destroyed ||
      !sale ||
      this.isOfficialDocumentReady(sale) ||
      this.documentHasError(sale) ||
      this.documentPollAttempts >= SalesPosPage.DOCUMENT_MAX_POLL_ATTEMPTS
    ) {
      return;
    }

    this.documentPollTimer = setTimeout(() => {
      this.documentPollTimer = null;
      this.documentPollAttempts += 1;
      const current = this.saleDocument();
      if (!current) {
        return;
      }
      this.api.getVenta(current.ventaId).subscribe({
        next: (record) => {
          this.applyVentaRecord(record);
          this.scheduleDocumentRefresh();
        },
        error: () => this.scheduleDocumentRefresh(),
      });
    }, SalesPosPage.DOCUMENT_POLL_INTERVAL_MS);
  }

  private stopDocumentPolling(): void {
    if (this.documentPollTimer !== null) {
      clearTimeout(this.documentPollTimer);
      this.documentPollTimer = null;
    }
  }

  private normalizeDocumentState(value: string | null | undefined): string {
    const normalized = (value || 'PENDIENTE').trim().toUpperCase();
    return normalized || 'PENDIENTE';
  }

  private documentTypeFromBackend(value: string | null | undefined): string {
    if (value === 'FACTURA') {
      return 'Factura electronica';
    }
    if (value === 'BOLETA' || value === 'BOLETA_SIN_NOMBRE') {
      return 'Boleta electronica';
    }
    return 'Ticket de venta';
  }

  private formatTicketDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('es-PE');
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
