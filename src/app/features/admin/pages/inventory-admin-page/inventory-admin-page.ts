import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { LowStockAlertService } from '@core/services/low-stock-alert.service';
import { ExcelReportService } from '../../data/excel-report.service';
import {
  AdminSaasApiService,
  Almacen,
  Compra,
  KardexMovimiento,
  Producto,
  StockItem,
  StockLoteItem,
} from '../../data/admin-saas-api.service';

interface MovimientoForm {
  productoId: number | null;
  almacenId: number | null;
  almacenDestinoId: number | null;
  tipoMovimiento: 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'TRASLADO';
  motivo: string;
  cantidad: number;
  precioCompra: number;
  precioVenta: number;
  codigoLote: string;
  fechaFabricacion: string;
  fechaVencimiento: string;
  referencia: string;
}

interface CompraDetalleForm {
  productoId: number | null;
  cantidad: number;
  costoUnitario: number;
  precioVenta: number;
  codigoLote: string;
  fechaFabricacion: string;
  fechaVencimiento: string;
}

interface CompraForm {
  tipoComprobante: 'FACTURA' | 'BOLETA' | 'TICKET' | 'OTRO';
  numeroComprobante: string;
  fechaEmision: string;
  proveedorDocumento: string;
  proveedorNombre: string;
  almacenId: number | null;
  detalles: CompraDetalleForm[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-inventory-admin-page',
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
    TooltipModule,
  ],
  templateUrl: './inventory-admin-page.html',
  styleUrl: './inventory-admin-page.scss',
})
export class InventoryAdminPage {
  private readonly api = inject(AdminSaasApiService);
  private readonly excelReport = inject(ExcelReportService);
  private readonly route = inject(ActivatedRoute);
  private readonly lowStockAlerts = inject(LowStockAlertService);

