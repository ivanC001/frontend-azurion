import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, finalize, switchMap } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import {
  ExcelCellValue,
  ExcelReportColumn,
  ExcelReportSheet,
  ExcelReportService,
} from '../../data/excel-report.service';
import {
  AdminSaasApiService,
  Almacen,
  Caja,
  CajaMovimiento,
  Compra,
  CrmPipelineColumn,
  GuiaRemisionRecord,
  KardexMovimiento,
  NotaFiscalRecord,
  Producto,
  StockItem,
  VentaRecord,
} from '../../data/admin-saas-api.service';

type ReportModule =
  | 'ventas'
  | 'compras'
  | 'stock'
  | 'kardex'
  | 'caja'
  | 'notas'
  | 'guias'
  | 'crm_pipeline';

interface ReportColumn extends ExcelReportColumn {
  align?: 'left' | 'right' | 'center';
}

type ReportRow = Record<string, ExcelCellValue>;
type QuickRange = 'today' | 'last7' | 'last30' | 'month';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-reports-admin-page',
  imports: [FormsModule, ButtonModule, InputTextModule, SelectModule, TableModule, TagModule],
  templateUrl: './reports-admin-page.html',
  styleUrl: './reports-admin-page.scss',
})
export class ReportsAdminPage {
  private readonly api = inject(AdminSaasApiService);
  private readonly excelReport = inject(ExcelReportService);

  protected readonly ventas = signal<VentaRecord[]>([]);
  protected readonly compras = signal<Compra[]>([]);
  protected readonly stock = signal<StockItem[]>([]);
  protected readonly kardex = signal<KardexMovimiento[]>([]);
  protected readonly cajas = signal<Caja[]>([]);
  protected readonly movimientosCaja = signal<CajaMovimiento[]>([]);
  protected readonly guias = signal<GuiaRemisionRecord[]>([]);
  protected readonly notasCredito = signal<NotaFiscalRecord[]>([]);
  protected readonly notasDebito = signal<NotaFiscalRecord[]>([]);
  protected readonly almacenes = signal<Almacen[]>([]);
  protected readonly productos = signal<Producto[]>([]);
  protected readonly crmPipeline = signal<CrmPipelineColumn[]>([]);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected readonly moduleFilter = signal<ReportModule>('ventas');
  protected readonly queryFilter = signal('');
  protected readonly statusFilter = signal<string | null>(null);
  protected readonly almacenFilter = signal<number | null>(null);
  protected readonly productoFilter = signal<number | null>(null);
  protected readonly cajaFilter = signal<number | null>(null);
  protected readonly startDateFilter = signal<string | null>(null);
  protected readonly endDateFilter = signal<string | null>(null);

  protected readonly moduleOptions = [
    { label: 'Ventas', value: 'ventas' as const },
    { label: 'Compras / ingresos', value: 'compras' as const },
    { label: 'Stock', value: 'stock' as const },
    { label: 'Kardex', value: 'kardex' as const },
    { label: 'Caja', value: 'caja' as const },
    { label: 'Notas credito/debito', value: 'notas' as const },
    { label: 'Guias remision', value: 'guias' as const },
    { label: 'CRM pipeline', value: 'crm_pipeline' as const },
  ];

  protected readonly currentModuleLabel = computed(
    () => this.moduleOptions.find((item) => item.value === this.moduleFilter())?.label || 'Reporte',
  );

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

  protected readonly cajaOptions = computed(() =>
    this.cajas().map((caja) => ({
      label: `${caja.codigo} - ${caja.nombre}`,
      value: caja.id,
    })),
  );

