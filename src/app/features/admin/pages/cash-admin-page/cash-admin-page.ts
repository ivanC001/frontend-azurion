import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
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
import { LowStockAlertService } from '@core/services/low-stock-alert.service';
import {
  AdminSaasApiService,
  Caja,
  CajaMovimiento,
  Producto,
  Sucursal,
  TipoComprobanteVenta,
} from '../../data/admin-saas-api.service';

interface AbrirCajaForm {
  sucursalId: number | null;
  codigo: string;
  nombre: string;
  saldoCapital: number;
  observacion: string;
}

interface MovimientoCajaForm {
  tipoMovimiento: 'ENTRADA' | 'SALIDA';
  monto: number;
  descripcion: string;
  referencia: string;
}

interface DepositoForm {
  monto: number;
  cuentaEmpresarial: string;
  numeroOperacion: string;
  observacion: string;
}

interface CierreForm {
  saldoSalida: number;
  observacion: string;
}

interface VentaCajaForm {
  total: number;
  tipoComprobante: TipoComprobanteVenta;
  clienteNombre: string;
  clienteNumeroDocumento: string;
  descripcion: string;
  items: VentaProductoForm[];
}

interface VentaProductoForm {
  productoId: number | null;
  almacenId: number | null;
  cantidad: number;
  precioUnitario: number;
  descripcion: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-cash-admin-page',
  imports: [
    NgClass,
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
  templateUrl: './cash-admin-page.html',
  styleUrl: './cash-admin-page.scss',
})
export class CashAdminPage {
  private static readonly REQUEST_TIMEOUT_MS = 18000;

  private readonly api = inject(AdminSaasApiService);
  private readonly session = inject(AuthSessionService);
  private readonly lowStockAlerts = inject(LowStockAlertService);