  protected readonly almacenes = signal<Almacen[]>([]);
  protected readonly productos = signal<Producto[]>([]);
  protected readonly stock = signal<StockItem[]>([]);
  protected readonly kardex = signal<KardexMovimiento[]>([]);
  protected readonly stockLotes = signal<StockLoteItem[]>([]);
  protected readonly compras = signal<Compra[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly stockAlmacenFilter = signal<number | null>(null);
  protected readonly stockProductoFilter = signal<number | null>(null);
  protected readonly movimientoDialogVisible = signal(false);
  protected readonly compraDialogVisible = signal(false);
  protected readonly activeStockLotes = computed(() =>
    this.stockLotes().filter((item) => Number(item.stockActual || 0) > 0),
  );

  protected readonly inventoryMetrics = computed(() => ({
    stockLines: this.stock().length,
    lowStock: this.stock().filter((item) => item.stockBajo && !item.sinStock).length,
    noStock: this.stock().filter((item) => item.sinStock).length,
    expiring: this.activeStockLotes().filter((item) => this.expiryStatus(item) === 'POR_VENCER')
      .length,
    expired: this.activeStockLotes().filter((item) => this.expiryStatus(item) === 'VENCIDO').length,
    recentMovements: this.kardex().length,
    purchases: this.compras().length,
    invested: this.compras().reduce((sum, item) => sum + Number(item.total || 0), 0),
    projectedProfit: this.compras().reduce(
      (sum, item) => sum + Number(item.gananciaProyectada || 0),
      0,
    ),
  }));

  protected compraForm: CompraForm = this.emptyCompraForm();

  protected readonly compraTotals = computed(() => {
    const detalles = this.compraForm.detalles;
    const gasto = detalles.reduce(
      (sum, item) => sum + Number(item.cantidad || 0) * Number(item.costoUnitario || 0),
      0,
    );
    const venta = detalles.reduce(
      (sum, item) => sum + Number(item.cantidad || 0) * Number(item.precioVenta || 0),
      0,
    );
    const ganancia = venta - gasto;
    return {
      gasto,
      venta,
      ganancia,
      margen: gasto > 0 ? (ganancia / gasto) * 100 : 0,
    };
  });

  protected movimientoForm: MovimientoForm = {
    productoId: null,
    almacenId: null,
    almacenDestinoId: null,
    tipoMovimiento: 'AJUSTE',
    motivo: 'AJUSTE_MANUAL',
    cantidad: 0,
    precioCompra: 0,
    precioVenta: 0,
    codigoLote: '',
    fechaFabricacion: '',
    fechaVencimiento: '',
    referencia: '',
  };

  protected readonly almacenOptions = computed(() =>
    this.almacenes().map((almacen) => ({
      label: `${almacen.codigo} - ${almacen.nombre}`,
      value: almacen.id,
    })),
  );

  protected readonly productoOptions = computed(() =>
    this.productos().map((producto) => ({
      label: `${producto.sku} - ${producto.nombre}`,
      value: producto.id,
    })),
  );

  protected readonly movimientoTypeOptions = computed(() => [
    { label: 'Salida', value: 'SALIDA' as const },
    { label: 'Ajuste', value: 'AJUSTE' as const },
    { label: 'Traslado', value: 'TRASLADO' as const },
  ]);

  protected readonly comprobanteCompraOptions = [
    { label: 'Factura de compra', value: 'FACTURA' as const },
    { label: 'Boleta de compra', value: 'BOLETA' as const },
    { label: 'Ticket de compra', value: 'TICKET' as const },
    { label: 'Otro documento', value: 'OTRO' as const },
  ];

  constructor() {
    const productoId = Number(this.route.snapshot.queryParamMap.get('productoId') || 0);
    if (productoId > 0) {
      this.stockProductoFilter.set(productoId);
    }
    this.loadData();
  }

  protected loadData(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    forkJoin({
      almacenes: this.api.listAlmacenes(),
      productos: this.api.listProductos(),
      stock: this.api.listStock(
        this.stockProductoFilter() || undefined,
        this.stockAlmacenFilter() || undefined,
      ),
      kardex: this.api.listKardex(
        this.stockProductoFilter() || undefined,
        this.stockAlmacenFilter() || undefined,
      ),
      lotes: this.api.listStockLotes(
        this.stockProductoFilter() || undefined,
        this.stockAlmacenFilter() || undefined,
      ),
      compras: this.api.listCompras(),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ almacenes, productos, stock, kardex, lotes, compras }) => {
          this.almacenes.set(almacenes);
          this.productos.set(productos);
          this.stock.set(stock);
          this.kardex.set(kardex);
          this.stockLotes.set(lotes);
          this.compras.set(compras);
          this.syncLowStockAlerts(stock, lotes);
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected applyFilters(): void {
    this.loading.set(true);
    forkJoin({
      stock: this.api.listStock(
        this.stockProductoFilter() || undefined,
        this.stockAlmacenFilter() || undefined,
      ),
      kardex: this.api.listKardex(
        this.stockProductoFilter() || undefined,
        this.stockAlmacenFilter() || undefined,
      ),
      lotes: this.api.listStockLotes(
        this.stockProductoFilter() || undefined,
        this.stockAlmacenFilter() || undefined,
      ),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ stock, kardex, lotes }) => {
          this.stock.set(stock);
          this.kardex.set(kardex);
          this.stockLotes.set(lotes);
          this.syncLowStockAlerts(stock, lotes);
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected clearFilters(): void {
    this.stockAlmacenFilter.set(null);
    this.stockProductoFilter.set(null);
    this.applyFilters();
  }

  protected async exportStockExcel(): Promise<void> {
    if (!this.stock().length) {
      this.errorMessage.set('No hay stock para exportar con los filtros actuales.');
      return;
    }

    await this.excelReport.exportWorkbook(`azurion-inventario-stock-${this.today()}.xlsx`, [
      this.buildStockSheet(),
    ]);
    this.successMessage.set(`Reporte de stock exportado: ${this.stock().length} fila(s).`);
  }

  protected async exportKardexExcel(): Promise<void> {
    if (!this.kardex().length) {
      this.errorMessage.set('No hay kardex para exportar con los filtros actuales.');
      return;
    }

    await this.excelReport.exportWorkbook(`azurion-inventario-kardex-${this.today()}.xlsx`, [
      this.buildKardexSheet(),
    ]);
    this.successMessage.set(`Reporte kardex exportado: ${this.kardex().length} fila(s).`);
  }

  protected async exportInventarioExcel(): Promise<void> {
    if (!this.stock().length && !this.kardex().length) {
      this.errorMessage.set('No hay informacion de inventario para exportar.');
      return;
    }

    await this.excelReport.exportWorkbook(`azurion-inventario-completo-${this.today()}.xlsx`, [
      this.buildStockSheet(),
      this.buildKardexSheet(),
    ]);
    this.successMessage.set('Reporte completo de inventario exportado.');
  }

  protected openCompraDialog(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.compraForm = this.emptyCompraForm();
    this.compraDialogVisible.set(true);
  }

  protected addCompraDetalle(): void {
    this.compraForm.detalles.push(this.emptyCompraDetalle());
  }

  protected removeCompraDetalle(index: number): void {
    if (this.compraForm.detalles.length === 1) {
      return;
    }
    this.compraForm.detalles.splice(index, 1);
  }

  protected onCompraProductoChange(index: number, productoId: number | null): void {
    const detalle = this.compraForm.detalles[index];
    if (!detalle) {
      return;
    }
    detalle.productoId = productoId;
    const producto = this.productos().find((item) => item.id === productoId);
    detalle.precioVenta = Number(producto?.precioVentaBase ?? producto?.precio ?? 0);
  }

  protected compraDetalleControlsExpiry(detalle: CompraDetalleForm): boolean {
    const producto = this.productos().find((item) => item.id === detalle.productoId);
    return Boolean(producto?.vencimiento ?? producto?.manejaVencimiento);
  }

  protected saveCompra(): void {
    if (this.saving()) {
      return;
    }
    this.errorMessage.set(null);
    const numero = this.compraForm.numeroComprobante.trim().toUpperCase();
    if (!numero || !this.compraForm.fechaEmision || !this.compraForm.almacenId) {
      this.errorMessage.set('Completa comprobante, fecha de emision y almacen destino.');
      return;
    }
    const invalid = this.compraForm.detalles.find(
      (item) =>
        !item.productoId ||
        Number(item.cantidad) <= 0 ||
        Number(item.costoUnitario) <= 0 ||
        Number(item.precioVenta) <= 0,
    );
    if (invalid) {
      this.errorMessage.set(
        'Cada producto debe tener cantidad, costo de compra y precio de venta mayores a cero.',
      );
      return;
    }
    const missingExpiry = this.compraForm.detalles.find(
      (item) => this.compraDetalleControlsExpiry(item) && !item.fechaVencimiento,
    );
    if (missingExpiry) {
      this.errorMessage.set(
        'Completa la fecha de vencimiento de los productos que controlan caducidad.',
      );
      return;
    }

    this.saving.set(true);
    this.api
      .createCompra({
        tipoComprobante: this.compraForm.tipoComprobante,
        numeroComprobante: numero,
        fechaEmision: this.compraForm.fechaEmision,
        proveedorDocumento: this.compraForm.proveedorDocumento.trim() || null,
        proveedorNombre: this.compraForm.proveedorNombre.trim() || null,
        almacenId: this.compraForm.almacenId,
        detalles: this.compraForm.detalles.map((item) => ({
          productoId: Number(item.productoId),
          cantidad: Number(item.cantidad),
          costoUnitario: Number(item.costoUnitario),
          precioVenta: Number(item.precioVenta),
          codigoLote: item.codigoLote.trim() || null,
          fechaFabricacion: item.fechaFabricacion || null,
          fechaVencimiento: item.fechaVencimiento || null,
        })),
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (compra) => {
          this.compraDialogVisible.set(false);
          this.successMessage.set(
            `Compra ${compra.numeroComprobante} registrada. Inversion S/ ${Number(compra.total).toFixed(2)}; ganancia proyectada S/ ${Number(compra.gananciaProyectada).toFixed(2)}.`,
          );
          this.loadData();
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected openMovimientoDialog(productoId?: number, almacenId?: number): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.movimientoForm = {
      productoId: productoId ?? this.stockProductoFilter() ?? null,
      almacenId: almacenId ?? this.stockAlmacenFilter() ?? this.almacenes()[0]?.id ?? null,
      almacenDestinoId: null,
      tipoMovimiento: 'AJUSTE',
      motivo: 'AJUSTE_MANUAL',
      cantidad: 0,
      precioCompra: 0,
      precioVenta: 0,
      codigoLote: '',
      fechaFabricacion: '',
      fechaVencimiento: '',
      referencia: '',
    };
    this.prefillPrecioVenta(productoId ?? null);
    this.movimientoDialogVisible.set(true);
  }

  private emptyCompraForm(): CompraForm {
    return {
      tipoComprobante: 'FACTURA',
      numeroComprobante: '',
      fechaEmision: new Date().toISOString().slice(0, 10),
      proveedorDocumento: '',
      proveedorNombre: '',
      almacenId: this.almacenes()[0]?.id ?? null,
      detalles: [this.emptyCompraDetalle()],
    };
  }

  private emptyCompraDetalle(): CompraDetalleForm {
    return {
      productoId: null,
      cantidad: 1,
      costoUnitario: 0,
      precioVenta: 0,
      codigoLote: '',
      fechaFabricacion: '',
      fechaVencimiento: '',
    };
  }

  protected onProductoChange(productoId: number | null): void {
    this.movimientoForm.productoId = productoId;
    this.prefillPrecioVenta(productoId);
  }

  protected selectedProductControlsExpiry(): boolean {
    const producto = this.productos().find((item) => item.id === this.movimientoForm.productoId);
    return Boolean(producto?.vencimiento ?? producto?.manejaVencimiento);
  }

  protected onTipoMovimientoChange(tipo: MovimientoForm['tipoMovimiento']): void {
    this.movimientoForm.tipoMovimiento = tipo;
    if (tipo !== 'TRASLADO') {
      this.movimientoForm.almacenDestinoId = null;
    }
    if (tipo !== 'ENTRADA') {
      this.movimientoForm.precioCompra = 0;
      this.movimientoForm.precioVenta = 0;
      this.movimientoForm.codigoLote = '';
      this.movimientoForm.fechaFabricacion = '';
      this.movimientoForm.fechaVencimiento = '';
    }
    this.movimientoForm.motivo = this.defaultReasonByType(tipo);
  }

  protected saveMovimiento(): void {
    if (this.saving()) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);

    const productoId = this.movimientoForm.productoId;
    const almacenId = this.movimientoForm.almacenId;
    const cantidad = Number(this.movimientoForm.cantidad);
    const tipoMovimiento = this.movimientoForm.tipoMovimiento;
    const motivo = this.movimientoForm.motivo.trim();

    if (!productoId || !almacenId || !motivo || Number.isNaN(cantidad) || cantidad <= 0) {
      this.errorMessage.set('Completa producto, almacen, motivo y cantidad valida.');
      return;
    }

    if (tipoMovimiento === 'TRASLADO') {
      if (!this.movimientoForm.almacenDestinoId) {
        this.errorMessage.set('Selecciona el almacen destino para traslado.');
        return;
      }
      if (this.movimientoForm.almacenDestinoId === almacenId) {
        this.errorMessage.set('El almacen destino debe ser distinto al origen.');
        return;
      }
    }
    if (
      tipoMovimiento === 'ENTRADA' &&
      this.selectedProductControlsExpiry() &&
      !this.movimientoForm.fechaVencimiento
    ) {
      this.errorMessage.set(
        'Este producto controla caducidad. Indica la fecha de vencimiento del lote.',
      );
      return;
    }

    this.saving.set(true);
    this.api
      .registrarMovimientoStock({
        productoId,
        almacenId,
        almacenDestinoId:
          tipoMovimiento === 'TRASLADO' ? this.movimientoForm.almacenDestinoId : null,
        tipoMovimiento,
        motivo,
        cantidad,
        precioCompra:
          tipoMovimiento === 'ENTRADA'
            ? this.normalizeOptionalNumber(this.movimientoForm.precioCompra)
            : null,
        precioVenta:
          tipoMovimiento === 'ENTRADA'
            ? this.normalizeOptionalNumber(this.movimientoForm.precioVenta)
            : null,
        codigoLote:
          tipoMovimiento === 'ENTRADA' ? this.movimientoForm.codigoLote.trim() || null : null,
        fechaFabricacion:
          tipoMovimiento === 'ENTRADA' ? this.movimientoForm.fechaFabricacion || null : null,
        fechaVencimiento:
          tipoMovimiento === 'ENTRADA' ? this.movimientoForm.fechaVencimiento || null : null,
        referencia: this.movimientoForm.referencia.trim() || null,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.movimientoDialogVisible.set(false);
          this.successMessage.set('Movimiento de inventario registrado correctamente.');
          this.loadData();
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  private defaultReasonByType(tipo: MovimientoForm['tipoMovimiento']): string {
    if (tipo === 'SALIDA') {
      return 'VENTA';
    }
    if (tipo === 'AJUSTE') {
      return 'AJUSTE_MANUAL';
    }
    if (tipo === 'TRASLADO') {
      return 'TRASLADO_INTERNO';
    }
    return 'COMPRA';
  }

  private normalizeOptionalNumber(value: number): number | null {
    const parsed = Number(value || 0);
    return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
  }

  private prefillPrecioVenta(productoId: number | null): void {
    if (
      !productoId ||
      this.movimientoForm.tipoMovimiento !== 'ENTRADA' ||
      Number(this.movimientoForm.precioVenta || 0) > 0
    ) {
      return;
    }

    const producto = this.productos().find((item) => item.id === productoId);
    this.movimientoForm.precioVenta = Number(producto?.precioVentaBase ?? producto?.precio ?? 0);
  }

  protected movementDialogTitle(): string {
    if (this.movimientoForm.tipoMovimiento === 'SALIDA') {
      return 'Registrar salida';
    }
    if (this.movimientoForm.tipoMovimiento === 'AJUSTE') {
      return 'Registrar ajuste';
    }
    if (this.movimientoForm.tipoMovimiento === 'TRASLADO') {
      return 'Registrar traslado';
    }
    return 'Registrar entrada';
  }

  protected movementSummary(): string {
    const producto = this.productos().find((item) => item.id === this.movimientoForm.productoId);
    const almacen = this.almacenes().find((item) => item.id === this.movimientoForm.almacenId);
    if (!producto && !almacen) {
      return 'Selecciona producto y almacen para completar el movimiento.';
    }
    return [
      producto ? `${producto.sku} - ${producto.nombre}` : 'Producto pendiente',
      almacen ? `${almacen.codigo} - ${almacen.nombre}` : 'Almacen pendiente',
    ].join(' | ');
  }

  protected stockStatusSeverity(item: StockItem): 'success' | 'warn' | 'danger' {
    const status = this.stockStatus(item);
    if (status === 'CRITICO' || status === 'VENCIDO') {
      return 'danger';
    }
    if (status === 'BAJO' || status === 'POR VENCER') {
      return 'warn';
    }
    return 'success';
  }

  private buildStockSheet() {
    return {
      name: 'Stock',
      title: 'Reporte de stock por almacen',
      subtitle: this.currentFilterSubtitle(),
      columns: [
        { key: 'producto', label: 'Producto', width: 32 },
        { key: 'sku', label: 'SKU', width: 18 },
        { key: 'almacen', label: 'Almacen', width: 28 },
        { key: 'cantidad', label: 'Cantidad', width: 14, format: 'number' as const },
        { key: 'minimo', label: 'Stock minimo', width: 14, format: 'number' as const },
        { key: 'estado', label: 'Estado', width: 14 },
      ],
      rows: this.stock().map((item) => ({
        producto: item.productoNombre,
        sku: item.productoSku,
        almacen: `${item.almacenCodigo} - ${item.almacenNombre}`,
        cantidad: Number(item.cantidad || 0),
        minimo: Number(item.stockMinimo || 0),
        estado: this.stockStatus(item),
      })),
      totalKeys: ['cantidad'],
    };
  }

  private buildKardexSheet() {
    return {
      name: 'Kardex',
      title: 'Reporte kardex de inventario',
      subtitle: this.currentFilterSubtitle(),
      columns: [
        { key: 'fecha', label: 'Fecha', width: 20, format: 'datetime' as const },
        { key: 'producto', label: 'Producto', width: 34 },
        { key: 'sku', label: 'SKU', width: 18 },
        { key: 'almacen', label: 'Almacen', width: 18 },
        { key: 'tipo', label: 'Tipo', width: 14 },
        { key: 'motivo', label: 'Motivo', width: 24 },
        { key: 'cantidad', label: 'Cantidad', width: 14, format: 'number' as const },
        { key: 'saldo', label: 'Saldo', width: 14, format: 'number' as const },
        { key: 'referencia', label: 'Referencia', width: 24 },
      ],
      rows: this.kardex().map((item) => ({
        fecha: item.fechaMovimiento,
        producto: item.productoNombre,
        sku: item.productoSku,
        almacen: item.almacenCodigo,
        tipo: item.tipoMovimiento,
        motivo: item.motivo,
        cantidad: Number(item.cantidad || 0),
        saldo: Number(item.saldoResultante || 0),
        referencia: item.referencia || '',
      })),
      totalKeys: ['cantidad'],
    };
  }

  protected stockStatus(item: StockItem): string {
    const expiry = this.stockExpiryStatus(item);
    if (expiry === 'VENCIDO') {
      return 'VENCIDO';
    }
    if (item.sinStock) {
      return 'CRITICO';
    }
    if (expiry === 'POR_VENCER') {
      return 'POR VENCER';
    }
    if (item.stockBajo) {
      return 'BAJO';
    }
    return 'OK';
  }

  protected stockRowClass(item: StockItem): string {
    const expiry = this.stockExpiryStatus(item);
    if (expiry === 'VENCIDO') {
      return 'stock-row stock-row--expired';
    }
    if (item.sinStock) {
      return 'stock-row stock-row--critical';
    }
    if (expiry === 'POR_VENCER') {
      return 'stock-row stock-row--expiring';
    }
    if (item.stockBajo) {
      return 'stock-row stock-row--low';
    }
    return 'stock-row';
  }

  private stockExpiryStatus(item: StockItem): 'VIGENTE' | 'POR_VENCER' | 'VENCIDO' {
    const statuses = this.activeStockLotes()
      .filter((lote) => lote.productoId === item.productoId && lote.almacenId === item.almacenId)
      .map((lote) => this.expiryStatus(lote));
    if (statuses.includes('VENCIDO')) {
      return 'VENCIDO';
    }
    if (statuses.includes('POR_VENCER')) {
      return 'POR_VENCER';
    }
    return 'VIGENTE';
  }

  protected expiryStatus(item: StockLoteItem): 'SIN_FECHA' | 'VIGENTE' | 'POR_VENCER' | 'VENCIDO' {
    const days = this.daysUntil(item.fechaVencimiento);
    if (!Number.isFinite(days)) {
      return 'SIN_FECHA';
    }
    if (days < 0) {
      return 'VENCIDO';
    }
    if (days <= 30) {
      return 'POR_VENCER';
    }
    return 'VIGENTE';
  }

  protected expirySeverity(item: StockLoteItem): 'secondary' | 'success' | 'warn' | 'danger' {
    const status = this.expiryStatus(item);
    if (status === 'VENCIDO') {
      return 'danger';
    }
    if (status === 'POR_VENCER') {
      return 'warn';
    }
    if (status === 'VIGENTE') {
      return 'success';
    }
    return 'secondary';
  }

  protected expiryRowClass(item: StockLoteItem): string {
    const status = this.expiryStatus(item);
    return status === 'VENCIDO'
      ? 'expiry-row expiry-row--expired'
      : status === 'POR_VENCER'
        ? 'expiry-row expiry-row--soon'
        : 'expiry-row';
  }

  protected expiryDetail(item: StockLoteItem): string {
    const days = this.daysUntil(item.fechaVencimiento);
    if (!Number.isFinite(days)) {
      return 'Producto sin fecha de caducidad';
    }
    if (days < 0) {
      return `Vencio hace ${Math.abs(days)} dia(s)`;
    }
    if (days === 0) {
      return 'Vence hoy';
    }
    return `Vence en ${days} dia(s)`;
  }

  private syncLowStockAlerts(stock: StockItem[], lotes: StockLoteItem[]): void {
    if (this.stockProductoFilter() || this.stockAlmacenFilter()) {
      this.lowStockAlerts.refresh(true);
      return;
    }
    this.lowStockAlerts.register(stock, true, lotes);
  }

  private daysUntil(date?: string | null): number {
    if (!date) {
      return Number.POSITIVE_INFINITY;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(`${date}T00:00:00`);
    return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
  }

  private currentFilterSubtitle(): string {
    const productoId = this.stockProductoFilter();
    const almacenId = this.stockAlmacenFilter();
    const producto = productoId ? this.productos().find((item) => item.id === productoId) : null;
    const almacen = almacenId ? this.almacenes().find((item) => item.id === almacenId) : null;
    return [
      `Generado: ${new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())}`,
      producto ? `Producto: ${producto.sku} - ${producto.nombre}` : 'Producto: Todos',
      almacen ? `Almacen: ${almacen.codigo} - ${almacen.nombre}` : 'Almacen: Todos',
    ].join(' | ');
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private resolveError(error: unknown): string {
    if (typeof error === 'object' && error !== null) {
      const httpError = error as {
        status?: number;
        error?: { message?: string; details?: string[] };
      };
      if (httpError.status === 403) {
        return 'No tienes permisos de inventario. Solicita rol ADMIN o SALES en este tenant.';
      }
      if (httpError.status === 500) {
        return 'El backend reporto un error interno en inventario. Revisa logs del servidor.';
      }

      if (!('error' in httpError)) {
        return 'No se pudo completar la operacion.';
      }

      const apiError = httpError.error;
      return apiError?.details?.[0] || apiError?.message || 'No se pudo completar la operacion.';
    }
    return 'No se pudo completar la operacion.';
  }
}