  protected readonly statusOptions = computed(() => {
    if (this.moduleFilter() === 'stock') {
      return [
        { label: 'OK', value: 'OK' },
        { label: 'Bajo', value: 'BAJO' },
        { label: 'Critico', value: 'CRITICO' },
      ];
    }
    if (this.moduleFilter() === 'caja') {
      return [
        { label: 'Entrada', value: 'ENTRADA' },
        { label: 'Salida', value: 'SALIDA' },
      ];
    }
    if (this.moduleFilter() === 'compras') {
      return [
        { label: 'Factura', value: 'FACTURA' },
        { label: 'Boleta', value: 'BOLETA' },
        { label: 'Ticket', value: 'TICKET' },
        { label: 'Otro', value: 'OTRO' },
      ];
    }
    if (this.moduleFilter() === 'crm_pipeline') {
      return this.crmPipeline().map((column) => ({
        label: column.etapa.nombre,
        value: column.etapa.codigo,
      }));
    }
    return [
      { label: 'Aceptado', value: 'ACEPTADO' },
      { label: 'Pendiente', value: 'PENDIENTE' },
      { label: 'Procesando', value: 'PROCESANDO' },
      { label: 'Rechazado', value: 'RECHAZADO' },
      { label: 'Error', value: 'ERROR' },
    ];
  });

  protected readonly columns = computed<ReportColumn[]>(() => {
    switch (this.moduleFilter()) {
      case 'crm_pipeline':
        return [
          { key: 'etapa', label: 'Etapa', width: 18 },
          { key: 'orden', label: 'Orden', align: 'center', format: 'number', width: 10 },
          { key: 'oportunidad', label: 'Oportunidad', width: 30 },
          { key: 'cliente', label: 'Cliente / prospecto', width: 28 },
          { key: 'tipo', label: 'Tipo', width: 16 },
          { key: 'monto', label: 'Monto estimado', align: 'right', format: 'currency', width: 16 },
          { key: 'probabilidad', label: 'Probabilidad %', align: 'right', format: 'number', width: 14 },
          { key: 'cierreEstimado', label: 'Cierre estimado', width: 16 },
          { key: 'responsable', label: 'Responsable', width: 22 },
          { key: 'estado', label: 'Estado', align: 'center', width: 14 },
          { key: 'creado', label: 'Creado', width: 18 },
          { key: 'actualizado', label: 'Actualizado', width: 18 },
        ];
      case 'stock':
        return [
          { key: 'producto', label: 'Producto' },
          { key: 'sku', label: 'SKU' },
          { key: 'almacen', label: 'Almacen' },
          { key: 'cantidad', label: 'Cantidad', align: 'right', format: 'number' },
          { key: 'estado', label: 'Estado', align: 'center' },
        ];
      case 'kardex':
        return [
          { key: 'fecha', label: 'Fecha' },
          { key: 'producto', label: 'Producto' },
          { key: 'almacen', label: 'Almacen' },
          { key: 'tipo', label: 'Tipo' },
          { key: 'motivo', label: 'Motivo' },
          { key: 'cantidad', label: 'Cantidad', align: 'right', format: 'number' },
          { key: 'saldo', label: 'Saldo', align: 'right', format: 'number' },
          { key: 'referencia', label: 'Referencia' },
        ];
      case 'caja':
        return [
          { key: 'fecha', label: 'Fecha' },
          { key: 'caja', label: 'Caja' },
          { key: 'tipo', label: 'Tipo' },
          { key: 'descripcion', label: 'Descripcion' },
          { key: 'referencia', label: 'Referencia' },
          { key: 'responsable', label: 'Responsable' },
          { key: 'monto', label: 'Monto', align: 'right', format: 'currency' },
          { key: 'saldo', label: 'Saldo', align: 'right', format: 'currency' },
        ];
      case 'compras':
        return [
          { key: 'fecha', label: 'Fecha', width: 14 },
          { key: 'tipo', label: 'Comprobante', align: 'center', width: 16 },
          { key: 'numero', label: 'Numero', width: 18 },
          { key: 'proveedor', label: 'Proveedor', width: 28 },
          { key: 'almacen', label: 'Almacen', width: 18 },
          { key: 'sku', label: 'SKU', width: 14 },
          { key: 'producto', label: 'Producto', width: 30 },
          { key: 'cantidad', label: 'Cantidad', align: 'right', format: 'number', width: 12 },
          {
            key: 'costoUnitario',
            label: 'Costo compra',
            align: 'right',
            format: 'currency',
            width: 14,
          },
          {
            key: 'precioVenta',
            label: 'Precio venta',
            align: 'right',
            format: 'currency',
            width: 14,
          },
          { key: 'total', label: 'Gasto total', align: 'right', format: 'currency', width: 15 },
          {
            key: 'ventaProyectada',
            label: 'Venta proyectada',
            align: 'right',
            format: 'currency',
            width: 16,
          },
          {
            key: 'gananciaProyectada',
            label: 'Ganancia proyectada',
            align: 'right',
            format: 'currency',
            width: 17,
          },
          {
            key: 'margenPorcentaje',
            label: 'Margen %',
            align: 'right',
            format: 'number',
            width: 13,
          },
          { key: 'lote', label: 'Lote', width: 14 },
          { key: 'vencimiento', label: 'Vencimiento', width: 14 },
        ];
      case 'notas':
        return [
          { key: 'fecha', label: 'Fecha' },
          { key: 'tipo', label: 'Tipo' },
          { key: 'externalId', label: 'External ID' },
          { key: 'venta', label: 'Venta ref.' },
          { key: 'cliente', label: 'Cliente' },
          { key: 'motivo', label: 'Motivo' },
          { key: 'monto', label: 'Monto', align: 'right', format: 'currency' },
          { key: 'estado', label: 'Estado', align: 'center' },
        ];
      case 'guias':
        return [
          { key: 'fecha', label: 'Fecha' },
          { key: 'externalId', label: 'External ID' },
          { key: 'origen', label: 'Origen' },
          { key: 'destino', label: 'Destino' },
          { key: 'motivo', label: 'Motivo' },
          { key: 'transportista', label: 'Transportista' },
          { key: 'estado', label: 'Estado', align: 'center' },
        ];
      default:
        return [
          { key: 'fecha', label: 'Fecha' },
          { key: 'externalId', label: 'External ID' },
          { key: 'cliente', label: 'Cliente' },
          { key: 'documento', label: 'Documento' },
          { key: 'moneda', label: 'Moneda', align: 'center' },
          { key: 'total', label: 'Total', align: 'right', format: 'currency' },
          { key: 'estado', label: 'Estado', align: 'center' },
          { key: 'mensaje', label: 'Mensaje' },
        ];
    }
  });