  protected readonly cajas = signal<Caja[]>([]);
  protected readonly movimientos = signal<CajaMovimiento[]>([]);
  protected readonly sucursales = signal<Sucursal[]>([]);
  protected readonly productos = signal<Producto[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly estadoFilter = signal<string | null>(null);
  protected readonly sucursalFilter = signal<number | null>(null);
  protected readonly selectedCajaId = signal<number | null>(null);

  protected readonly abrirDialogVisible = signal(false);
  protected readonly movimientoDialogVisible = signal(false);
  protected readonly depositoDialogVisible = signal(false);
  protected readonly cierreDialogVisible = signal(false);
  protected readonly ventaDialogVisible = signal(false);

  protected abrirForm: AbrirCajaForm = {
    sucursalId: null,
    codigo: '',
    nombre: '',
    saldoCapital: 0,
    observacion: '',
  };

  protected movimientoForm: MovimientoCajaForm = {
    tipoMovimiento: 'ENTRADA',
    monto: 0,
    descripcion: '',
    referencia: '',
  };

  protected depositoForm: DepositoForm = {
    monto: 0,
    cuentaEmpresarial: '',
    numeroOperacion: '',
    observacion: '',
  };

  protected cierreForm: CierreForm = {
    saldoSalida: 0,
    observacion: '',
  };

  protected ventaForm: VentaCajaForm = {
    total: 0,
    tipoComprobante: 'TICKET_VENTA',
    clienteNombre: '',
    clienteNumeroDocumento: '',
    descripcion: '',
    items: [],
  };

  protected readonly selectedCaja = computed(() => {
    const id = this.selectedCajaId();
    if (!id) {
      return null;
    }
    return this.cajas().find((item) => item.id === id) ?? null;
  });

  protected readonly ventaMovimientos = computed(() =>
    this.movimientos().filter((movimiento) => this.isVentaMovimiento(movimiento)),
  );

  protected readonly totalVentas = computed(() =>
    this.ventaMovimientos().reduce((acc, movimiento) => acc + Number(movimiento.monto || 0), 0),
  );

  protected readonly estadoOptions = computed(() => [
    { label: 'Abierta', value: 'ABIERTA' },
    { label: 'Cerrada', value: 'CERRADA' },
  ]);

  protected readonly sucursalOptions = computed(() =>
    this.sucursales().map((sucursal) => ({
      label: `${sucursal.codigo} - ${sucursal.nombre}`,
      value: sucursal.id,
    })),
  );

  protected readonly comprobanteOptions = [
    { label: 'Ticket interno - venta rapida', value: 'TICKET_VENTA' },
    { label: 'Boleta electronica', value: 'BOLETA' },
    { label: 'Factura electronica', value: 'FACTURA' },
  ];

  protected readonly productoOptions = computed(() =>
    this.productos().map((producto) => ({
      label: `${producto.sku} - ${producto.nombre}`,
      value: producto.id,
    })),
  );

  constructor() {
    this.loadData();
  }

  protected loadData(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    forkJoin({
      cajas: this.api.listCajas(
        this.estadoFilter() ?? undefined,
        this.sucursalFilter() ?? undefined,
      ),
      sucursales: this.api.listSucursales(),
      productos: this.api.listProductos(),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ cajas, sucursales, productos }) => {
          this.cajas.set(cajas);
          this.sucursales.set(sucursales);
          this.productos.set(productos);
          const selectedId = this.selectedCajaId();
          if (!selectedId || !cajas.some((item) => item.id === selectedId)) {
            this.selectedCajaId.set(cajas[0]?.id ?? null);
          }
          this.loadMovimientos();
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected applyFilters(): void {
    this.loadData();
  }

  protected onCajaSelect(cajaId: number): void {
    this.selectedCajaId.set(cajaId);
    this.loadMovimientos();
  }

  protected openAbrirDialog(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.abrirForm = {
      sucursalId: this.sucursales()[0]?.id ?? null,
      codigo: '',
      nombre: '',
      saldoCapital: 0,
      observacion: '',
    };
    this.abrirDialogVisible.set(true);
  }

  protected openMovimientoDialog(): void {
    if (!this.selectedCaja()) {
      this.errorMessage.set('Selecciona una caja para registrar movimientos.');
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.movimientoForm = {
      tipoMovimiento: 'ENTRADA',
      monto: 0,
      descripcion: '',
      referencia: '',
    };
    this.movimientoDialogVisible.set(true);
  }

  protected openDepositoDialog(): void {
    if (!this.selectedCaja()) {
      this.errorMessage.set('Selecciona una caja para registrar deposito.');
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.depositoForm = {
      monto: 0,
      cuentaEmpresarial: '',
      numeroOperacion: '',
      observacion: '',
    };
    this.depositoDialogVisible.set(true);
  }

  protected openCierreDialog(): void {
    const caja = this.selectedCaja();
    if (!caja) {
      this.errorMessage.set('Selecciona una caja para cerrar.');
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.cierreForm = {
      saldoSalida: Number(caja.saldoActual ?? 0),
      observacion: '',
    };
    this.cierreDialogVisible.set(true);
  }

  protected openVentaDialog(): void {
    const caja = this.selectedCaja();
    if (!caja) {
      this.errorMessage.set('Selecciona una caja para registrar una venta.');
      return;
    }

    if (caja.estado.toUpperCase() !== 'ABIERTA') {
      this.errorMessage.set('Solo puedes registrar ventas en cajas abiertas.');
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.ventaForm = {
      total: 0,
      tipoComprobante: 'TICKET_VENTA',
      clienteNombre: '',
      clienteNumeroDocumento: '',
      descripcion: '',
      items: [this.createEmptyVentaItem()],
    };
    this.ventaDialogVisible.set(true);
  }

  protected abrirCaja(): void {
    if (this.saving()) {
      return;
    }

    if (
      !this.abrirForm.sucursalId ||
      !this.abrirForm.codigo.trim() ||
      !this.abrirForm.nombre.trim()
    ) {
      this.errorMessage.set('Completa sucursal, codigo y nombre de caja.');
      return;
    }
    if (Number(this.abrirForm.saldoCapital) < 0) {
      this.errorMessage.set('El saldo capital debe ser mayor o igual a cero.');
      return;
    }

    this.saving.set(true);
    this.api
      .abrirCaja({
        sucursalId: this.abrirForm.sucursalId,
        codigo: this.abrirForm.codigo.trim().toUpperCase(),
        nombre: this.abrirForm.nombre.trim(),
        saldoCapital: Number(this.abrirForm.saldoCapital),
        responsableId: this.actorId(),
        responsableNombre: this.actorName(),
        observacion: this.abrirForm.observacion.trim() || null,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.abrirDialogVisible.set(false);
          this.successMessage.set('Caja abierta correctamente.');
          this.loadData();
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected registrarMovimientoCaja(): void {
    if (this.saving()) {
      return;
    }
    const caja = this.selectedCaja();
    if (!caja) {
      this.errorMessage.set('Selecciona una caja.');
      return;
    }
    if (!this.movimientoForm.descripcion.trim() || Number(this.movimientoForm.monto) <= 0) {
      this.errorMessage.set('Completa tipo, monto y descripcion del movimiento.');
      return;
    }

    this.saving.set(true);
    this.api
      .registrarMovimientoCaja(caja.id, {
        tipoMovimiento: this.movimientoForm.tipoMovimiento,
        monto: Number(this.movimientoForm.monto),
        descripcion: this.movimientoForm.descripcion.trim(),
        referencia: this.movimientoForm.referencia.trim() || null,
        responsableId: this.actorId(),
        responsableNombre: this.actorName(),
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.movimientoDialogVisible.set(false);
          this.successMessage.set('Movimiento de caja registrado.');
          this.loadData();
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected registrarDeposito(): void {
    if (this.saving()) {
      return;
    }
    const caja = this.selectedCaja();
    if (!caja) {
      this.errorMessage.set('Selecciona una caja.');
      return;
    }
    if (!this.depositoForm.cuentaEmpresarial.trim() || Number(this.depositoForm.monto) <= 0) {
      this.errorMessage.set('Completa monto y cuenta empresarial.');
      return;
    }

    this.saving.set(true);
    this.api
      .depositarCuentaEmpresarial(caja.id, {
        monto: Number(this.depositoForm.monto),
        cuentaEmpresarial: this.depositoForm.cuentaEmpresarial.trim(),
        numeroOperacion: this.depositoForm.numeroOperacion.trim() || null,
        responsableId: this.actorId(),
        responsableNombre: this.actorName(),
        observacion: this.depositoForm.observacion.trim() || null,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.depositoDialogVisible.set(false);
          this.successMessage.set('Deposito registrado correctamente.');
          this.loadData();
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected cerrarCaja(): void {
    if (this.saving()) {
      return;
    }
    const caja = this.selectedCaja();
    if (!caja) {
      this.errorMessage.set('Selecciona una caja.');
      return;
    }
    if (Number(this.cierreForm.saldoSalida) < 0) {
      this.errorMessage.set('El saldo de cierre debe ser mayor o igual a cero.');
      return;
    }

    this.saving.set(true);
    this.api
      .cerrarCaja(caja.id, {
        saldoSalida: Number(this.cierreForm.saldoSalida),
        responsableId: this.actorId(),
        responsableNombre: this.actorName(),
        observacion: this.cierreForm.observacion.trim() || null,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.cierreDialogVisible.set(false);
          this.successMessage.set('Caja cerrada correctamente.');
          this.loadData();
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected registrarVentaCaja(): void {
    if (this.saving()) {
      return;
    }
    const caja = this.selectedCaja();
    if (!caja) {
      this.errorMessage.set('Selecciona una caja.');
      return;
    }
    if (caja.estado.toUpperCase() !== 'ABIERTA') {
      this.errorMessage.set('Solo puedes registrar ventas con caja abierta.');
      return;
    }
    if (!this.ventaForm.items.length) {
      this.errorMessage.set('Agrega al menos un producto en la venta.');
      return;
    }

    if (
      this.ventaForm.tipoComprobante === 'FACTURA' &&
      !this.ventaForm.clienteNumeroDocumento.trim().match(/^[0-9]{11}$/)
    ) {
      this.errorMessage.set('Para factura debes ingresar RUC de 11 digitos.');
      return;
    }

    if (this.ventaForm.tipoComprobante === 'FACTURA' && !this.ventaForm.clienteNombre.trim()) {
      this.errorMessage.set('Para factura debes ingresar razon social del cliente.');
      return;
    }

    const invalidItem = this.ventaForm.items.find(
      (item) => !item.productoId || Number(item.cantidad) <= 0 || Number(item.precioUnitario) <= 0,
    );
    if (invalidItem) {
      this.errorMessage.set('Cada item debe tener producto, cantidad y precio unitario validos.');
      return;
    }

    this.recalculateVentaTotal();
    if (Number(this.ventaForm.total) <= 0) {
      this.errorMessage.set('El total de venta debe ser mayor a cero.');
      return;
    }

    this.saving.set(true);
    let settled = false;
    let watchdog: ReturnType<typeof setTimeout> | null = null;

    const requestSubscription = this.api
      .registrarVentaCaja(caja.id, {
        tipoComprobante: this.ventaForm.tipoComprobante,
        total: Number(this.ventaForm.total),
        clienteTipoDocumento: this.resolveClienteTipoDocumento(
          this.ventaForm.tipoComprobante,
          this.ventaForm.clienteNumeroDocumento,
        ),
        clienteNumeroDocumento: this.ventaForm.clienteNumeroDocumento.trim() || null,
        clienteNombre: this.ventaForm.clienteNombre.trim() || null,
        descripcion: this.ventaForm.descripcion.trim() || null,
        moneda: 'PEN',
        items: this.ventaForm.items.map((item) => ({
          productoId: item.productoId as number,
          almacenId: item.almacenId,
          cantidad: Number(item.cantidad),
          precioUnitario: Number(item.precioUnitario),
          descripcion: item.descripcion.trim() || null,
        })),
        responsableId: this.actorId(),
        responsableNombre: this.actorName(),
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (response) => {
          settled = true;
          if (watchdog !== null) {
            clearTimeout(watchdog);
          }
          this.ventaDialogVisible.set(false);
          const message = response.facturacion?.message || 'Venta registrada.';
          this.successMessage.set(message);
          this.lowStockAlerts.refresh(true);
          this.loadData();
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
        this.ventaForm.tipoComprobante === 'TICKET_VENTA'
          ? 'La venta esta tardando demasiado. Verifica la caja, el stock y vuelve a intentar en unos segundos.'
          : 'La venta esta tardando demasiado. Su facturacion continuara en segundo plano; recarga para consultar el estado.',
      );
    }, CashAdminPage.REQUEST_TIMEOUT_MS);
  }

  protected addVentaItem(): void {
    this.ventaForm.items = [...this.ventaForm.items, this.createEmptyVentaItem()];
  }

  protected removeVentaItem(index: number): void {
    if (this.ventaForm.items.length <= 1) {
      return;
    }
    this.ventaForm.items = this.ventaForm.items.filter((_, current) => current !== index);
    this.recalculateVentaTotal();
  }

  protected onVentaProductoChange(index: number): void {
    const item = this.ventaForm.items[index];
    if (!item) {
      return;
    }
    const producto = this.productos().find((candidate) => candidate.id === item.productoId);
    if (!producto) {
      return;
    }

    item.almacenId = producto.almacenId;
    if (!item.descripcion.trim()) {
      item.descripcion = producto.nombre;
    }
    if (!item.precioUnitario || item.precioUnitario <= 0) {
      item.precioUnitario = Number(producto.precio);
    }
    this.recalculateVentaTotal();
  }

  protected onVentaItemChange(): void {
    this.recalculateVentaTotal();
  }

  protected cajaSeverity(estado: string): 'success' | 'danger' | 'warn' {
    const normalized = estado.toUpperCase();
    if (normalized === 'ABIERTA') {
      return 'success';
    }
    if (normalized === 'CERRADA') {
      return 'danger';
    }
    return 'warn';
  }

  protected resultadoMonto(caja: Caja): number | null {
    if (typeof caja.diferenciaCierre === 'number') {
      return Number(caja.diferenciaCierre);
    }
    if (typeof caja.saldoSalida === 'number') {
      return Number(caja.saldoSalida) - Number(caja.saldoCapital || 0);
    }
    return null;
  }

  protected resultadoTexto(caja: Caja): string {
    const result = this.resultadoMonto(caja);
    if (result === null) {
      return 'Pendiente';
    }
    if (Math.abs(result) < 0.00001) {
      return 'OK';
    }
    return `${result > 0 ? '+' : ''}S/ ${Math.abs(result).toFixed(2)}`;
  }

  protected resultadoClase(caja: Caja): string {
    const result = this.resultadoMonto(caja);
    if (result === null) {
      return 'result-pending';
    }
    if (Math.abs(result) < 0.00001) {
      return 'result-ok';
    }
    return result > 0 ? 'result-positive' : 'result-negative';
  }

  protected historialRowClass(caja: Caja): string {
    const result = this.resultadoMonto(caja);
    if (result === null) {
      return 'row-neutral';
    }
    if (Math.abs(result) < 0.00001) {
      return 'row-neutral';
    }
    return result > 0 ? 'row-positive' : 'row-negative';
  }

  protected cajaUsuario(caja: Caja): string {
    return caja.responsableAperturaNombre || 'Usuario';
  }

  private loadMovimientos(): void {
    const caja = this.selectedCaja();
    if (!caja) {
      this.movimientos.set([]);
      return;
    }

    this.loading.set(true);
    this.api
      .listCajaMovimientos(caja.id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (movimientos) => this.movimientos.set(movimientos),
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  private actorId(): string {
    const session = this.session.currentSession();
    if (session?.userId) {
      return String(session.userId);
    }
    return session?.username || 'system';
  }

  private actorName(): string {
    const session = this.session.currentSession();
    return session?.nombres?.trim() || session?.username || 'Usuario';
  }

  private resolveError(error: unknown): string {
    if (typeof error === 'object' && error !== null) {
      const httpError = error as {
        status?: number;
        error?: { message?: string; details?: string[] };
      };
      if (httpError.status === 403) {
        return 'No tienes permisos de caja. Solicita rol ADMIN o SALES.';
      }
      if (httpError.status === 500) {
        return 'El backend reporto un error interno en caja. Revisa logs del servidor.';
      }
      if (!('error' in httpError)) {
        return 'No se pudo completar la operacion.';
      }
      const apiError = httpError.error;
      return apiError?.details?.[0] || apiError?.message || 'No se pudo completar la operacion.';
    }
    return 'No se pudo completar la operacion.';
  }

  private isVentaMovimiento(movimiento: CajaMovimiento): boolean {
    const tipo = (movimiento.tipoMovimiento || '').toUpperCase();
    if (tipo !== 'SALIDA' && tipo !== 'ENTRADA') {
      return false;
    }
    const descripcion = (movimiento.descripcion || '').toUpperCase();
    const referencia = (movimiento.referencia || '').toUpperCase();
    return (
      descripcion.includes('VENTA') ||
      referencia.startsWith('FAC') ||
      referencia.startsWith('BOL') ||
      referencia.startsWith('TKT')
    );
  }

  private resolveClienteTipoDocumento(
    tipoComprobante: TipoComprobanteVenta,
    numeroDocumento: string,
  ): string | null {
    if (tipoComprobante === 'FACTURA') {
      return '6';
    }
    if (tipoComprobante === 'BOLETA') {
      const clean = numeroDocumento.trim();
      if (/^[0-9]{8}$/.test(clean)) {
        return '1';
      }
    }
    return null;
  }

  private recalculateVentaTotal(): void {
    const total = this.ventaForm.items.reduce(
      (sum, item) => sum + Number(item.cantidad || 0) * Number(item.precioUnitario || 0),
      0,
    );
    this.ventaForm.total = Number(total.toFixed(2));
  }

  private createEmptyVentaItem(): VentaProductoForm {
    return {
      productoId: null,
      almacenId: null,
      cantidad: 1,
      precioUnitario: 0,
      descripcion: '',
    };
  }
}
