import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom, forkJoin, Observable, of, throwError } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { LowStockAlertService } from '@core/services/low-stock-alert.service';
import { createClientOperationId } from '@core/utils/client-operation-id';
import { ExcelReportService } from '../../data/excel-report.service';
import {
  AdminSaasApiService,
  Almacen,
  Compra,
  ConfiguracionTributaria,
  InventorySummary,
  KardexMovimiento,
  PageResponse,
  Producto,
  StockItem,
  StockLoteItem,
} from '../../data/admin-saas-api.service';

interface MovimientoForm {
  productoId: number | null;
  almacenId: number | null;
  almacenDestinoId: number | null;
  loteId: number | null;
  tipoMovimiento: 'SALIDA' | 'AJUSTE' | 'TRASLADO';
  motivo: string;
  cantidad: number;
  referencia: string;
  clientOperationId: string;
}

interface CompraDetalleForm {
  productoId: number | null;
  cantidad: number;
  costoNetoUnitario: number;
  porcentajeIgv: number;
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
  creditoFiscalAplicable: boolean;
  clientOperationId: string;
  detalles: CompraDetalleForm[];
}

interface StockSettingsForm {
  stockId: number | null;
  producto: string;
  almacen: string;
  stockMinimo: number;
  stockMaximo: number | null;
  ubicacionFisica: string;
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
  protected readonly movementLotes = signal<StockLoteItem[]>([]);
  protected readonly compras = signal<Compra[]>([]);
  protected readonly taxConfig = signal<ConfiguracionTributaria | null>(null);
  protected readonly stockTotal = signal(0);
  protected readonly lotesTotal = signal(0);
  protected readonly kardexTotal = signal(0);
  protected readonly comprasTotal = signal(0);
  protected readonly pageSize = 20;
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly stockAlmacenFilter = signal<number | null>(null);
  protected readonly stockProductoFilter = signal<number | null>(null);
  protected readonly movimientoDialogVisible = signal(false);
  protected readonly compraDialogVisible = signal(false);
  protected readonly stockSettingsDialogVisible = signal(false);
  protected readonly activeStockLotes = computed(() =>
    this.stockLotes().filter((item) => Number(item.stockActual || 0) > 0),
  );

  protected readonly inventoryMetrics = signal({
    stockLines: 0,
    lowStock: 0,
    noStock: 0,
    expiring: 0,
    expired: 0,
    recentMovements: 0,
    purchases: 0,
    invested: 0,
    projectedProfit: 0,
  });

  protected compraForm: CompraForm = this.emptyCompraForm();

  protected compraTotals() {
    const detalles = this.compraForm.detalles;
    const subtotalNeto = detalles.reduce(
      (sum, item) => sum + this.compraDetalleSubtotalNeto(item), 0);
    const montoIgv = detalles.reduce(
      (sum, item) => sum + this.compraDetalleIgvTotal(item), 0);
    const total = subtotalNeto + montoIgv;
    const costoInventariable = detalles.reduce(
      (sum, item) => sum + this.compraDetalleCostoInventariableTotal(item), 0);
    const ventaNeta = detalles.reduce(
      (sum, item) => sum + this.compraDetalleVentaNetaTotal(item), 0);
    const ganancia = ventaNeta - costoInventariable;
    return {
      subtotalNeto,
      montoIgv,
      total,
      creditoFiscal: this.compraForm.creditoFiscalAplicable ? montoIgv : 0,
      costoInventariable,
      ventaNeta,
      ganancia,
      margen: costoInventariable > 0 ? (ganancia / costoInventariable) * 100 : 0,
    };
  }