  protected readonly reportRows = computed(() => this.filterRows(this.buildRows()));

  protected readonly crmPipelineCards = computed(() =>
    this.crmPipeline().map((column) => ({
      codigo: column.etapa.codigo,
      nombre: column.etapa.nombre,
      color: column.etapa.color || '#2563eb',
      cantidad: column.cantidad,
      monto: Number(column.monto || 0),
    })),
  );

  protected readonly canExportXls = computed(
    () => this.reportRows().length > 0 || (this.moduleFilter() === 'crm_pipeline' && this.crmPipelineCards().length > 0),
  );

  protected readonly metrics = computed(() => {
    const rows = this.reportRows();
    const totalAmount = rows.reduce((sum, row) => sum + Number(row['__amount'] || 0), 0);
    const totalQuantity = rows.reduce((sum, row) => sum + Number(row['__quantity'] || 0), 0);
    const totalProfit = rows.reduce((sum, row) => sum + Number(row['__profit'] || 0), 0);
    const accepted = rows.filter(
      (row) => String(row['estado'] || '').toUpperCase() === 'ACEPTADO',
    ).length;
    const errors = rows.filter(
      (row) => String(row['estado'] || '').toUpperCase() === 'ERROR',
    ).length;
    return {
      rows: rows.length,
      totalAmount,
      totalQuantity,
      totalProfit,
      accepted,
      errors,
    };
  });

