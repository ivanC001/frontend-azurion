import {
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, forkJoin, of, timeout } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { AuthSessionService } from '@core/auth/auth-session.service';
import { LowStockAlertService } from '@features/admin/services/low-stock-alert.service';
import { createClientOperationId } from '@core/utils/client-operation-id';
import { canIssueElectronicDocuments } from '@features/facturador/data/facturador-capability';
import {
  AdminSaasApiService,
  Caja,
  Cliente,
  FacturadorVentaResponse,
  FormatoImpresionComprobante,
  Producto,
  RegistrarVentaCajaResponse,
  TipoComprobanteVenta,
  VentaRecord,
  VentaSummary,
  VentaStatusStreamEvent,
} from '../../data/admin-saas-api.service';
import { isIdentifiedCustomer } from '../../shared/customer-document-rules';

type ClienteTipoDoc = '0' | '1' | '6';
type Moneda = 'PEN' | 'USD';
type TagSeverity = 'success' | 'warn' | 'danger' | 'info' | 'secondary' | 'contrast';
type ArchivoComprobante = 'pdf' | 'xml' | 'cdr';
type EscenarioSunat =
  | 'NORMAL'
  | 'EXONERADA'
  | 'GRATUITA'
  | 'DESCUENTOS'
  | 'PERCEPCION'
  | 'ANTICIPOS'
  | 'DETRACCION'
  | 'EXPORTACION'
  | 'ICBPER'
  | 'CONTINGENCIA'
  | 'FORMA_PAGO'
  | 'OTROS';

interface FacturaItemForm {
  tipoItem: 'PRODUCTO';
  productoId: number | null;
  cantidad: number;
  descuento: number;
  precioUnitario: number;
  moneda: Moneda;
  afectacionIgv: string;
  descripcion: string;
  almacenId: number | null;
  codigoSunat: string;
  unidad: string;
  porcentajeIgv: number;
  mtoValorGratuito: number;
  icbper: number;
  factorIcbper: number;
  isc: number;
  porcentajeIsc: number;
  tipSisIsc: string;
  otroTributo: number;
  porcentajeOtroTributo: number;
}

interface NuevaFacturaForm {
  cajaId: number | null;
  clienteId: number | null;
  tipoComprobante: TipoComprobanteVenta;
  escenarioSunat: EscenarioSunat;
  fechaEmision: string;
  moneda: Moneda;
  tipoCambio: number;
  formaPago: 'CONTADO' | 'CREDITO';
  metodoPago: 'EFECTIVO' | 'TARJETA' | 'YAPE' | 'PLIN' | 'TRANSFERENCIA';
  tipoOperacionSunat: string;
  contingencia: boolean;
  cuotaMonto: number;
  cuotaFechaPago: string;
  aplicaPercepcion: boolean;
  percepcionCodigoRegimen: string;
  percepcionPorcentaje: number;
  aplicaAnticipo: boolean;
  anticipoTipoDocRel: string;
  anticipoNumero: string;
  anticipoTotal: number;
  aplicaDetraccion: boolean;
  detraccionCodigoBien: string;
  detraccionCodigoMedioPago: string;
  detraccionCuentaBanco: string;
  detraccionPorcentaje: number;
  detraccionMonto: number;
  detraccionValorReferencial: number;
  observacion: string;
  clienteTipoDoc: ClienteTipoDoc;
  clienteNumeroDoc: string;
  clienteNombre: string;
  clienteDireccion: string;
  clienteEmail: string;
  clienteTelefono: string;
  items: FacturaItemForm[];
}

interface VentaTrace {
  readonly externalId: string;
  readonly endpoint: string;
  readonly tipoComprobante: string;
  readonly statusCode: number;
  readonly message: string;
  readonly sunatEstado: string | null;
  readonly documentoId: string | null;
  readonly ticketSunat: string | null;
  readonly pdfUrl: string | null;
  readonly xmlUrl: string | null;
  readonly cdrUrl: string | null;
  readonly raw: unknown;
  readonly recordedAt: string;
}

type VentaTraceMap = Record<string, VentaTrace>;

const DOC_LENGTH_BY_TYPE: Record<ClienteTipoDoc, number> = {
  '0': 0,
  '1': 8,
  '6': 11,
};

const AFECTACION_IGV_OPTIONS = [
  { label: '10 - Gravado - Operacion Onerosa', value: '10' },
  { label: '11 - Gravado - Retiro por premio', value: '11' },
  { label: '12 - Gravado - Retiro por donacion', value: '12' },
  { label: '13 - Gravado - Retiro', value: '13' },
  { label: '14 - Gravado - Retiro por publicidad', value: '14' },
  { label: '15 - Gravado - Bonificaciones', value: '15' },
  { label: '16 - Gravado - Retiro por entrega a trabajadores', value: '16' },
  { label: '17 - Gravado - IVAP', value: '17' },
  { label: '20 - Exonerado - Operacion Onerosa', value: '20' },
  { label: '21 - Exonerado - Transferencia Gratuita', value: '21' },
  { label: '30 - Inafecto - Operacion Onerosa', value: '30' },
  { label: '31 - Inafecto - Retiro por Bonificacion', value: '31' },
  { label: '32 - Inafecto - Retiro', value: '32' },
  { label: '33 - Inafecto - Retiro por Muestras Medicas', value: '33' },
  { label: '34 - Inafecto - Retiro por Convenio Colectivo', value: '34' },
  { label: '35 - Inafecto - Retiro por premio', value: '35' },
  { label: '36 - Inafecto - Retiro por publicidad', value: '36' },
  { label: '40 - Exportacion', value: '40' },
];

const ESCENARIO_SUNAT_OPTIONS: Array<{ label: string; value: EscenarioSunat }> = [
  { label: 'F. Exonerada', value: 'EXONERADA' },
  { label: 'F. Gratuita', value: 'GRATUITA' },
  { label: 'F. Descuentos', value: 'DESCUENTOS' },
  { label: 'F. Percepcion', value: 'PERCEPCION' },
  { label: 'F. Anticipos', value: 'ANTICIPOS' },
  { label: 'F. Detraccion', value: 'DETRACCION' },
  { label: 'F. Exportacion', value: 'EXPORTACION' },
  { label: 'F. ICBPER', value: 'ICBPER' },
  { label: 'Boleta de Venta', value: 'OTROS' },
  { label: 'Contingencia', value: 'CONTINGENCIA' },
  { label: 'Forma de Pago', value: 'FORMA_PAGO' },
  { label: 'Otros', value: 'NORMAL' },
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-sales-admin-page',
  imports: [
    DatePipe,
    DecimalPipe,
    NgClass,
    FormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    TableModule,
    TagModule,
  ],
  templateUrl: './sales-admin-page.html',
  styleUrl: './sales-admin-page.scss',
})
export class SalesAdminPage implements OnDestroy {
  private static readonly TRACE_CACHE_PREFIX = 'azurion.sales.trace';
  private static readonly REQUEST_TIMEOUT_MS = 18000;
  private static readonly LIST_REQUEST_TIMEOUT_MS = 12000;
  private static readonly PDF_REQUEST_TIMEOUT_MS = 30000;
  private static readonly LIST_WATCHDOG_MS = 16000;
  private static readonly STATUS_STREAM_RECONNECT_MS = 3000;