  protected movimientoForm: MovimientoForm = {
    productoId: null,
    almacenId: null,
    almacenDestinoId: null,
    loteId: null,
    tipoMovimiento: 'AJUSTE',
    motivo: 'AJUSTE_MANUAL',
    cantidad: 0,
    referencia: '',
    clientOperationId: '',
  };
  protected stockSettingsForm: StockSettingsForm = {
    stockId: null,
    producto: '',
    almacen: '',
    stockMinimo: 0,
    stockMaximo: null,
    ubicacionFisica: '',
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
      productos: this.api.pageProductos('', undefined, 0, 50),
      stock: this.api.pageStock(
        this.stockProductoFilter() || undefined,
        this.stockAlmacenFilter() || undefined,
        0,
        this.pageSize,
      ),
      kardex: this.api.pageKardex(
        this.stockProductoFilter() || undefined,
        this.stockAlmacenFilter() || undefined,
        0,
        this.pageSize,
      ),
      lotes: this.api.pageStockLotes(
        this.stockProductoFilter() || undefined,
        this.stockAlmacenFilter() || undefined,
        0,
        this.pageSize,
      ),
      compras: this.api.pageCompras('', undefined, 0, this.pageSize),
      summary: this.api.getInventorySummary(),
      taxConfig: this.api.getConfiguracionTributaria().pipe(
        catchError(() =>
          of({
            id: 0,
            tipoOperacionDefaultId: '0101',
            tipoAfectacionDefaultId: '10',
            tributoDefaultId: '1000',
            porcentajeIgvDefault: 18,
            monedaDefault: 'PEN',
            estado: 'FALLBACK',
          } satisfies ConfiguracionTributaria),
        ),
      ),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ almacenes, productos, stock, kardex, lotes, compras, summary, taxConfig }) => {
          this.almacenes.set(almacenes);
          this.productos.set(productos.content);
          this.applyStockPage(stock);
          this.kardex.set(kardex.content);
          this.kardexTotal.set(kardex.totalElements);
          this.stockLotes.set(lotes.content);
          this.lotesTotal.set(lotes.totalElements);
          this.compras.set(compras.content);
          this.comprasTotal.set(compras.totalElements);
          this.taxConfig.set(taxConfig);
          this.applySummary(summary);
          this.syncLowStockAlerts(stock.content, lotes.content);
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected applyFilters(): void {
    this.loading.set(true);
    forkJoin({
      stock: this.api.pageStock(
        this.stockProductoFilter() || undefined,
        this.stockAlmacenFilter() || undefined,
        0,
        this.pageSize,
      ),
      kardex: this.api.pageKardex(
        this.stockProductoFilter() || undefined,
        this.stockAlmacenFilter() || undefined,
        0,
        this.pageSize,
      ),
      lotes: this.api.pageStockLotes(
        this.stockProductoFilter() || undefined,
        this.stockAlmacenFilter() || undefined,
        0,
        this.pageSize,
      ),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ stock, kardex, lotes }) => {
          this.applyStockPage(stock);
          this.kardex.set(kardex.content);
          this.kardexTotal.set(kardex.totalElements);
          this.stockLotes.set(lotes.content);
          this.lotesTotal.set(lotes.totalElements);
          this.syncLowStockAlerts(stock.content, lotes.content);
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected clearFilters(): void {
    this.stockAlmacenFilter.set(null);
    this.stockProductoFilter.set(null);
    this.applyFilters();
  }

  protected loadStockPage(event: { first?: number | null; rows?: number | null }): void {
    const { page, size } = this.pageFromEvent(event);
    this.loading.set(true);
    this.api
      .pageStock(
        this.stockProductoFilter() || undefined,
        this.stockAlmacenFilter() || undefined,
        page,
        size,
      )
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => this.applyStockPage(response),
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected loadLotesPage(event: { first?: number | null; rows?: number | null }): void {
    const { page, size } = this.pageFromEvent(event);
    this.loading.set(true);
    this.api
      .pageStockLotes(
        this.stockProductoFilter() || undefined,
        this.stockAlmacenFilter() || undefined,
        page,
        size,
      )
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.stockLotes.set(response.content);
          this.lotesTotal.set(response.totalElements);
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected loadKardexPage(event: { first?: number | null; rows?: number | null }): void {
    const { page, size } = this.pageFromEvent(event);
    this.loading.set(true);
    this.api
      .pageKardex(
        this.stockProductoFilter() || undefined,
        this.stockAlmacenFilter() || undefined,
        page,
        size,
      )
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.kardex.set(response.content);
          this.kardexTotal.set(response.totalElements);
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected loadComprasPage(event: { first?: number | null; rows?: number | null }): void {
    const { page, size } = this.pageFromEvent(event);
    this.loading.set(true);
    this.api
      .pageCompras('', undefined, page, size)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.compras.set(response.content);
          this.comprasTotal.set(response.totalElements);
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected filterProductOptions(event: { filter?: string | null }): void {
    const selectedIds = new Set<number>(
      [
        this.stockProductoFilter(),
        this.movimientoForm.productoId,
        ...this.compraForm.detalles.map((item) => item.productoId),
      ].filter((id): id is number => typeof id === 'number'),
    );
    const selected = this.productos().filter((item) => selectedIds.has(item.id));
    this.api.pageProductos(event.filter || '', undefined, 0, 50).subscribe({
      next: (response) => {
        const merged = new Map<number, Producto>();
        [...selected, ...response.content].forEach((item) => merged.set(item.id, item));
        this.productos.set([...merged.values()]);
      },
      error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
    });
  }

  protected async exportStockExcel(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      const rows = await this.loadAllPages((page, size) =>
        this.api.pageStock(
          this.stockProductoFilter() || undefined,
          this.stockAlmacenFilter() || undefined,
          page,
          size,
        ),
      );
      if (!rows.length) {
        this.errorMessage.set('No hay stock para exportar con los filtros actuales.');
        return;
      }
      await this.excelReport.exportWorkbook(`azurion-inventario-stock-${this.today()}.xlsx`, [
        this.buildStockSheet(rows),
      ]);
      this.successMessage.set(`Reporte de stock exportado: ${rows.length} fila(s).`);
    } catch (error: unknown) {
      this.errorMessage.set(this.resolveError(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected async exportKardexExcel(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      const rows = await this.loadAllPages((page, size) =>
        this.api.pageKardex(
          this.stockProductoFilter() || undefined,
          this.stockAlmacenFilter() || undefined,
          page,
          size,
        ),
      );
      if (!rows.length) {
        this.errorMessage.set('No hay kardex para exportar con los filtros actuales.');
        return;
      }
      await this.excelReport.exportWorkbook(`azurion-inventario-kardex-${this.today()}.xlsx`, [
        this.buildKardexSheet(rows),
      ]);
      this.successMessage.set(`Reporte kardex exportado: ${rows.length} fila(s).`);
    } catch (error: unknown) {
      this.errorMessage.set(this.resolveError(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected async exportInventarioExcel(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      const productoId = this.stockProductoFilter() || undefined;
      const almacenId = this.stockAlmacenFilter() || undefined;
      const [stock, kardex] = await Promise.all([
        this.loadAllPages((page, size) =>
          this.api.pageStock(productoId, almacenId, page, size),
        ),
        this.loadAllPages((page, size) =>
          this.api.pageKardex(productoId, almacenId, page, size),
        ),
      ]);
      if (!stock.length && !kardex.length) {
        this.errorMessage.set('No hay informacion de inventario para exportar.');
        return;
      }
      await this.excelReport.exportWorkbook(`azurion-inventario-completo-${this.today()}.xlsx`, [
        this.buildStockSheet(stock),
        this.buildKardexSheet(kardex),
      ]);
      this.successMessage.set(
        `Reporte completo exportado: ${stock.length} stock y ${kardex.length} movimiento(s).`,
      );
    } catch (error: unknown) {
      this.errorMessage.set(this.resolveError(error));
    } finally {
      this.loading.set(false);
    }
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
    detalle.porcentajeIgv = this.productSalesTaxRate(producto);
  }

  protected onCompraTipoComprobanteChange(
    tipo: CompraForm['tipoComprobante'],
  ): void {
    this.compraForm.tipoComprobante = tipo;
    this.compraForm.creditoFiscalAplicable = tipo === 'FACTURA';
  }

  protected compraDetalleSubtotalNeto(detalle: CompraDetalleForm): number {
    return this.roundMoney(Number(detalle.cantidad || 0) * Number(detalle.costoNetoUnitario || 0));
  }

  protected compraDetalleIgvUnitario(detalle: CompraDetalleForm): number {
    const rate = Math.max(0, Number(detalle.porcentajeIgv || 0));
    return Number(detalle.costoNetoUnitario || 0) * rate / 100;
  }

  protected compraDetalleIgvTotal(detalle: CompraDetalleForm): number {
    return this.roundMoney(Number(detalle.cantidad || 0) * this.compraDetalleIgvUnitario(detalle));
  }

  protected compraDetalleCostoTotalUnitario(detalle: CompraDetalleForm): number {
    return Number(detalle.costoNetoUnitario || 0) + this.compraDetalleIgvUnitario(detalle);
  }

  protected compraDetalleCostoInventariableUnitario(detalle: CompraDetalleForm): number {
    return this.compraForm.creditoFiscalAplicable
      ? Number(detalle.costoNetoUnitario || 0)
      : this.compraDetalleCostoTotalUnitario(detalle);
  }

  protected compraDetalleCostoInventariableTotal(detalle: CompraDetalleForm): number {
    return this.roundMoney(
      Number(detalle.cantidad || 0) * this.compraDetalleCostoInventariableUnitario(detalle),
    );
  }

  protected compraDetalleVentaNetaUnitario(detalle: CompraDetalleForm): number {
    const producto = this.productos().find((item) => item.id === detalle.productoId);
    const rate = this.productSalesTaxRate(producto);
    const finalPrice = Number(detalle.precioVenta || 0);
    return rate > 0 ? finalPrice / (1 + rate / 100) : finalPrice;
  }

  protected compraDetalleVentaNetaTotal(detalle: CompraDetalleForm): number {
    return this.roundMoney(
      Number(detalle.cantidad || 0) * this.compraDetalleVentaNetaUnitario(detalle),
    );
  }

  protected compraDetalleControlsExpiry(detalle: CompraDetalleForm): boolean {
    const producto = this.productos().find((item) => item.id === detalle.productoId);
    return Boolean(producto?.vencimiento ?? producto?.manejaVencimiento);
  }

  protected compraDetalleControlsLot(detalle: CompraDetalleForm): boolean {
    const producto = this.productos().find((item) => item.id === detalle.productoId);
    return Boolean(
      producto?.lotes ??
        producto?.manejaLotes ??
        producto?.vencimiento ??
        producto?.manejaVencimiento,
    );
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
    if (
      !this.compraForm.proveedorDocumento.trim() &&
      !this.compraForm.proveedorNombre.trim()
    ) {
      this.errorMessage.set('Indica el documento o el nombre del proveedor.');
      return;
    }
    const invalid = this.compraForm.detalles.find(
      (item) =>
        !item.productoId ||
        Number(item.cantidad) <= 0 ||
        Number(item.costoNetoUnitario) <= 0 ||
        Number(item.porcentajeIgv) < 0 ||
        Number(item.porcentajeIgv) > 100 ||
        Number(item.precioVenta) <= 0,
    );
    if (invalid) {
      this.errorMessage.set(
        'Cada producto debe tener cantidad, costo neto y precio final mayores a cero; el IGV debe estar entre 0% y 100%.',
      );
      return;
    }
    const missingLot = this.compraForm.detalles.find(
      (item) => this.compraDetalleControlsLot(item) && !item.codigoLote.trim(),
    );
    if (missingLot) {
      this.errorMessage.set('Completa el codigo de lote de los productos que controlan lotes.');
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
    const invalidDates = this.compraForm.detalles.find(
      (item) =>
        item.fechaFabricacion &&
        item.fechaVencimiento &&
        item.fechaFabricacion > item.fechaVencimiento,
    );
    if (invalidDates) {
      this.errorMessage.set('La fecha de fabricacion no puede ser posterior al vencimiento.');
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
        creditoFiscalAplicable: this.compraForm.creditoFiscalAplicable,
        clientOperationId: this.compraForm.clientOperationId,
        detalles: this.compraForm.detalles.map((item) => ({
          productoId: Number(item.productoId),
          cantidad: Number(item.cantidad),
          costoUnitario: this.compraDetalleCostoInventariableUnitario(item),
          costoNetoUnitario: Number(item.costoNetoUnitario),
          porcentajeIgv: Number(item.porcentajeIgv),
          costoTotalUnitario: this.compraDetalleCostoTotalUnitario(item),
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
            `Compra ${compra.numeroComprobante} registrada. Total S/ ${Number(compra.total).toFixed(2)}; costo inventariable S/ ${Number(compra.totalCostoInventariable).toFixed(2)}.`,
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
      loteId: null,
      tipoMovimiento: 'AJUSTE',
      motivo: 'AJUSTE_MANUAL',
      cantidad: 0,
      referencia: '',
      clientOperationId: createClientOperationId('inventory'),
    };
    this.refreshMovementLotes();
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
      creditoFiscalAplicable: true,
      clientOperationId: createClientOperationId('purchase'),
      detalles: [this.emptyCompraDetalle()],
    };
  }

  private emptyCompraDetalle(): CompraDetalleForm {
    return {
      productoId: null,
      cantidad: 1,
      costoNetoUnitario: 0,
      porcentajeIgv: Number(this.taxConfig()?.porcentajeIgvDefault ?? 18),
      precioVenta: 0,
      codigoLote: '',
      fechaFabricacion: '',
      fechaVencimiento: '',
    };
  }

  protected onProductoChange(productoId: number | null): void {
    this.movimientoForm.productoId = productoId;
    this.movimientoForm.loteId = null;
    this.refreshMovementLotes();
  }

  private productSalesTaxRate(producto?: Producto): number {
    const inherited = producto?.usaConfiguracionEmpresa !== false;
    const affectation = inherited
      ? this.taxConfig()?.tipoAfectacionDefaultId
      : producto?.tipoAfectacionIgvId;
    const taxable = inherited
      ? String(affectation || '10').startsWith('1')
      : producto?.afectoIgv !== false && String(affectation || '10').startsWith('1');
    if (!taxable) {
      return 0;
    }
    return Number(
      inherited
        ? this.taxConfig()?.porcentajeIgvDefault ?? 18
        : producto?.porcentajeImpuesto ?? 18,
    );
  }

  private roundMoney(value: number): number {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  protected selectedProductControlsLots(): boolean {
    const producto = this.productos().find((item) => item.id === this.movimientoForm.productoId);
    return Boolean(producto?.lotes ?? producto?.manejaLotes);
  }

  protected movementLotOptions(): Array<{ label: string; value: number }> {
    return this.movementLotes()
      .filter(
        (item) =>
          item.productoId === this.movimientoForm.productoId &&
          item.almacenId === this.movimientoForm.almacenId &&
          Number(item.stockActual || 0) >= 0 &&
          item.estado === 'ACTIVO',
      )
      .map((item) => ({
        label: `${item.codigoLote} - saldo ${Number(item.stockActual || 0)}`,
        value: item.loteId,
      }));
  }

  private refreshMovementLotes(): void {
    const productoId = this.movimientoForm.productoId;
    const almacenId = this.movimientoForm.almacenId;
    if (!productoId || !almacenId) {
      this.movementLotes.set([]);
      return;
    }
    this.api.listStockLotes(productoId, almacenId).subscribe({
      next: (items) => this.movementLotes.set(items),
      error: () => this.movementLotes.set([]),
    });
  }

  protected onTipoMovimientoChange(tipo: MovimientoForm['tipoMovimiento']): void {
    this.movimientoForm.tipoMovimiento = tipo;
    if (tipo !== 'TRASLADO') {
      this.movimientoForm.almacenDestinoId = null;
    }
    this.movimientoForm.loteId = null;
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

    const invalidQuantity =
      Number.isNaN(cantidad) ||
      cantidad < 0 ||
      (tipoMovimiento !== 'AJUSTE' && cantidad <= 0);
    if (!productoId || !almacenId || !motivo || invalidQuantity) {
      this.errorMessage.set('Completa producto, almacen, motivo y una cantidad valida.');
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
      tipoMovimiento === 'AJUSTE' &&
      this.selectedProductControlsLots() &&
      !this.movimientoForm.loteId
    ) {
      this.errorMessage.set(
        'Selecciona el lote cuyo saldo deseas ajustar.',
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
        loteId: this.movimientoForm.loteId,
        tipoMovimiento,
        motivo,
        cantidad,
        referencia: this.movimientoForm.referencia.trim() || null,
        clientOperationId: this.movimientoForm.clientOperationId,
      })
      .pipe(
        catchError((originalError: unknown) =>
          this.api
            .getMovimientoStockByOperation(this.movimientoForm.clientOperationId)
            .pipe(catchError(() => throwError(() => originalError))),
        ),
        finalize(() => this.saving.set(false)),
      )
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
    return 'AJUSTE_MANUAL';
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
    return 'Registrar ajuste';
  }

  protected movementQuantityLabel(): string {
    if (this.movimientoForm.tipoMovimiento !== 'AJUSTE') {
      return 'Cantidad';
    }
    return this.selectedProductControlsLots()
      ? 'Nuevo saldo del lote'
      : 'Nuevo saldo del almacen';
  }

  protected onMovementWarehouseChange(almacenId: number | null): void {
    this.movimientoForm.almacenId = almacenId;
    this.movimientoForm.loteId = null;
    this.refreshMovementLotes();
  }

  protected openStockSettings(item: StockItem): void {
    this.errorMessage.set(null);
    this.stockSettingsForm = {
      stockId: item.id,
      producto: `${item.productoSku} - ${item.productoNombre}`,
      almacen: `${item.almacenCodigo} - ${item.almacenNombre}`,
      stockMinimo: Number(item.stockMinimo || 0),
      stockMaximo: item.stockMaximo == null ? null : Number(item.stockMaximo),
      ubicacionFisica: item.ubicacionFisica || '',
    };
    this.stockSettingsDialogVisible.set(true);
  }

  protected saveStockSettings(): void {
    if (this.saving() || !this.stockSettingsForm.stockId) {
      return;
    }
    const minimo = Number(this.stockSettingsForm.stockMinimo);
    const maximo =
      this.stockSettingsForm.stockMaximo == null ||
      String(this.stockSettingsForm.stockMaximo).trim() === ''
        ? null
        : Number(this.stockSettingsForm.stockMaximo);
    if (minimo < 0 || (maximo != null && (maximo < 0 || maximo < minimo))) {
      this.errorMessage.set('El stock maximo debe ser igual o mayor al stock minimo.');
      return;
    }
    this.saving.set(true);
    this.api
      .updateStockSettings(this.stockSettingsForm.stockId, {
        stockMinimo: minimo,
        stockMaximo: maximo,
        ubicacionFisica: this.stockSettingsForm.ubicacionFisica.trim() || null,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.stockSettingsDialogVisible.set(false);
          this.successMessage.set('Configuracion de stock actualizada.');
          this.applyFilters();
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
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

  private buildStockSheet(items: StockItem[] = this.stock()) {
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
      rows: items.map((item) => ({
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

  private buildKardexSheet(items: KardexMovimiento[] = this.kardex()) {
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
      rows: items.map((item) => ({
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

  private async loadAllPages<T>(
    loader: (page: number, size: number) => Observable<PageResponse<T>>,
  ): Promise<T[]> {
    const size = 200;
    const rows: T[] = [];
    let page = 0;
    while (true) {
      const response = await firstValueFrom(loader(page, size));
      rows.push(...response.content);
      if (response.last || response.content.length === 0 || page + 1 >= response.totalPages) {
        return rows;
      }
      page += 1;
    }
  }

  private applyStockPage(response: PageResponse<StockItem>): void {
    this.stock.set(response.content);
    this.stockTotal.set(response.totalElements);
  }

  private applySummary(summary: InventorySummary): void {
    this.inventoryMetrics.set({
      stockLines: summary.stockLines,
      lowStock: summary.lowStock,
      noStock: summary.noStock,
      expiring: summary.expiring,
      expired: summary.expired,
      recentMovements: summary.movements,
      purchases: summary.purchases,
      invested: Number(summary.invested || 0),
      projectedProfit: Number(summary.projectedProfit || 0),
    });
  }

  private pageFromEvent(event: {
    first?: number | null;
    rows?: number | null;
  }): { page: number; size: number } {
    const size = event.rows && event.rows > 0 ? event.rows : this.pageSize;
    const first = event.first && event.first > 0 ? event.first : 0;
    return { page: Math.floor(first / size), size };
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
        return 'No se pudo completar la operacion en este momento. Intenta nuevamente.';
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