  protected readonly activeFiltersSummary = computed(() => {
    const parts = [
      `Modulo: ${this.currentModuleLabel()}`,
      this.startDateFilter() ? `Desde ${this.startDateFilter()}` : null,
      this.endDateFilter() ? `Hasta ${this.endDateFilter()}` : null,
      this.statusFilter() ? `Estado ${this.statusFilter()}` : null,
      this.queryFilter().trim() ? `Busqueda "${this.queryFilter().trim()}"` : null,
    ].filter(Boolean);
    return parts.join(' · ');
  });

  constructor() {
    this.loadReports();
  }

  protected loadReports(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    const failedModules: string[] = [];
    const safeList = <T>(request$: Observable<T>, fallback: T, label: string) =>
      request$.pipe(
        catchError(() => {
          failedModules.push(label);
          return of(fallback);
        }),
      );

    forkJoin({
      ventas: safeList(this.api.listVentas(), [] as VentaRecord[], 'ventas'),
      compras: safeList(this.api.listCompras(), [] as Compra[], 'compras'),
      almacenes: safeList(this.api.listAlmacenes(), [] as Almacen[], 'almacenes'),
      productos: safeList(this.api.listProductos(), [] as Producto[], 'productos'),
      stock: safeList(this.api.listStock(), [] as StockItem[], 'stock'),
      kardex: safeList(this.api.listKardex(), [] as KardexMovimiento[], 'kardex'),
      cajas: safeList(this.api.listCajas(), [] as Caja[], 'caja'),
      guias: safeList(this.api.listGuiasRemision(), [] as GuiaRemisionRecord[], 'guias'),
      crmPipeline: safeList(this.api.getCrmPipeline(), [] as CrmPipelineColumn[], 'crm pipeline'),
      notasCredito: safeList(
        this.api.listNotasCredito(),
        [] as NotaFiscalRecord[],
        'notas credito',
      ),
      notasDebito: safeList(this.api.listNotasDebito(), [] as NotaFiscalRecord[], 'notas debito'),
    })
      .pipe(
        switchMap((base) => {
          const movimientosRequests = base.cajas.map((caja) =>
            safeList(
              this.api.listCajaMovimientos(caja.id),
              [] as CajaMovimiento[],
              `movimientos caja ${caja.codigo || caja.id}`,
            ),
          );
          const movimientos$ = movimientosRequests.length
            ? forkJoin(movimientosRequests)
            : of([] as CajaMovimiento[][]);
          return forkJoin({
            base: of(base),
            movimientosCaja: movimientos$,
          });
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: ({ base, movimientosCaja }) => {
          this.ventas.set(base.ventas);
          this.compras.set(base.compras);
          this.almacenes.set(base.almacenes);
          this.productos.set(base.productos);
          this.stock.set(base.stock);
          this.kardex.set(base.kardex);
          this.cajas.set(base.cajas);
          this.guias.set(base.guias);
          this.crmPipeline.set(base.crmPipeline);
          this.notasCredito.set(base.notasCredito);
          this.notasDebito.set(base.notasDebito);
          this.movimientosCaja.set(movimientosCaja.flat());
          const uniqueFailures = Array.from(new Set(failedModules));
          this.successMessage.set(
            uniqueFailures.length
              ? `Reportes cargados parcialmente. Sin datos de: ${uniqueFailures.join(', ')}.`
              : 'Reportes actualizados.',
          );
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected onModuleChange(module: ReportModule): void {
    this.moduleFilter.set(module);
    this.statusFilter.set(null);
    this.almacenFilter.set(null);
    this.productoFilter.set(null);
    this.cajaFilter.set(null);
    this.queryFilter.set('');
  }

  protected clearFilters(): void {
    this.queryFilter.set('');
    this.statusFilter.set(null);
    this.almacenFilter.set(null);
    this.productoFilter.set(null);
    this.cajaFilter.set(null);
    this.startDateFilter.set(null);
    this.endDateFilter.set(null);
  }

  protected setQuickRange(range: QuickRange): void {
    const today = new Date();
    const end = today.toISOString().slice(0, 10);

    if (range === 'today') {
      this.startDateFilter.set(end);
      this.endDateFilter.set(end);
      return;
    }

    if (range === 'month') {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        .toISOString()
        .slice(0, 10);
      this.startDateFilter.set(monthStart);
      this.endDateFilter.set(end);
      return;
    }

    const days = range === 'last7' ? 7 : 30;
    const start = new Date(today);
    start.setDate(start.getDate() - days);
    this.startDateFilter.set(start.toISOString().slice(0, 10));
    this.endDateFilter.set(end);
  }

  protected async exportExcel(): Promise<void> {
    const rows = this.reportRows();
    if (this.moduleFilter() === 'crm_pipeline' && this.crmPipelineCards().length) {
      await this.exportCrmPipelineWorkbook(rows);
      return;
    }

    if (!rows.length) {
      this.errorMessage.set('No hay filas para exportar con los filtros actuales.');
      return;
    }

    await this.excelReport.exportWorkbook(
      `azurion-reporte-${this.moduleFilter()}-${this.today()}.xlsx`,
      [
        {
          name:
            this.moduleOptions.find((item) => item.value === this.moduleFilter())?.label ||
            'Reporte',
          title: `Reporte ${this.moduleOptions.find((item) => item.value === this.moduleFilter())?.label || ''}`,
          subtitle: this.currentFilterSubtitle(),
          columns: this.columns().map(({ align, ...column }) => column),
          rows,
          totalKeys: this.resolveTotalKeys(),
        },
      ],
    );
    this.successMessage.set(`Reporte Excel generado: ${rows.length} fila(s).`);
  }

  protected exportCsv(): void {
    const rows = this.reportRows();
    if (!rows.length) {
      this.errorMessage.set('No hay filas para exportar con los filtros actuales.');
      return;
    }

    const columns = this.columns();
    const lines = [
      columns.map((column) => this.csvEscape(column.label)).join(','),
      ...rows.map((row) =>
        columns
          .map((column) => this.csvEscape(this.normalizeCsvValue(row[column.key], column)))
          .join(','),
      ),
    ];
    const csv = `\uFEFF${lines.join('\r\n')}`;
    this.downloadText(csv, `azurion-reporte-${this.moduleFilter()}-${this.today()}.csv`, 'text/csv;charset=utf-8;');
    this.successMessage.set(`Reporte CSV generado: ${rows.length} fila(s).`);
  }

  protected cellClass(column: ReportColumn): string {
    if (column.align === 'right') {
      return 'cell-right';
    }
    if (column.align === 'center') {
      return 'cell-center';
    }
    return '';
  }

  protected statusSeverity(
    value: string | number | null | undefined,
  ): 'success' | 'warn' | 'danger' | 'info' {
    const status = String(value || '').toUpperCase();
    if (status === 'ACEPTADO' || status === 'OK' || status === 'ENTRADA') {
      return 'success';
    }
    if (
      status === 'ERROR' ||
      status === 'RECHAZADO' ||
      status === 'CRITICO' ||
      status === 'SALIDA'
    ) {
      return 'danger';
    }
    if (status === 'BAJO' || status === 'PENDIENTE' || status === 'PROCESANDO') {
      return 'warn';
    }
    return 'info';
  }

  protected isStatusColumn(column: ReportColumn): boolean {
    return column.key === 'estado' || column.key === 'tipo';
  }

  protected displayCell(row: ReportRow, column: ReportColumn): string | number | boolean | Date {
    const value = row[column.key];
    if (value === null || value === undefined) {
      return '';
    }
    if (column.format === 'currency') {
      return `S/ ${Number(value || 0).toFixed(2)}`;
    }
    if (column.format === 'number') {
      return Number(value || 0).toLocaleString('es-PE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return value;
  }

  private buildRows(): ReportRow[] {
    switch (this.moduleFilter()) {
      case 'stock':
        return this.stock().map((item) => ({
          producto: item.productoNombre,
          sku: item.productoSku,
          almacen: `${item.almacenCodigo} - ${item.almacenNombre}`,
          cantidad: Number(item.cantidad || 0),
          estado: this.stockStatus(item.cantidad),
          __productoId: item.productoId,
          __almacenId: item.almacenId,
          __quantity: Number(item.cantidad || 0),
        }));
      case 'kardex':
        return this.kardex().map((item) => ({
          fecha: this.formatDateTime(item.fechaMovimiento),
          producto: `${item.productoSku} - ${item.productoNombre}`,
          almacen: item.almacenCodigo,
          tipo: item.tipoMovimiento,
          motivo: item.motivo,
          cantidad: Number(item.cantidad || 0),
          saldo: Number(item.saldoResultante || 0),
          referencia: item.referencia || '',
          __date: this.dateOnly(item.fechaMovimiento),
          __productoId: item.productoId,
          __almacenId: item.almacenId,
          __quantity: Number(item.cantidad || 0),
        }));
      case 'caja':
        return this.movimientosCaja().map((item) => {
          const caja = this.cajas().find((candidate) => candidate.id === item.cajaId);
          return {
            fecha: this.formatDateTime(item.fechaMovimiento),
            caja: caja ? `${caja.codigo} - ${caja.nombre}` : `Caja ${item.cajaId}`,
            tipo: item.tipoMovimiento,
            descripcion: item.descripcion,
            referencia: item.referencia || '',
            responsable: item.responsableNombre,
            monto: Number(item.monto || 0),
            saldo: Number(item.saldoResultante || 0),
            __date: this.dateOnly(item.fechaMovimiento),
            __cajaId: item.cajaId,
            __amount: Number(item.monto || 0),
          };
        });
      case 'compras':
        return this.compras().flatMap((compra) =>
          (compra.detalles || []).map((detalle) => ({
            fecha: compra.fechaEmision || this.dateOnly(compra.fechaIngreso),
            tipo: compra.tipoComprobante,
            numero: compra.numeroComprobante,
            proveedor: this.formatProveedor(compra.proveedorDocumento, compra.proveedorNombre),
            almacen: `${compra.almacenCodigo} - ${compra.almacenNombre}`,
            sku: detalle.productoSku,
            producto: detalle.productoNombre,
            cantidad: Number(detalle.cantidad || 0),
            costoUnitario: Number(detalle.costoUnitario || 0),
            precioVenta: Number(detalle.precioVenta || 0),
            total: Number(detalle.total || 0),
            ventaProyectada: Number(detalle.ventaProyectada || 0),
            gananciaProyectada: Number(detalle.gananciaProyectada || 0),
            margenPorcentaje: Number(detalle.margenPorcentaje || 0),
            lote: detalle.codigoLote || '',
            vencimiento: detalle.fechaVencimiento || '',
            __date: compra.fechaEmision || this.dateOnly(compra.fechaIngreso),
            __productoId: detalle.productoId,
            __almacenId: compra.almacenId,
            __status: compra.tipoComprobante,
            __quantity: Number(detalle.cantidad || 0),
            __amount: Number(detalle.total || 0),
            __profit: Number(detalle.gananciaProyectada || 0),
          })),
        );
      case 'notas':
        return [...this.notasCredito(), ...this.notasDebito()].map((item) => ({
          fecha: item.fechaEmision,
          tipo: item.tipoDocumento === '07' ? 'CREDITO' : 'DEBITO',
          externalId: item.externalId,
          venta: item.ventaNumeroDocumento || item.ventaExternalId,
          cliente: `${item.clienteDocumento} - ${item.clienteNombre}`,
          motivo: item.motivoDescripcion,
          monto: Number(item.monto || 0),
          estado: this.resolveDocumentStatus(item),
          __date: item.fechaEmision,
          __amount: Number(item.monto || 0),
        }));
      case 'guias':
        return this.guias().map((item) => ({
          fecha: item.fechaEmision,
          externalId: item.externalId,
          origen: item.sucursalOrigenNombre,
          destino: item.sucursalDestinoNombre,
          motivo: item.motivoTraslado || '',
          transportista: item.transportista || '',
          estado: this.resolveDocumentStatus(item),
          __date: item.fechaEmision,
        }));
      case 'crm_pipeline':
        return this.buildCrmPipelineRows();
      default:
        return this.ventas().map((item) => ({
          fecha: this.formatDateTime(item.fechaVenta),
          externalId: item.externalId,
          cliente: `${item.clienteDocumento} - ${item.clienteNombre}`,
          documento: item.facturadorTipoComprobante || '',
          moneda: item.moneda,
          total: Number(item.total || 0),
          estado: this.resolveDocumentStatus(item),
          mensaje: item.facturadorMensaje || '',
          __date: this.dateOnly(item.fechaVenta),
          __amount: Number(item.total || 0),
        }));
    }
  }

  private filterRows(rows: ReportRow[]): ReportRow[] {
    const query = this.queryFilter().trim().toLowerCase();
    const status = this.statusFilter();
    const start = this.startDateFilter();
    const end = this.endDateFilter();
    const productoId = this.productoFilter();
    const almacenId = this.almacenFilter();
    const cajaId = this.cajaFilter();

    return rows.filter((row) => {
      if (
        query &&
        !Object.entries(row).some(
          ([key, value]) =>
            !key.startsWith('__') &&
            String(value ?? '')
              .toLowerCase()
              .includes(query),
        )
      ) {
        return false;
      }
      if (status) {
        const rowStatus = String(
          row['__status'] || row['estado'] || row['tipo'] || '',
        ).toUpperCase();
        if (rowStatus !== status.toUpperCase()) {
          return false;
        }
      }
      const date = String(row['__date'] || '');
      if (date && start && date < start) {
        return false;
      }
      if (date && end && date > end) {
        return false;
      }
      if (productoId && Number(row['__productoId'] || 0) !== productoId) {
        return false;
      }
      if (almacenId && Number(row['__almacenId'] || 0) !== almacenId) {
        return false;
      }
      if (cajaId && Number(row['__cajaId'] || 0) !== cajaId) {
        return false;
      }
      return true;
    });
  }

  private resolveDocumentStatus(item: {
    facturacionEstado?: string | null;
    facturadorSunatEstado?: string | null;
  }): string {
    return String(
      item.facturadorSunatEstado || item.facturacionEstado || 'PENDIENTE',
    ).toUpperCase();
  }

  private stockStatus(cantidad: number): string {
    const value = Number(cantidad || 0);
    if (value <= 0) {
      return 'CRITICO';
    }
    if (value <= 5) {
      return 'BAJO';
    }
    return 'OK';
  }

  private formatDateTime(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  private dateOnly(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      return value.slice(0, 10);
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
  }

  private formatProveedor(documento?: string | null, nombre?: string | null): string {
    const parts = [documento, nombre].map((value) => String(value || '').trim()).filter(Boolean);
    return parts.length ? parts.join(' - ') : 'Proveedor no especificado';
  }

  private resolveTotalKeys(): string[] {
    if (this.moduleFilter() === 'crm_pipeline') {
      return ['monto'];
    }
    if (this.moduleFilter() === 'stock' || this.moduleFilter() === 'kardex') {
      return ['cantidad'];
    }
    if (this.moduleFilter() === 'ventas') {
      return ['total'];
    }
    if (this.moduleFilter() === 'compras') {
      return ['cantidad', 'total', 'ventaProyectada', 'gananciaProyectada'];
    }
    if (this.moduleFilter() === 'caja') {
      return ['monto'];
    }
    if (this.moduleFilter() === 'notas') {
      return ['monto'];
    }
    return [];
  }

  private currentFilterSubtitle(): string {
    const parts = [
      `Generado: ${new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())}`,
      this.startDateFilter() ? `Desde: ${this.startDateFilter()}` : null,
      this.endDateFilter() ? `Hasta: ${this.endDateFilter()}` : null,
      this.statusFilter() ? `Estado/tipo: ${this.statusFilter()}` : null,
      this.queryFilter().trim() ? `Busqueda: ${this.queryFilter().trim()}` : null,
      this.productoFilter() ? `Producto ID: ${this.productoFilter()}` : null,
      this.almacenFilter() ? `Almacen ID: ${this.almacenFilter()}` : null,
      this.cajaFilter() ? `Caja ID: ${this.cajaFilter()}` : null,
    ].filter(Boolean);
    return parts.join(' | ');
  }

  private buildCrmPipelineRows(): ReportRow[] {
    return this.crmPipeline().flatMap((column) =>
      (column.oportunidades || []).map((opportunity) => ({
        etapa: column.etapa.nombre,
        orden: Number(column.etapa.orden || 0),
        oportunidad: opportunity.titulo,
        cliente: opportunity.clienteNombre || opportunity.prospectoNombre || 'Sin cliente',
        tipo: opportunity.tipoOportunidad || 'Oportunidad',
        monto: Number(opportunity.montoEstimado || 0),
        probabilidad: Number(opportunity.probabilidad || column.etapa.probabilidadDefault || 0),
        cierreEstimado: opportunity.fechaCierreEstimada || '',
        responsable: opportunity.responsableId || '',
        estado: opportunity.estado || '',
        creado: this.formatDateTime(opportunity.createdAt),
        actualizado: this.formatDateTime(opportunity.updatedAt || opportunity.fechaUltimaActualizacion),
        __date: opportunity.fechaCierreEstimada || this.dateOnly(opportunity.createdAt),
        __status: column.etapa.codigo,
        __amount: Number(opportunity.montoEstimado || 0),
      })),
    );
  }

  private async exportCrmPipelineWorkbook(rows: ReportRow[]): Promise<void> {
    const columns = this.columns().map(({ align, ...column }) => column);
    const sheets: ExcelReportSheet[] = [
      {
        name: 'Pipeline completo',
        title: 'Reporte CRM pipeline completo',
        subtitle: this.currentFilterSubtitle(),
        columns,
        rows,
        totalKeys: ['monto'],
      },
      {
        name: 'Resumen etapas',
        title: 'Resumen de cuadros del pipeline',
        subtitle: this.currentFilterSubtitle(),
        columns: [
          { key: 'etapa', label: 'Etapa', width: 22 },
          { key: 'codigo', label: 'Codigo', width: 16 },
          { key: 'cantidad', label: 'Oportunidades', format: 'number', width: 16 },
          { key: 'monto', label: 'Monto total', format: 'currency', width: 16 },
        ],
        rows: this.crmPipelineCards().map((card) => ({
          etapa: card.nombre,
          codigo: card.codigo,
          cantidad: card.cantidad,
          monto: card.monto,
        })),
        totalKeys: ['cantidad', 'monto'],
      },
      ...this.crmPipeline().map((column) => {
        const stageRows = rows.filter((row) => row['__status'] === column.etapa.codigo);
        return {
          name: column.etapa.nombre,
          title: `Pipeline - ${column.etapa.nombre}`,
          subtitle: this.currentFilterSubtitle(),
          columns,
          rows: stageRows,
          totalKeys: ['monto'],
        };
      }),
    ];

    await this.excelReport.exportWorkbook(`azurion-crm-pipeline-${this.today()}.xlsx`, sheets);
    this.successMessage.set(`Pipeline CRM exportado en Excel: ${rows.length} oportunidad(es).`);
  }

  private normalizeCsvValue(value: ExcelCellValue, column: ReportColumn): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (column.format === 'currency' || column.format === 'number') {
      return String(Number(value || 0));
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    return String(value);
  }

  private csvEscape(value: string): string {
    return `"${value.replace(/"/g, '""')}"`;
  }

  private downloadText(content: string, fileName: string, type: string): void {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
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
        return 'No tienes permisos para consultar reportes de este tenant.';
      }
      return (
        httpError.error?.details?.[0] ||
        httpError.error?.message ||
        'No se pudo cargar la informacion de reportes.'
      );
    }
    return 'No se pudo cargar la informacion de reportes.';
  }
}