  private readonly api = inject(AdminSaasApiService);
  private readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);
  private readonly lowStockAlerts = inject(LowStockAlertService);
  private ventasLoadRequestSeq = 0;
  private ventasRequestSubscription: Subscription | null = null;
  private ventasStatusStreamSubscription: Subscription | null = null;
  private ventasStatusReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  private pendingFacturaOperationId: string | null = null;

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly ventas = signal<VentaRecord[]>([]);
  protected readonly ventasTotal = signal(0);
  protected readonly ventasPage = signal(0);
  protected readonly ventasPageSize = signal(20);
  protected readonly ventasSummary = signal<VentaSummary | null>(null);
  protected readonly cajasAbiertas = signal<Caja[]>([]);
  protected readonly clientes = signal<Cliente[]>([]);
  protected readonly productos = signal<Producto[]>([]);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly infoMessage = signal<string | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly facturaDialogVisible = signal(false);
  protected readonly traceDialogVisible = signal(false);
  protected readonly detalleDialogVisible = signal(false);
  protected readonly traceByExternalId = signal<VentaTraceMap>({});
  protected readonly selectedVenta = signal<VentaRecord | null>(null);
  protected readonly activeTrace = signal<VentaTrace | null>(null);
  protected readonly quickPdfVentaId = signal<number | null>(null);
  protected readonly quickPdfFormat = signal<FormatoImpresionComprobante | null>(null);
  protected readonly downloadingArtifact = signal<string | null>(null);
  protected readonly retryingVentaId = signal<number | null>(null);
  protected readonly selectedVentaIds = signal<ReadonlySet<number>>(new Set<number>());

  protected facturaForm: NuevaFacturaForm = this.createFacturaForm();

  protected readonly filteredVentas = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const base = [...this.ventas()].sort((a, b) => {
      return new Date(b.fechaVenta).getTime() - new Date(a.fechaVenta).getTime();
    });
    if (!query) {
      return base;
    }

    return base.filter((venta) => {
      return (
        this.match(venta.externalId, query) ||
        this.match(venta.clienteNombre, query) ||
        this.match(venta.clienteDocumento, query) ||
        this.match(venta.moneda, query) ||
        this.match(this.formatAmount(venta), query) ||
        this.match(this.rowEstadoLabel(venta), query)
      );
    });
  });

  protected readonly metrics = computed(() => {
    const summary = this.ventasSummary();
    if (summary) {
      return summary;
    }
    const rows = this.filteredVentas();
    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    let totalMonto = 0;
    let ventasHoy = 0;
    let aceptadasSunat = 0;
    let pendientesSunat = 0;
    let ticketsInternos = 0;

    for (const venta of rows) {
      totalMonto += Number(venta.total);

      const fechaVenta = new Date(venta.fechaVenta);
      const fechaIso = `${fechaVenta.getFullYear()}-${String(fechaVenta.getMonth() + 1).padStart(2, '0')}-${String(fechaVenta.getDate()).padStart(2, '0')}`;
      if (fechaIso === todayIso) {
        ventasHoy += 1;
      }

      const estado = this.resolveSunatEstado(venta);
      if (this.isTicketDocument(venta)) {
        ticketsInternos += 1;
      }
      if (estado === 'ACEPTADO') {
        aceptadasSunat += 1;
      }
      if (estado && estado !== 'ACEPTADO') {
        pendientesSunat += 1;
      }
    }

    return {
      totalVentas: rows.length,
      totalMonto,
      ventasHoy,
      aceptadasSunat,
      pendientesSunat,
      ticketsInternos,
    };
  });

  protected readonly comprobanteOptions = computed(() => {
    const options: Array<{ label: string; value: TipoComprobanteVenta }> = [
      { label: 'Ticket de venta - emitido por Facturador', value: 'TICKET_VENTA' },
    ];
    if (canIssueElectronicDocuments(this.session.currentSession()?.empresa)) {
      options.push(
        { label: 'Boleta electronica', value: 'BOLETA' },
        { label: 'Factura electronica', value: 'FACTURA' },
      );
    }
    return options;
  });

  protected readonly monedaOptions = [
    { label: 'Soles', value: 'PEN' },
    { label: 'Dolares', value: 'USD' },
  ];

  protected readonly formaPagoOptions = [
    { label: 'Contado', value: 'CONTADO' },
    { label: 'Credito', value: 'CREDITO' },
  ];

  protected readonly metodoPagoOptions = [
    { label: 'Efectivo', value: 'EFECTIVO' },
    { label: 'Tarjeta', value: 'TARJETA' },
    { label: 'Yape', value: 'YAPE' },
    { label: 'Plin', value: 'PLIN' },
    { label: 'Transferencia', value: 'TRANSFERENCIA' },
  ];

  protected readonly clienteTipoDocOptions = [
    { label: 'Sin doc', value: '0' },
    { label: 'DNI', value: '1' },
    { label: 'RUC', value: '6' },
  ];

  protected readonly escenarioSunatOptions = ESCENARIO_SUNAT_OPTIONS;
  protected readonly afectacionIgvOptions = AFECTACION_IGV_OPTIONS;

  protected readonly productoOptions = computed(() =>
    this.productos().map((producto) => ({
      label: `${producto.sku} - ${producto.nombre} (stock ${producto.stockCantidad})`,
      value: producto.id,
    })),
  );

  protected readonly clienteOptions = computed(() =>
    this.clientes().map((cliente) => ({
      label: `${cliente.numeroDocumento} - ${cliente.nombre}`,
      value: cliente.id,
    })),
  );

  protected readonly cajaOptions = computed(() =>
    this.cajasAbiertas().map((caja) => ({
      label: `${caja.cajaCodigo} - ${caja.cajaNombre} (${caja.sucursalCodigo})`,
      value: caja.id,
    })),
  );

  constructor() {
    this.traceByExternalId.set(this.readTraceCache());
    this.loadData();
    this.startVentasStatusStream();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.stopVentasStatusStream();
  }

  protected loadData(): void {
    this.loadVentasOnly();
    this.loadVentasSummary();
    this.loadSupportData();
  }

  private loadVentasOnly(): void {
    this.ventasPage.set(0);
    this.requestVentas(undefined);
  }

  private loadVentasSummary(): void {
    this.api.getVentasSummary().subscribe({
      next: (summary) => this.ventasSummary.set(summary),
      error: () => undefined,
    });
  }

  private loadSupportData(): void {
    forkJoin({
      cajas: this.api.listCajas('ABIERTA').pipe(
        timeout(SalesAdminPage.LIST_REQUEST_TIMEOUT_MS),
        catchError(() => of([] as Caja[])),
      ),
      clientes: this.api.listClientes().pipe(
        timeout(SalesAdminPage.LIST_REQUEST_TIMEOUT_MS),
        catchError(() => of([] as Cliente[])),
      ),
      productos: this.api.listAllProductos().pipe(
        timeout(SalesAdminPage.LIST_REQUEST_TIMEOUT_MS),
        catchError(() => of([] as Producto[])),
      ),
    }).subscribe({
      next: ({ cajas, clientes, productos }) => {
        this.cajasAbiertas.set(cajas);
        this.clientes.set(clientes);
        this.productos.set(productos);
      },
      error: () => {
        // keep current data if support calls fail or timeout
      },
    });
  }

  protected refreshVentas(): void {
    this.ventasPage.set(0);
    this.requestVentas(this.searchTerm().trim() || undefined);
    this.loadVentasSummary();
  }

  protected onVentasPage(event: { first?: number | null; rows?: number | null }): void {
    const size = Math.max(1, Number(event.rows ?? this.ventasPageSize()));
    const first = Math.max(0, Number(event.first ?? 0));
    this.ventasPageSize.set(size);
    this.ventasPage.set(Math.floor(first / size));
    this.requestVentas(this.searchTerm().trim() || undefined);
  }

  private requestVentas(query: string | undefined): void {
    if (this.ventasRequestSubscription) {
      this.ventasRequestSubscription.unsubscribe();
      this.ventasRequestSubscription = null;
    }

    const requestSeq = ++this.ventasLoadRequestSeq;
    this.loading.set(true);
    this.errorMessage.set(null);
    let settled = false;
    let watchdog: ReturnType<typeof setTimeout> | null = null;

    this.ventasRequestSubscription = this.api
      .pageVentas(query ?? '', this.ventasPage(), this.ventasPageSize())
      .pipe(timeout(SalesAdminPage.LIST_REQUEST_TIMEOUT_MS))
      .subscribe({
        next: (response) => {
          if (requestSeq !== this.ventasLoadRequestSeq) {
            return;
          }
          settled = true;
          if (watchdog !== null) {
            clearTimeout(watchdog);
          }
          this.ventas.set(Array.isArray(response.content) ? response.content : []);
          this.ventasTotal.set(Number(response.totalElements ?? 0));
          this.loading.set(false);
          this.ventasRequestSubscription = null;
        },
        error: (error: unknown) => {
          if (requestSeq !== this.ventasLoadRequestSeq) {
            return;
          }
          settled = true;
          if (watchdog !== null) {
            clearTimeout(watchdog);
          }
          this.loading.set(false);
          this.errorMessage.set(this.resolveError(error));
          this.ventasRequestSubscription = null;
        },
      });

    watchdog = setTimeout(() => {
      if (settled || requestSeq !== this.ventasLoadRequestSeq) {
        return;
      }
      settled = true;
      this.ventasRequestSubscription?.unsubscribe();
      this.ventasRequestSubscription = null;
      this.loading.set(false);
      this.errorMessage.set(
        'La consulta de ventas demoro demasiado. Intenta nuevamente en unos momentos.',
      );
    }, SalesAdminPage.LIST_WATCHDOG_MS);
  }

  private startVentasStatusStream(): void {
    this.stopVentasStatusStream();
    this.ventasStatusStreamSubscription = this.api.streamVentasStatus().subscribe({
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
    if (this.ventasStatusReconnectTimer !== null) {
      clearTimeout(this.ventasStatusReconnectTimer);
      this.ventasStatusReconnectTimer = null;
    }

    if (this.ventasStatusStreamSubscription) {
      this.ventasStatusStreamSubscription.unsubscribe();
      this.ventasStatusStreamSubscription = null;
    }
  }

  private scheduleVentasStatusReconnect(): void {
    if (this.destroyed || this.ventasStatusReconnectTimer !== null) {
      return;
    }

    this.ventasStatusReconnectTimer = setTimeout(() => {
      this.ventasStatusReconnectTimer = null;
      if (!this.destroyed) {
        this.startVentasStatusStream();
      }
    }, SalesAdminPage.STATUS_STREAM_RECONNECT_MS);
  }

  private isVentasStatusAuthorizationError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error ?? '');
    return message.includes('SSE_HTTP_401') || message.includes('SSE_HTTP_403');
  }

  private applyVentaStatusEvent(event: VentaStatusStreamEvent): void {
    if (!event.externalId) {
      return;
    }

    const current = this.ventas();
    const index = current.findIndex((venta) => venta.externalId === event.externalId);
    if (index >= 0) {
      const target = current[index];
      const updated: VentaRecord = {
        ...target,
        facturacionEstado: event.facturacionEstado ?? target.facturacionEstado ?? null,
        facturacionIntentos: event.facturacionIntentos ?? target.facturacionIntentos ?? null,
        facturadorHttpStatus: event.facturadorHttpStatus ?? target.facturadorHttpStatus ?? null,
        facturadorEndpoint: event.facturadorEndpoint ?? target.facturadorEndpoint ?? null,
        facturadorTipoComprobante:
          event.facturadorTipoComprobante ?? target.facturadorTipoComprobante ?? null,
        facturadorMensaje: event.facturadorMensaje ?? target.facturadorMensaje ?? null,
        facturadorSunatEstado: event.facturadorSunatEstado ?? target.facturadorSunatEstado ?? null,
        facturadorDocumentoId: event.facturadorDocumentoId ?? target.facturadorDocumentoId ?? null,
        facturadorTicket: event.facturadorTicket ?? target.facturadorTicket ?? null,
        facturadorPdfUrl: event.facturadorPdfUrl ?? target.facturadorPdfUrl ?? null,
        facturadorXmlUrl: event.facturadorXmlUrl ?? target.facturadorXmlUrl ?? null,
        facturadorCdrUrl: event.facturadorCdrUrl ?? target.facturadorCdrUrl ?? null,
        facturacionActualizadoEn:
          event.facturacionActualizadoEn ?? target.facturacionActualizadoEn ?? null,
      };

      const next = [...current];
      next[index] = updated;
      this.ventas.set(next);
    }

    const trace = this.traceFromStatusStreamEvent(event);
    if (trace) {
      this.upsertTrace(trace);
    }

    const selected = this.selectedVenta();
    if (selected && selected.externalId === event.externalId) {
      this.selectedVenta.set({
        ...selected,
        facturacionEstado: event.facturacionEstado ?? selected.facturacionEstado ?? null,
        facturacionIntentos: event.facturacionIntentos ?? selected.facturacionIntentos ?? null,
        facturadorHttpStatus: event.facturadorHttpStatus ?? selected.facturadorHttpStatus ?? null,
        facturadorEndpoint: event.facturadorEndpoint ?? selected.facturadorEndpoint ?? null,
        facturadorTipoComprobante:
          event.facturadorTipoComprobante ?? selected.facturadorTipoComprobante ?? null,
        facturadorMensaje: event.facturadorMensaje ?? selected.facturadorMensaje ?? null,
        facturadorSunatEstado:
          event.facturadorSunatEstado ?? selected.facturadorSunatEstado ?? null,
        facturadorDocumentoId:
          event.facturadorDocumentoId ?? selected.facturadorDocumentoId ?? null,
        facturadorTicket: event.facturadorTicket ?? selected.facturadorTicket ?? null,
        facturadorPdfUrl: event.facturadorPdfUrl ?? selected.facturadorPdfUrl ?? null,
        facturadorXmlUrl: event.facturadorXmlUrl ?? selected.facturadorXmlUrl ?? null,
        facturadorCdrUrl: event.facturadorCdrUrl ?? selected.facturadorCdrUrl ?? null,
        facturacionActualizadoEn:
          event.facturacionActualizadoEn ?? selected.facturacionActualizadoEn ?? null,
      });
    }
  }

  protected openNuevaFactura(): void {
    void this.router.navigate(['/admin/ventas/nueva']);
  }

  protected onClienteCatalogChange(clienteId: number | null): void {
    this.facturaForm.clienteId = clienteId;
    if (!clienteId) {
      return;
    }

    const cliente = this.clientes().find((item) => item.id === clienteId);
    if (!cliente) {
      return;
    }

    const tipoDocumento =
      cliente.tipoDocumento === '1' || cliente.tipoDocumento === '6' ? cliente.tipoDocumento : '0';
    this.facturaForm.clienteTipoDoc = tipoDocumento;
    this.facturaForm.clienteNumeroDoc = cliente.numeroDocumento;
    this.facturaForm.clienteNombre = cliente.nombre;
    this.facturaForm.clienteEmail = cliente.email || '';
    this.normalizeClienteDocumento();
  }

  protected onSearch(value: string): void {
    this.searchTerm.set(value);
  }

  protected totalFactura(): number {
    return this.facturaForm.items.reduce((sum, item) => {
      const line = Number(item.cantidad || 0) * Number(item.precioUnitario || 0);
      const discount = Number(item.descuento || 0);
      return sum + Math.max(line - discount, 0);
    }, 0);
  }

  protected hasCajasAbiertas(): boolean {
    return this.cajasAbiertas().length > 0;
  }

  protected currentCajaLabel(): string {
    const cajaId = this.facturaForm.cajaId;
    if (!cajaId) {
      return 'Selecciona una caja';
    }
    const caja = this.cajasAbiertas().find((item) => item.id === cajaId);
    if (!caja) {
      return 'Caja no encontrada';
    }
    return `${caja.cajaCodigo} - ${caja.cajaNombre}`;
  }

  protected currentCajaApertura(): number | null {
    const cajaId = this.facturaForm.cajaId;
    if (!cajaId) {
      return null;
    }
    const caja = this.cajasAbiertas().find((item) => item.id === cajaId);
    return caja ? Number(caja.saldoApertura) : null;
  }

  protected cajaAperturadaEn(): string | null {
    const cajaId = this.facturaForm.cajaId;
    if (!cajaId) {
      return null;
    }
    const caja = this.cajasAbiertas().find((item) => item.id === cajaId);
    return caja?.fechaApertura || null;
  }

  protected onTipoComprobanteChange(): void {
    if (this.facturaForm.tipoComprobante === 'FACTURA') {
      this.facturaForm.clienteTipoDoc = '6';
    } else if (this.facturaForm.tipoComprobante === 'BOLETA') {
      if (this.facturaForm.clienteTipoDoc === '0') {
        this.facturaForm.clienteTipoDoc = '1';
      }
    } else {
      this.facturaForm.clienteTipoDoc = '0';
      this.facturaForm.clienteId = null;
      this.facturaForm.clienteNumeroDoc = '';
      this.facturaForm.clienteNombre = '';
      this.facturaForm.clienteDireccion = '';
      this.facturaForm.clienteEmail = '';
      this.facturaForm.clienteTelefono = '';
    }

    this.normalizeClienteDocumento();
  }

  protected onEscenarioSunatChange(): void {
    const escenario = this.facturaForm.escenarioSunat;

    this.facturaForm.aplicaPercepcion = escenario === 'PERCEPCION';
    this.facturaForm.aplicaDetraccion = escenario === 'DETRACCION';
    this.facturaForm.aplicaAnticipo = escenario === 'ANTICIPOS';
    this.facturaForm.contingencia = escenario === 'CONTINGENCIA';

    if (escenario === 'EXPORTACION') {
      this.facturaForm.tipoOperacionSunat = '0200';
      for (const item of this.facturaForm.items) {
        item.afectacionIgv = '40';
        item.porcentajeIgv = 0;
      }
      return;
    }

    if (escenario === 'PERCEPCION') {
      this.facturaForm.tipoOperacionSunat = '2001';
      return;
    }

    if (escenario === 'DETRACCION') {
      this.facturaForm.tipoOperacionSunat = '1001';
      return;
    }

    this.facturaForm.tipoOperacionSunat = '0101';

    if (escenario === 'EXONERADA') {
      for (const item of this.facturaForm.items) {
        item.afectacionIgv = '20';
        item.porcentajeIgv = 0;
      }
      return;
    }

    if (escenario === 'GRATUITA') {
      for (const item of this.facturaForm.items) {
        item.afectacionIgv = '11';
        item.porcentajeIgv = 18;
        const referencial = Number(item.cantidad || 0) * Number(item.precioUnitario || 0);
        item.mtoValorGratuito = referencial > 0 ? referencial : Number(item.mtoValorGratuito || 0);
        item.descuento = referencial > 0 ? referencial : item.descuento;
      }
      return;
    }

    if (escenario === 'ICBPER') {
      for (const item of this.facturaForm.items) {
        if (!item.icbper || item.icbper <= 0) {
          item.icbper = 0.5;
        }
        if (!item.factorIcbper || item.factorIcbper <= 0) {
          item.factorIcbper = 0.5;
        }
      }
    }
  }

  protected onClienteTipoDocChange(tipo: ClienteTipoDoc): void {
    this.facturaForm.clienteId = null;
    this.facturaForm.clienteTipoDoc = tipo;
    this.normalizeClienteDocumento();
  }

  protected onClienteNumeroDocChange(value: string): void {
    this.facturaForm.clienteId = null;
    const onlyDigits = (value || '').replace(/\D+/g, '');
    const maxLength = this.clienteDocMaxLength();
    this.facturaForm.clienteNumeroDoc = maxLength > 0 ? onlyDigits.slice(0, maxLength) : '';
  }

  protected clienteDocMaxLength(): number {
    if (this.facturaForm.tipoComprobante === 'FACTURA') {
      return 11;
    }

    if (
      this.facturaForm.tipoComprobante === 'BOLETA_SIN_NOMBRE' ||
      this.facturaForm.tipoComprobante === 'TICKET_VENTA'
    ) {
      return 0;
    }

    return DOC_LENGTH_BY_TYPE[this.facturaForm.clienteTipoDoc] || 15;
  }

  protected clienteDocPlaceholder(): string {
    if (this.facturaForm.tipoComprobante === 'FACTURA') {
      return 'RUC (11 digitos)';
    }
    if (
      this.facturaForm.tipoComprobante === 'BOLETA_SIN_NOMBRE' ||
      this.facturaForm.tipoComprobante === 'TICKET_VENTA'
    ) {
      return 'No requerido';
    }
    if (this.facturaForm.clienteTipoDoc === '1') {
      return 'DNI (8 digitos)';
    }
    if (this.facturaForm.clienteTipoDoc === '6') {
      return 'RUC (11 digitos)';
    }
    return 'Documento opcional';
  }

  protected reglaComprobante(): string {
    if (this.facturaForm.tipoComprobante === 'FACTURA') {
      return 'Regla factura: RUC (11 digitos) y razon social obligatorios.';
    }
    if (this.facturaForm.tipoComprobante === 'BOLETA') {
      return 'Regla boleta: si supera S/ 500 se exige un cliente identificado con DNI o RUC.';
    }
    return 'Ticket de venta: registra venta, stock y caja inmediatamente. El Facturador asigna el numero y genera el PDF sin enviarlo a SUNAT.';
  }

  protected isTicketForm(): boolean {
    return this.facturaForm.tipoComprobante === 'TICKET_VENTA';
  }

  protected submitButtonLabel(): string {
    return this.isTicketForm()
      ? 'Confirmar venta y generar ticket'
      : 'Confirmar y enviar en segundo plano';
  }

  protected isTicketDocument(venta: VentaRecord): boolean {
    const tipo = (venta.facturadorTipoComprobante || '').trim().toUpperCase();
    return tipo === 'TICKET_VENTA' || tipo === 'TICKET' || tipo === 'TK';
  }

  protected isLegacyInternalTicket(venta: VentaRecord): boolean {
    const estado = (venta.facturacionEstado || '').trim().toUpperCase();
    return estado === 'NO_REQUIERE';
  }

  protected documentTypeLabel(venta: VentaRecord): string {
    if (this.isTicketDocument(venta)) {
      return 'Ticket de venta';
    }
    const tipo = (venta.facturadorTipoComprobante || '').trim().toUpperCase();
    return tipo === 'FACTURA' ? 'Factura' : tipo.startsWith('BOLETA') ? 'Boleta' : 'Comprobante';
  }

  protected addItem(): void {
    this.facturaForm.items = [...this.facturaForm.items, this.createItemForm()];
  }

  protected removeItem(index: number): void {
    if (this.facturaForm.items.length <= 1) {
      return;
    }
    this.facturaForm.items = this.facturaForm.items.filter((_, rowIndex) => rowIndex !== index);
  }

  protected onProductoChange(index: number): void {
    const item = this.facturaForm.items[index];
    if (!item || !item.productoId) {
      return;
    }

    const producto = this.productos().find((row) => row.id === item.productoId);
    if (!producto) {
      return;
    }

    item.almacenId = producto.almacenId;
    item.descripcion = producto.nombre;
    item.precioUnitario = Number(producto.precio);

    if (this.facturaForm.escenarioSunat === 'GRATUITA') {
      const referencial = Number(item.cantidad || 0) * Number(item.precioUnitario || 0);
      item.mtoValorGratuito = referencial;
      item.descuento = referencial;
    }
  }

  protected stockDisponible(item: FacturaItemForm): number {
    if (!item.productoId) {
      return 0;
    }
    const producto = this.productos().find((row) => row.id === item.productoId);
    return producto ? Number(producto.stockCantidad) : 0;
  }

  protected stockSeverity(item: FacturaItemForm): TagSeverity {
    const available = this.stockDisponible(item);
    const required = Number(item.cantidad || 0);
    if (available <= 0) {
      return 'danger';
    }
    if (required > available) {
      return 'warn';
    }
    return 'success';
  }

  protected subtotalItem(item: FacturaItemForm): number {
    const gross = Number(item.cantidad || 0) * Number(item.precioUnitario || 0);
    return Math.max(gross - Number(item.descuento || 0), 0);
  }

  protected submitFactura(): void {
    if (this.saving()) {
      return;
    }

    const validationError = this.validateFactura();
    if (validationError) {
      this.errorMessage.set(validationError);
      return;
    }

    this.errorMessage.set(null);
    this.infoMessage.set(null);
    this.saving.set(true);
    const clientOperationId = this.pendingFacturaOperationId ?? createClientOperationId('sale');
    this.pendingFacturaOperationId = clientOperationId;
    let settled = false;
    let watchdog: ReturnType<typeof setTimeout> | null = null;

    const total = this.totalFactura();
    const request = {
      tipoComprobante: this.facturaForm.tipoComprobante,
      total,
      clienteId: this.facturaForm.clienteId,
      clienteTipoDocumento: this.facturaForm.clienteTipoDoc,
      clienteNumeroDocumento: this.facturaForm.clienteNumeroDoc.trim() || null,
      clienteNombre: this.facturaForm.clienteNombre.trim() || null,
      fechaEmision: this.facturaForm.fechaEmision ? `${this.facturaForm.fechaEmision}:00` : null,
      moneda: this.facturaForm.moneda,
      tipoCambio: Number(this.facturaForm.tipoCambio || 0),
      formaPago: this.facturaForm.formaPago,
      metodoPago:
        this.facturaForm.formaPago === 'CREDITO' ? 'CREDITO' : this.facturaForm.metodoPago,
      cuotas:
        this.facturaForm.formaPago === 'CREDITO' &&
        this.facturaForm.cuotaMonto > 0 &&
        this.facturaForm.cuotaFechaPago
          ? [
              {
                monto: Number(this.facturaForm.cuotaMonto),
                fechaPago: this.facturaForm.cuotaFechaPago,
                moneda: this.facturaForm.moneda,
              },
            ]
          : null,
      descripcion: this.facturaForm.observacion.trim() || null,
      clientOperationId,
      items: this.facturaForm.items.map((item) => ({
        productoId: item.productoId as number,
        almacenId: item.almacenId,
        cantidad: Number(item.cantidad),
        precioUnitario: Number(item.precioUnitario),
        descuento: Number(item.descuento || 0),
        descripcion: item.descripcion.trim() || null,
      })),
    } as const;

    const requestSubscription = this.api
      .registrarVentaCaja(this.facturaForm.cajaId as number, request)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (response) => {
          this.pendingFacturaOperationId = null;
          settled = true;
          if (watchdog !== null) {
            clearTimeout(watchdog);
          }
          this.handleVentaCreated(response);
        },
        error: (error: unknown) => {
          settled = true;
          if (watchdog !== null) {
            clearTimeout(watchdog);
          }
          this.errorMessage.set(this.resolveError(error));
        },
      });

    watchdog = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      requestSubscription.unsubscribe();
      this.saving.set(false);
      this.errorMessage.set(
        this.isTicketForm()
          ? 'La venta esta tardando demasiado. Verifica la caja, el stock y vuelve a intentar en unos segundos.'
          : 'La venta esta tardando demasiado. Su facturacion continuara en segundo plano; recarga la lista para consultar el estado.',
      );
    }, SalesAdminPage.REQUEST_TIMEOUT_MS);
  }

  protected officialDocumentNumber(venta: VentaRecord): string {
    const candidate = (venta.facturadorTicket || '').trim().toUpperCase();
    if (/^[A-Z0-9]{1,8}-[A-Z0-9]{1,16}$/.test(candidate)) {
      return candidate;
    }
    return venta.externalId;
  }

  protected internalTicketNumber(venta: VentaRecord): string {
    return `#${String(venta.id).padStart(6, '0')}`;
  }

  protected clientInitials(venta: VentaRecord): string {
    const parts = (venta.clienteNombre || 'Cliente')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);
    return parts.map((part) => part.charAt(0).toUpperCase()).join('') || 'CL';
  }

  protected paymentLabel(venta: VentaRecord): string {
    const method = (venta.metodoPago || venta.formaPago || 'No indicado').trim();
    return method
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  protected paymentIcon(venta: VentaRecord): string {
    const method = (venta.metodoPago || '').toUpperCase();
    if (method === 'EFECTIVO') return 'pi pi-money-bill';
    if (method === 'TARJETA') return 'pi pi-credit-card';
    if (method === 'TRANSFERENCIA') return 'pi pi-building-columns';
    if (method === 'YAPE' || method === 'PLIN') return 'pi pi-mobile';
    return 'pi pi-wallet';
  }

  protected currencySymbol(venta: VentaRecord): string {
    const currency = (venta.moneda || 'PEN').trim().toUpperCase();
    if (currency === 'PEN') return 'S/';
    if (currency === 'USD') return '$';
    if (currency === 'EUR') return 'EUR';
    return currency;
  }

  protected relativeSaleDate(venta: VentaRecord): string {
    const timestamp = new Date(venta.fechaVenta).getTime();
    if (!Number.isFinite(timestamp)) return '';
    const elapsedMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
    if (elapsedMinutes < 1) return 'Ahora';
    if (elapsedMinutes < 60) return `Hace ${elapsedMinutes} min`;
    const hours = Math.floor(elapsedMinutes / 60);
    if (hours < 24) return `Hace ${hours} h`;
    const days = Math.floor(hours / 24);
    return days === 1 ? 'Ayer' : `Hace ${days} dias`;
  }

  protected statusDisplayLabel(venta: VentaRecord): string {
    const status = this.rowEstadoLabel(venta).toUpperCase();
    if (status === 'ACEPTADO') return 'Aceptado';
    if (status === 'RECHAZADO') return 'Rechazado';
    if (status === 'ERROR') return 'Error';
    if (status === 'PENDIENTE' || status === 'PROCESANDO') return 'En cola';
    if (status === 'NO REQUIERE') return 'Registrado';
    return status.charAt(0) + status.slice(1).toLowerCase();
  }

  protected statusDetailLabel(venta: VentaRecord): string {
    const status = this.rowEstadoLabel(venta).toUpperCase();
    if (status === 'ACEPTADO') return this.isTicketDocument(venta) ? 'Facturador' : 'SUNAT';
    if (status === 'RECHAZADO' || status === 'ERROR')
      return this.isTicketDocument(venta) ? 'Error facturador' : 'Error SUNAT';
    if (status === 'PENDIENTE' || status === 'PROCESANDO') return 'Por enviar';
    return this.isLegacyInternalTicket(venta) ? 'Registro legado' : 'Facturador';
  }

  protected statusClass(venta: VentaRecord): string {
    const status = this.rowEstadoLabel(venta).toUpperCase();
    if (status === 'ACEPTADO' || status === 'NO REQUIERE') return 'is-success';
    if (status === 'RECHAZADO' || status === 'ERROR') return 'is-danger';
    if (status === 'PENDIENTE' || status === 'PROCESANDO') return 'is-warning';
    return 'is-neutral';
  }

  protected documentClass(venta: VentaRecord): string {
    const type = this.documentTypeLabel(venta).toLowerCase();
    if (type.includes('factura')) return 'is-invoice';
    if (type.includes('boleta')) return 'is-receipt';
    return 'is-ticket';
  }

  protected isVentaSelected(venta: VentaRecord): boolean {
    return this.selectedVentaIds().has(venta.id);
  }

  protected toggleVentaSelection(venta: VentaRecord, checked: boolean): void {
    const next = new Set(this.selectedVentaIds());
    if (checked) next.add(venta.id);
    else next.delete(venta.id);
    this.selectedVentaIds.set(next);
  }

  protected arePageVentasSelected(): boolean {
    const rows = this.filteredVentas();
    return rows.length > 0 && rows.every((venta) => this.selectedVentaIds().has(venta.id));
  }

  protected togglePageSelection(checked: boolean): void {
    const next = new Set(this.selectedVentaIds());
    for (const venta of this.filteredVentas()) {
      if (checked) next.add(venta.id);
      else next.delete(venta.id);
    }
    this.selectedVentaIds.set(next);
  }

  protected rowEstadoLabel(venta: VentaRecord): string {
    const backend = (venta.facturacionEstado || '').trim().toUpperCase();
    if (backend) {
      return backend === 'NO_REQUIERE' ? 'NO REQUIERE' : backend;
    }
    return this.resolveSunatEstado(venta) || 'Registrada';
  }

  protected rowFacturadorLabel(venta: VentaRecord): string {
    if (this.isLegacyInternalTicket(venta)) {
      return 'Ticket legado sin PDF';
    }
    if (venta.facturadorHttpStatus || venta.facturadorMensaje) {
      const status = venta.facturadorHttpStatus ?? 0;
      const message = (venta.facturadorMensaje || 'Sin mensaje').trim();
      return `${status} - ${message}`;
    }

    const trace = this.traceByExternalId()[venta.externalId];
    if (!trace) {
      return 'Sin traza';
    }
    return `${trace.statusCode} - ${trace.message}`;
  }

  protected hasTrace(venta: VentaRecord): boolean {
    if (this.isLegacyInternalTicket(venta)) {
      return false;
    }
    return Boolean(this.traceByExternalId()[venta.externalId] || venta.facturadorRespuestaJson);
  }

  protected canDownloadAsset(venta: VentaRecord, asset: ArchivoComprobante): boolean {
    if (this.isLegacyInternalTicket(venta)) {
      return false;
    }
    const accepted = (venta.facturacionEstado || '').trim().toUpperCase() === 'ACEPTADO';
    if (asset === 'pdf') return accepted;
    if (this.isTicketDocument(venta)) {
      return false;
    }
    if (accepted) return true;
    if (asset === 'xml' && !!venta.facturadorXmlUrl) return true;
    if (asset === 'cdr' && !!venta.facturadorCdrUrl) return true;

    const trace = this.traceByExternalId()[venta.externalId];
    if (!trace) {
      return false;
    }

    if (asset === 'xml') {
      return Boolean(trace.xmlUrl);
    }
    return Boolean(trace.cdrUrl);
  }

  protected openVentaDetalle(venta: VentaRecord): void {
    this.selectedVenta.set(venta);
    this.activeTrace.set(
      this.traceByExternalId()[venta.externalId] || this.traceFromVentaBackend(venta),
    );
    this.detalleDialogVisible.set(true);
  }

  protected openTraceForVenta(venta: VentaRecord): void {
    const trace = this.traceByExternalId()[venta.externalId] || this.traceFromVentaBackend(venta);
    if (!trace) {
      this.infoMessage.set(`No hay traza de facturador guardada para ${venta.externalId}.`);
      return;
    }

    this.selectedVenta.set(venta);
    this.activeTrace.set(trace);
    this.traceDialogVisible.set(true);
  }

  protected openLatestTrace(): void {
    const lastVenta = this.filteredVentas()[0];
    if (!lastVenta) {
      this.infoMessage.set('No hay ventas registradas para mostrar la ultima traza.');
      return;
    }

    this.openTraceForVenta(lastVenta);
  }

  protected quickDownloadPdf(venta: VentaRecord, formato: FormatoImpresionComprobante): void {
    if (this.isLegacyInternalTicket(venta) || this.quickPdfVentaId() !== null) {
      return;
    }

    this.quickPdfVentaId.set(venta.id);
    this.quickPdfFormat.set(formato);
    this.errorMessage.set(null);
    this.infoMessage.set(`Preparando PDF de ${venta.externalId}...`);

    this.api
      .downloadVentaPdf(venta.id, formato)
      .pipe(
        timeout(SalesAdminPage.PDF_REQUEST_TIMEOUT_MS),
        finalize(() => {
          this.quickPdfVentaId.set(null);
          this.quickPdfFormat.set(null);
        }),
      )
      .subscribe({
        next: (blob) => {
          const objectUrl = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = objectUrl;
          anchor.download = this.pdfFilename(venta, formato);
          anchor.style.display = 'none';
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
          this.infoMessage.set(`Descarga del PDF ${venta.externalId} iniciada.`);
        },
        error: (error) => {
          this.errorMessage.set(
            this.resolveError(error, `No se pudo preparar el PDF de ${venta.externalId}.`),
          );
        },
      });
  }

  protected previewPdf(venta: VentaRecord): void {
    if (this.isLegacyInternalTicket(venta) || this.quickPdfVentaId() !== null) {
      return;
    }

    const previewWindow = window.open('', '_blank');
    if (!previewWindow) {
      this.errorMessage.set(
        'El navegador bloqueo la vista previa. Habilita las ventanas emergentes para Azurion.',
      );
      return;
    }
    previewWindow.opener = null;
    previewWindow.document.title = 'Preparando comprobante';
    previewWindow.document.body.textContent = 'Preparando PDF...';

    this.quickPdfVentaId.set(venta.id);
    this.quickPdfFormat.set('A4');
    this.api
      .downloadVentaPdf(venta.id, 'A4')
      .pipe(
        timeout(SalesAdminPage.PDF_REQUEST_TIMEOUT_MS),
        finalize(() => {
          this.quickPdfVentaId.set(null);
          this.quickPdfFormat.set(null);
        }),
      )
      .subscribe({
        next: (blob) => {
          const objectUrl = URL.createObjectURL(blob);
          previewWindow.location.replace(objectUrl);
          window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
        },
        error: (error) => {
          previewWindow.close();
          this.errorMessage.set(
            this.resolveError(error, 'No se pudo abrir la vista previa del PDF.'),
          );
        },
      });
  }

  protected downloadArtifact(venta: VentaRecord, asset: Exclude<ArchivoComprobante, 'pdf'>): void {
    const key = `${venta.id}:${asset}`;
    if (this.downloadingArtifact() !== null) return;
    this.downloadingArtifact.set(key);
    this.errorMessage.set(null);

    const request =
      asset === 'xml' ? this.api.downloadVentaXml(venta.id) : this.api.downloadVentaCdr(venta.id);
    request
      .pipe(
        timeout(SalesAdminPage.PDF_REQUEST_TIMEOUT_MS),
        finalize(() => this.downloadingArtifact.set(null)),
      )
      .subscribe({
        next: (blob) => {
          const objectUrl = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = objectUrl;
          anchor.download = this.artifactFilename(venta, asset);
          anchor.style.display = 'none';
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
          this.infoMessage.set(
            `${asset.toUpperCase()} de ${this.officialDocumentNumber(venta)} descargado.`,
          );
        },
        error: (error) => {
          this.errorMessage.set(
            this.resolveError(error, `No se pudo descargar el ${asset.toUpperCase()}.`),
          );
        },
      });
  }

  protected retryVentaDocument(venta: VentaRecord): void {
    if (this.retryingVentaId() !== null) return;
    this.retryingVentaId.set(venta.id);
    this.errorMessage.set(null);
    this.api
      .retryVentaDocument(venta.id)
      .pipe(finalize(() => this.retryingVentaId.set(null)))
      .subscribe({
        next: (updated) => {
          this.ventas.update((rows) => rows.map((row) => (row.id === updated.id ? updated : row)));
          this.infoMessage.set(
            `Reintento programado para ${this.officialDocumentNumber(updated)}.`,
          );
        },
        error: (error) => {
          this.errorMessage.set(this.resolveError(error, 'No se pudo reintentar la emision.'));
        },
      });
  }

  protected canRetryDocument(venta: VentaRecord): boolean {
    const status = this.rowEstadoLabel(venta).toUpperCase();
    return !this.isLegacyInternalTicket(venta) && (status === 'ERROR' || status === 'RECHAZADO');
  }

  private artifactFilename(venta: VentaRecord, asset: 'xml' | 'cdr'): string {
    const number = this.officialDocumentNumber(venta).replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${asset === 'cdr' ? 'R-' : ''}${number}.${asset === 'cdr' ? 'zip' : 'xml'}`;
  }

  private pdfFilename(venta: VentaRecord, formato: FormatoImpresionComprobante): string {
    const safeExternalId = (venta.externalId || `venta-${venta.id}`).replace(
      /[^a-zA-Z0-9._-]/g,
      '_',
    );
    return `Comprobante-${safeExternalId}-${formato === 'A4' ? 'A4' : '80mm'}.pdf`;
  }

  protected openActiveTraceAsset(asset: ArchivoComprobante): void {
    const trace = this.activeTrace();
    if (!trace) {
      return;
    }

    const url = asset === 'pdf' ? trace.pdfUrl : asset === 'xml' ? trace.xmlUrl : trace.cdrUrl;
    if (!url) {
      this.infoMessage.set(`El ${asset.toUpperCase()} aun no esta disponible.`);
      return;
    }

    window.open(this.decorateFacturadorAssetUrl(url), '_blank', 'noopener,noreferrer');
  }

  protected copyComprobante(venta: VentaRecord): void {
    const value = this.officialDocumentNumber(venta);
    if (!navigator.clipboard?.writeText) {
      this.infoMessage.set(`Comprobante: ${value}`);
      return;
    }

    void navigator.clipboard.writeText(value).then(() => {
      this.infoMessage.set(`Comprobante ${value} copiado.`);
    });
  }

  protected tracePrettyJson(): string {
    const trace = this.activeTrace();
    if (!trace) {
      return '{}';
    }
    return JSON.stringify(trace.raw ?? {}, null, 2);
  }

  private handleVentaCreated(response: RegistrarVentaCajaResponse): void {
    this.facturaDialogVisible.set(false);
    this.lowStockAlerts.refresh(true);
    if ((response.venta.facturacionEstado || '').toUpperCase() === 'NO_REQUIERE') {
      this.selectedVenta.set(response.venta);
      this.detalleDialogVisible.set(true);
      this.infoMessage.set(
        `Ticket legado ${response.venta.externalId} registrado sin documento del Facturador.`,
      );
      this.loadData();
      return;
    }

    const trace = this.mapFacturadorTrace(response.venta.externalId, response.facturacion);
    this.upsertTrace(trace);

    this.activeTrace.set(trace);
    this.selectedVenta.set(response.venta);
    this.traceDialogVisible.set(true);

    this.infoMessage.set(
      `Venta ${response.venta.externalId} registrada. Estado inicial: PENDIENTE.`,
    );
    this.loadData();
  }

  private mapFacturadorTrace(externalId: string, facturacion: FacturadorVentaResponse): VentaTrace {
    const sunatEstadoRaw = this.deepFind(facturacion.data, [
      'estado',
      'sunat_estado',
      'estado_sunat',
      'status',
    ]);
    const sunatEstado =
      typeof sunatEstadoRaw === 'string' ? sunatEstadoRaw.trim().toUpperCase() : null;

    const documentoIdRaw = this.deepFind(facturacion.data, [
      'documento_id',
      'id_documento',
      'documentId',
    ]);
    const documentoId =
      documentoIdRaw !== null && documentoIdRaw !== undefined ? String(documentoIdRaw) : null;

    const ticketRaw = this.deepFind(facturacion.data, ['ticket', 'ticket_sunat']);
    const ticketSunat = typeof ticketRaw === 'string' && ticketRaw.trim() ? ticketRaw.trim() : null;

    const pdfUrl = this.readUrl(facturacion.data, ['pdf_url', 'url_pdf', 'pdf']);
    const xmlUrl = this.readUrl(facturacion.data, ['xml_url', 'url_xml', 'xml']);
    const cdrUrl = this.readUrl(facturacion.data, ['cdr_url', 'url_cdr', 'cdr']);

    return {
      externalId,
      endpoint: facturacion.endpoint || '',
      tipoComprobante: facturacion.tipoComprobante || '',
      statusCode: Number(facturacion.status || 0),
      message: (facturacion.message || '').trim() || 'Respuesta recibida',
      sunatEstado,
      documentoId,
      ticketSunat,
      pdfUrl,
      xmlUrl,
      cdrUrl,
      raw: facturacion.data,
      recordedAt: new Date().toISOString(),
    };
  }

  private resolveSunatEstado(venta: VentaRecord): string | null {
    const backend = (venta.facturadorSunatEstado || '').trim().toUpperCase();
    if (backend) {
      return backend;
    }
    return this.traceByExternalId()[venta.externalId]?.sunatEstado || null;
  }

  private traceFromVentaBackend(venta: VentaRecord): VentaTrace | null {
    const statusCode = Number(venta.facturadorHttpStatus || 0);
    const message = (venta.facturadorMensaje || '').trim();
    const endpoint = (venta.facturadorEndpoint || '').trim();
    const tipoComprobante = (venta.facturadorTipoComprobante || '').trim();

    if (!statusCode && !message && !endpoint && !tipoComprobante) {
      return null;
    }

    return {
      externalId: venta.externalId,
      endpoint,
      tipoComprobante,
      statusCode,
      message: message || 'Sin mensaje',
      sunatEstado: (venta.facturadorSunatEstado || '').trim().toUpperCase() || null,
      documentoId: (venta.facturadorDocumentoId || '').trim() || null,
      ticketSunat: (venta.facturadorTicket || '').trim() || null,
      pdfUrl: (venta.facturadorPdfUrl || '').trim() || null,
      xmlUrl: (venta.facturadorXmlUrl || '').trim() || null,
      cdrUrl: (venta.facturadorCdrUrl || '').trim() || null,
      raw: this.parseBackendRawJson(venta.facturadorRespuestaJson),
      recordedAt: venta.facturacionActualizadoEn || new Date().toISOString(),
    };
  }

  private traceFromStatusStreamEvent(event: VentaStatusStreamEvent): VentaTrace | null {
    const statusCode = Number(event.facturadorHttpStatus || 0);
    const message = (event.facturadorMensaje || '').trim();
    const endpoint = (event.facturadorEndpoint || '').trim();
    const tipoComprobante = (event.facturadorTipoComprobante || '').trim();

    if (!statusCode && !message && !endpoint && !tipoComprobante) {
      return null;
    }

    return {
      externalId: event.externalId,
      endpoint,
      tipoComprobante,
      statusCode,
      message: message || 'Estado actualizado',
      sunatEstado: (event.facturadorSunatEstado || '').trim().toUpperCase() || null,
      documentoId: (event.facturadorDocumentoId || '').trim() || null,
      ticketSunat: (event.facturadorTicket || '').trim() || null,
      pdfUrl: (event.facturadorPdfUrl || '').trim() || null,
      xmlUrl: (event.facturadorXmlUrl || '').trim() || null,
      cdrUrl: (event.facturadorCdrUrl || '').trim() || null,
      raw: null,
      recordedAt: event.facturacionActualizadoEn || new Date().toISOString(),
    };
  }

  private parseBackendRawJson(raw: string | null | undefined): unknown {
    if (!raw || !raw.trim()) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return { raw };
    }
  }

  private upsertTrace(trace: VentaTrace): void {
    const current = this.traceByExternalId();
    const next: VentaTraceMap = {
      ...current,
      [trace.externalId]: trace,
    };

    const orderedKeys = Object.keys(next).sort((a, b) => {
      return new Date(next[b].recordedAt).getTime() - new Date(next[a].recordedAt).getTime();
    });

    const pruned: VentaTraceMap = {};
    for (const key of orderedKeys.slice(0, 250)) {
      pruned[key] = next[key];
    }

    this.traceByExternalId.set(pruned);
    this.persistTraceCache(pruned);
  }

  private persistTraceCache(map: VentaTraceMap): void {
    try {
      localStorage.setItem(this.traceCacheKey(), JSON.stringify(map));
    } catch {
      // ignore local cache issues
    }
  }

  private readTraceCache(): VentaTraceMap {
    try {
      const raw = localStorage.getItem(this.traceCacheKey());
      if (!raw) {
        return {};
      }
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object') {
        return {};
      }
      return parsed as VentaTraceMap;
    } catch {
      return {};
    }
  }

  private traceCacheKey(): string {
    const tenantId = this.session.currentSession()?.tenantId || 'public';
    return `${SalesAdminPage.TRACE_CACHE_PREFIX}.${tenantId}`;
  }

  private deepFind(source: unknown, keys: string[]): unknown {
    if (source === null || source === undefined) {
      return null;
    }

    if (typeof source !== 'object') {
      return null;
    }

    const record = source as Record<string, unknown>;
    for (const key of keys) {
      if (record[key] !== undefined && record[key] !== null && record[key] !== '') {
        return record[key];
      }
    }

    for (const value of Object.values(record)) {
      if (value && typeof value === 'object') {
        const nested = this.deepFind(value, keys);
        if (nested !== null && nested !== undefined && nested !== '') {
          return nested;
        }
      }
    }

    return null;
  }

  private readUrl(source: unknown, keys: string[]): string | null {
    const value = this.deepFind(source, keys);
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    if (!/^https?:\/\//i.test(trimmed)) {
      return null;
    }
    return trimmed;
  }

  private decorateFacturadorAssetUrl(rawUrl: string): string {
    const url = (rawUrl || '').trim();
    if (!url) {
      return url;
    }

    const tenantRuc = (this.session.currentSession()?.empresa?.ruc || '').trim();
    if (!tenantRuc) {
      return url;
    }

    try {
      const parsed = new URL(url);
      if (!parsed.searchParams.get('tenant_ruc')) {
        parsed.searchParams.set('tenant_ruc', tenantRuc);
      }
      return parsed.toString();
    } catch {
      return url;
    }
  }

  private validateFactura(): string | null {
    if (!this.facturaForm.cajaId) {
      return 'Selecciona una caja abierta para emitir la venta.';
    }

    if (!this.hasCajasAbiertas()) {
      return 'No hay caja abierta para emitir ventas. Abre una caja primero.';
    }

    if (this.facturaForm.tipoComprobante === 'FACTURA') {
      const fechaError = this.validateFacturaIssueDateRange();
      if (fechaError) {
        return fechaError;
      }
    }

    const itemsError = this.validateItems();
    if (itemsError) {
      return itemsError;
    }

    const total = this.totalFactura();
    if (this.facturaForm.escenarioSunat !== 'GRATUITA' && total <= 0) {
      return 'El total de la venta debe ser mayor a cero.';
    }
    if (this.facturaForm.escenarioSunat === 'GRATUITA' && total < 0) {
      return 'La factura gratuita no puede tener total negativo.';
    }

    const clienteError = this.validateCliente(total);
    if (clienteError) {
      return clienteError;
    }

    if (this.facturaForm.formaPago === 'CREDITO') {
      if (Number(this.facturaForm.cuotaMonto) <= 0 || !this.facturaForm.cuotaFechaPago) {
        return 'Forma de pago credito requiere monto y fecha de cuota.';
      }
    }

    if (this.facturaForm.aplicaPercepcion) {
      if (
        !this.facturaForm.percepcionCodigoRegimen.trim() ||
        Number(this.facturaForm.percepcionPorcentaje) <= 0
      ) {
        return 'Percepcion requiere codigo de regimen y porcentaje.';
      }
    }

    if (this.facturaForm.aplicaAnticipo) {
      if (!this.facturaForm.anticipoNumero.trim() || Number(this.facturaForm.anticipoTotal) <= 0) {
        return 'Anticipos requiere documento y monto mayor a cero.';
      }
    }

    if (this.facturaForm.aplicaDetraccion) {
      if (
        !this.facturaForm.detraccionCodigoBien.trim() ||
        !this.facturaForm.detraccionCodigoMedioPago.trim() ||
        Number(this.facturaForm.detraccionPorcentaje) <= 0
      ) {
        return 'Detraccion requiere codigo bien, medio de pago y porcentaje.';
      }
    }

    return null;
  }

  private validateItems(): string | null {
    if (!this.facturaForm.items.length) {
      return 'Debes agregar al menos un item.';
    }

    for (const item of this.facturaForm.items) {
      if (!item.productoId) {
        return 'Selecciona un producto en todos los items.';
      }
      if (!item.almacenId) {
        return 'Cada item debe quedar asociado a un almacen.';
      }
      if (!item.afectacionIgv) {
        return 'Selecciona el tipo de afectacion IGV de cada item.';
      }
      if (Number(item.cantidad) <= 0) {
        return 'La cantidad debe ser mayor a cero en todos los items.';
      }
      if (Number(item.precioUnitario) <= 0) {
        return 'El precio unitario debe ser mayor a cero en todos los items.';
      }

      if (
        this.facturaForm.escenarioSunat === 'GRATUITA' &&
        Number(item.mtoValorGratuito || 0) <= 0
      ) {
        return 'Factura gratuita requiere valor gratuito por item.';
      }

      const availableStock = this.stockDisponible(item);
      if (availableStock < Number(item.cantidad)) {
        return 'La cantidad solicitada supera el stock disponible de uno o mas productos.';
      }
    }

    return null;
  }

  private validateCliente(total: number): string | null {
    const numeroDoc = this.facturaForm.clienteNumeroDoc.trim();
    const nombre = this.facturaForm.clienteNombre.trim();

    if (this.facturaForm.tipoComprobante === 'FACTURA') {
      if (!/^[0-9]{11}$/.test(numeroDoc) || !nombre) {
        return 'Factura requiere RUC de 11 digitos y razon social.';
      }
      return null;
    }

    if (this.facturaForm.tipoComprobante === 'BOLETA' && total > 500) {
      if (!isIdentifiedCustomer(this.facturaForm.clienteTipoDoc, numeroDoc, nombre)) {
        return 'Boleta mayor a S/ 500 requiere un cliente identificado con DNI o RUC.';
      }
      return null;
    }

    if (this.facturaForm.tipoComprobante === 'BOLETA' && numeroDoc) {
      if (this.facturaForm.clienteTipoDoc === '1' && !/^[0-9]{8}$/.test(numeroDoc)) {
        return 'Si usas DNI, el documento debe tener 8 digitos.';
      }
      if (this.facturaForm.clienteTipoDoc === '6' && !/^[0-9]{11}$/.test(numeroDoc)) {
        return 'Si usas RUC, el documento debe tener 11 digitos.';
      }
    }

    return null;
  }

  private validateFacturaIssueDateRange(): string | null {
    if (!this.facturaForm.fechaEmision) {
      return 'La fecha de emision es obligatoria para factura.';
    }

    const parsed = new Date(this.facturaForm.fechaEmision);
    if (Number.isNaN(parsed.getTime())) {
      return 'La fecha de emision no tiene formato valido.';
    }

    const today = new Date();
    const maxDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const minDate = new Date(maxDate);
    minDate.setDate(maxDate.getDate() - 2);
    const issueDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());

    if (issueDate < minDate || issueDate > maxDate) {
      const min = `${minDate.getFullYear()}-${String(minDate.getMonth() + 1).padStart(2, '0')}-${String(minDate.getDate()).padStart(2, '0')}`;
      const max = `${maxDate.getFullYear()}-${String(maxDate.getMonth() + 1).padStart(2, '0')}-${String(maxDate.getDate()).padStart(2, '0')}`;
      return `La fecha de factura debe estar entre ${min} y ${max}.`;
    }

    return null;
  }

  private normalizeClienteDocumento(): void {
    const maxLength = this.clienteDocMaxLength();
    if (maxLength <= 0) {
      this.facturaForm.clienteNumeroDoc = '';
      return;
    }

    this.facturaForm.clienteNumeroDoc = this.facturaForm.clienteNumeroDoc
      .replace(/\D+/g, '')
      .slice(0, maxLength);
  }

  private createFacturaForm(): NuevaFacturaForm {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    const dueIso = dueDate.toISOString().slice(0, 10);

    return {
      cajaId: null,
      clienteId: null,
      tipoComprobante: 'TICKET_VENTA',
      escenarioSunat: 'NORMAL',
      fechaEmision: this.formatNow(),
      moneda: 'PEN',
      tipoCambio: 3.8,
      formaPago: 'CONTADO',
      metodoPago: 'EFECTIVO',
      tipoOperacionSunat: '0101',
      contingencia: false,
      cuotaMonto: 0,
      cuotaFechaPago: dueIso,
      aplicaPercepcion: false,
      percepcionCodigoRegimen: '01',
      percepcionPorcentaje: 2,
      aplicaAnticipo: false,
      anticipoTipoDocRel: '02',
      anticipoNumero: '',
      anticipoTotal: 0,
      aplicaDetraccion: false,
      detraccionCodigoBien: '021',
      detraccionCodigoMedioPago: '001',
      detraccionCuentaBanco: '',
      detraccionPorcentaje: 10,
      detraccionMonto: 0,
      detraccionValorReferencial: 0,
      observacion: '',
      clienteTipoDoc: '0',
      clienteNumeroDoc: '',
      clienteNombre: '',
      clienteDireccion: '',
      clienteEmail: '',
      clienteTelefono: '',
      items: [this.createItemForm()],
    };
  }

  private createItemForm(): FacturaItemForm {
    return {
      tipoItem: 'PRODUCTO',
      productoId: null,
      cantidad: 1,
      descuento: 0,
      precioUnitario: 0,
      moneda: 'PEN',
      afectacionIgv: '10',
      descripcion: '',
      almacenId: null,
      codigoSunat: '',
      unidad: 'NIU',
      porcentajeIgv: 18,
      mtoValorGratuito: 0,
      icbper: 0,
      factorIcbper: 0.5,
      isc: 0,
      porcentajeIsc: 0,
      tipSisIsc: '01',
      otroTributo: 0,
      porcentajeOtroTributo: 0,
    };
  }

  private buildLeyendas(): Array<{ codigo: string; valor: string }> | null {
    const scenario = this.facturaForm.escenarioSunat;
    if (scenario === 'GRATUITA') {
      return [
        {
          codigo: '1002',
          valor: 'TRANSFERENCIA GRATUITA DE UN BIEN Y/O SERVICIO PRESTADO GRATUITAMENTE',
        },
      ];
    }
    if (scenario === 'PERCEPCION') {
      return [{ codigo: '2000', valor: 'COMPROBANTE DE PERCEPCION' }];
    }
    if (scenario === 'DETRACCION') {
      return [{ codigo: '2006', valor: 'OPERACION SUJETA A DETRACCION' }];
    }
    if (scenario === 'CONTINGENCIA') {
      return [{ codigo: '3000', valor: 'EMISION POR CONTINGENCIA' }];
    }
    return null;
  }

  private formatNow(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private actorId(): string {
    const current = this.session.currentSession();
    return current?.userId ? String(current.userId) : current?.username || 'system';
  }

  private actorName(): string {
    const current = this.session.currentSession();
    return current?.nombres?.trim() || current?.username || 'Usuario';
  }

  private formatAmount(venta: VentaRecord): string {
    return `${venta.moneda} ${venta.total}`;
  }

  private match(value: string | null | undefined, query: string): boolean {
    return (value || '').toLowerCase().includes(query);
  }

  private resolveError(
    error: unknown,
    fallback = 'No se pudo completar la operacion de ventas.',
  ): string {
    if (typeof error === 'object' && error !== null) {
      const httpError = error as { status?: number; error?: { message?: string } };
      if (httpError.status === 400) {
        return httpError.error?.message || 'La solicitud no pudo procesarse.';
      }
      if (httpError.status === 403) {
        return 'No tienes permiso para registrar o consultar ventas.';
      }
      if (httpError.status === 422) {
        return httpError.error?.message || 'Revisa los datos ingresados.';
      }
      if (httpError.status === 0) {
        return 'No se pudo conectar con el servidor. Intenta nuevamente.';
      }
      if ((httpError as { name?: string }).name === 'TimeoutError') {
        return 'La consulta de ventas demoro demasiado. Intenta recargar.';
      }
      return httpError.error?.message || fallback;
    }
    return fallback;
  }
}
