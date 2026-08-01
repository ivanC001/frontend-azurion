import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { AuthSessionService } from '@core/auth/auth-session.service';
import { createClientOperationId } from '@core/utils/client-operation-id';
import {
  AdminSaasApiService,
  CajaFisica,
  CajaMovimiento,
  CajaTurno,
  Sucursal,
  UsuarioTenant,
} from '../../data/admin-saas-api.service';

interface AbrirTurnoForm {
  cajaId: number | null;
  saldoApertura: number;
  observacion: string;
}

interface MovimientoForm {
  tipoMovimiento: 'INGRESO' | 'RETIRO' | 'REEMBOLSO';
  monto: number;
  descripcion: string;
  referencia: string;
  clientOperationId: string;
}

interface DepositoForm {
  monto: number;
  cuentaEmpresarial: string;
  numeroOperacion: string;
  observacion: string;
  clientOperationId: string;
}

interface CierreForm {
  conteoFisico: number;
  observacion: string;
}

interface CajaFisicaForm {
  id: number | null;
  sucursalId: number | null;
  codigo: string;
  nombre: string;
  moneda: 'PEN' | 'USD' | 'EUR';
  estado: 'ACTIVA' | 'INACTIVA';
  usuarioIds: number[];
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
    MultiSelectModule,
    SelectModule,
    TableModule,
    TagModule,
  ],
  templateUrl: './cash-admin-page.html',
  styleUrl: './cash-admin-page.scss',
})
export class CashAdminPage {
  private readonly api = inject(AdminSaasApiService);
  private readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);

  protected readonly cajasFisicas = signal<CajaFisica[]>([]);
  protected readonly turnos = signal<CajaTurno[]>([]);
  protected readonly movimientos = signal<CajaMovimiento[]>([]);
  protected readonly sucursales = signal<Sucursal[]>([]);
  protected readonly usuarios = signal<UsuarioTenant[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly selectedTurnoId = signal<number | null>(null);
  protected readonly estadoFilter = signal<string | null>(null);
  protected readonly sucursalFilter = signal<number | null>(null);

  protected readonly abrirDialogVisible = signal(false);
  protected readonly movimientoDialogVisible = signal(false);
  protected readonly depositoDialogVisible = signal(false);
  protected readonly cierreDialogVisible = signal(false);
  protected readonly cajaFisicaDialogVisible = signal(false);

  protected abrirForm: AbrirTurnoForm = this.emptyOpenForm();
  protected movimientoForm: MovimientoForm = this.emptyMovementForm();
  protected depositoForm: DepositoForm = this.emptyDepositForm();
  protected cierreForm: CierreForm = this.emptyCloseForm();
  protected cajaFisicaForm: CajaFisicaForm = this.emptyPhysicalBoxForm();

  protected readonly canConfigure = computed(() =>
    this.session.hasPermission('CAJA_CONFIGURE') || this.session.hasPermission('CAJA_WRITE'),
  );

  protected readonly selectedTurno = computed(() => {
    const selectedId = this.selectedTurnoId();
    return this.turnos().find((turno) => turno.id === selectedId) ?? null;
  });

  protected readonly activeTurno = computed(() => {
    const userId = Number(this.session.currentSession()?.userId || 0);
    if (!userId) {
      return null;
    }
    return this.turnos().find((turno) =>
      turno.estado === 'ABIERTO' && turno.usuarioId === userId,
    ) ?? null;
  });

  protected readonly activePhysicalBoxes = computed(() =>
    this.cajasFisicas().filter((caja) => caja.estado === 'ACTIVA'),
  );

  protected readonly filteredTurnos = computed(() => {
    const estado = this.estadoFilter();
    const sucursalId = this.sucursalFilter();
    return this.turnos().filter((turno) =>
      (!estado || turno.estado === estado)
      && (!sucursalId || turno.sucursalId === sucursalId),
    );
  });

  protected readonly totalSalidas = computed(() => {
    const turno = this.selectedTurno();
    if (!turno) {
      return 0;
    }
    return Number(turno.totalRetiros || 0)
      + Number(turno.totalDepositos || 0)
      + Number(turno.totalReembolsos || 0);
  });

  protected readonly cierreDiferenciaPreview = computed(() => {
    const turno = this.selectedTurno();
    if (!turno) {
      return 0;
    }
    return Number(this.cierreForm.conteoFisico || 0) - Number(turno.saldoEsperado || 0);
  });

  protected readonly sucursalOptions = computed(() =>
    this.sucursales().map((sucursal) => ({
      label: `${sucursal.codigo} - ${sucursal.nombre}`,
      value: sucursal.id,
    })),
  );

  protected readonly cajaOptions = computed(() =>
    this.activePhysicalBoxes().map((caja) => ({
      label: `${caja.codigo} - ${caja.nombre} · ${caja.sucursalNombre}`,
      value: caja.id,
    })),
  );

  protected readonly usuarioOptions = computed(() =>
    this.usuarios()
      .filter((usuario) => usuario.activo)
      .map((usuario) => ({
        label: `${usuario.nombres || usuario.username} (${usuario.username})`,
        value: usuario.id,
      })),
  );

  protected readonly estadoOptions = [
    { label: 'Abiertos', value: 'ABIERTO' },
    { label: 'Cerrados', value: 'CERRADO' },
  ];

  protected readonly monedaOptions = [
    { label: 'Soles (PEN)', value: 'PEN' },
    { label: 'Dólares (USD)', value: 'USD' },
    { label: 'Euros (EUR)', value: 'EUR' },
  ];

  protected readonly cajaEstadoOptions = [
    { label: 'Activa', value: 'ACTIVA' },
    { label: 'Inactiva', value: 'INACTIVA' },
  ];

  protected readonly movimientoOptions = [
    { label: 'Ingreso manual', value: 'INGRESO' },
    { label: 'Retiro de efectivo', value: 'RETIRO' },
    { label: 'Reembolso', value: 'REEMBOLSO' },
  ];

  constructor() {
    this.loadData();
  }

  protected loadData(preferredTurnoId?: number): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    const usersRequest = this.canConfigure()
      ? this.api.listUsuarios().pipe(catchError(() => of([] as UsuarioTenant[])))
      : of([] as UsuarioTenant[]);

    forkJoin({
      cajasFisicas: this.api.listCajasFisicas(),
      turnos: this.api.listCajaTurnos(),
      active: this.api.getCajaTurnoActivo().pipe(catchError(() => of(null))),
      sucursales: this.api.listSucursales(),
      usuarios: usersRequest,
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ cajasFisicas, turnos, active, sucursales, usuarios }) => {
          this.cajasFisicas.set(cajasFisicas);
          this.turnos.set(turnos);
          this.sucursales.set(sucursales);
          this.usuarios.set(usuarios);

          const currentSelection = preferredTurnoId ?? this.selectedTurnoId();
          const selectedId = active?.id
            ?? (currentSelection && turnos.some((turno) => turno.id === currentSelection)
              ? currentSelection
              : turnos[0]?.id ?? null);
          this.selectedTurnoId.set(selectedId);
          this.abrirForm = {
            ...this.emptyOpenForm(),
            cajaId: active?.cajaId ?? cajasFisicas.find((caja) => caja.estado === 'ACTIVA')?.id ?? null,
          };
          this.loadMovimientos();
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected selectTurno(turnoId: number): void {
    this.selectedTurnoId.set(turnoId);
    this.loadMovimientos();
  }

  protected openAbrirDialog(): void {
    if (this.activeTurno()) {
      this.errorMessage.set('Ya tienes un turno abierto. Debes cerrarlo antes de abrir otro.');
      return;
    }
    if (!this.activePhysicalBoxes().length) {
      this.errorMessage.set('No tienes cajas activas asignadas. Solicita una asignación al administrador.');
      return;
    }
    this.clearMessages();
    this.abrirForm = {
      cajaId: this.activePhysicalBoxes()[0]?.id ?? null,
      saldoApertura: 0,
      observacion: '',
    };
    this.abrirDialogVisible.set(true);
  }

  protected abrirTurno(): void {
    if (this.saving() || !this.abrirForm.cajaId) {
      return;
    }
    if (Number(this.abrirForm.saldoApertura) < 0) {
      this.errorMessage.set('El saldo inicial no puede ser negativo.');
      return;
    }
    this.saving.set(true);
    this.api.abrirTurnoCaja({
      cajaId: this.abrirForm.cajaId,
      saldoApertura: Number(this.abrirForm.saldoApertura),
      observacion: this.abrirForm.observacion.trim() || null,
    })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (turno) => {
          this.abrirDialogVisible.set(false);
          this.successMessage.set(`Turno ${turno.numero} abierto correctamente.`);
          this.loadData(turno.id);
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected openMovimientoDialog(tipo: MovimientoForm['tipoMovimiento'] = 'INGRESO'): void {
    if (!this.requireOpenTurn()) {
      return;
    }
    this.clearMessages();
    this.movimientoForm = { ...this.emptyMovementForm(), tipoMovimiento: tipo };
    this.movimientoDialogVisible.set(true);
  }

  protected registrarMovimiento(): void {
    const turno = this.selectedTurno();
    if (!turno || this.saving()) {
      return;
    }
    if (Number(this.movimientoForm.monto) <= 0 || !this.movimientoForm.descripcion.trim()) {
      this.errorMessage.set('Completa el monto y la descripción del movimiento.');
      return;
    }
    this.saving.set(true);
    this.api.registrarMovimientoCaja(turno.id, {
      tipoMovimiento: this.movimientoForm.tipoMovimiento,
      monto: Number(this.movimientoForm.monto),
      descripcion: this.movimientoForm.descripcion.trim(),
      referencia: this.movimientoForm.referencia.trim() || null,
      clientOperationId: this.movimientoForm.clientOperationId,
    })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.movimientoDialogVisible.set(false);
          this.successMessage.set('Movimiento registrado en el turno.');
          this.loadData(turno.id);
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected openDepositoDialog(): void {
    if (!this.requireOpenTurn()) {
      return;
    }
    this.clearMessages();
    this.depositoForm = this.emptyDepositForm();
    this.depositoDialogVisible.set(true);
  }

  protected registrarDeposito(): void {
    const turno = this.selectedTurno();
    if (!turno || this.saving()) {
      return;
    }
    if (Number(this.depositoForm.monto) <= 0 || !this.depositoForm.cuentaEmpresarial.trim()) {
      this.errorMessage.set('Completa el monto y la cuenta empresarial.');
      return;
    }
    this.saving.set(true);
    this.api.depositarCuentaEmpresarial(turno.id, {
      monto: Number(this.depositoForm.monto),
      cuentaEmpresarial: this.depositoForm.cuentaEmpresarial.trim(),
      numeroOperacion: this.depositoForm.numeroOperacion.trim() || null,
      observacion: this.depositoForm.observacion.trim() || null,
      clientOperationId: this.depositoForm.clientOperationId,
    })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.depositoDialogVisible.set(false);
          this.successMessage.set('Depósito registrado y descontado del efectivo esperado.');
          this.loadData(turno.id);
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected openCierreDialog(): void {
    const turno = this.selectedTurno();
    if (!turno || turno.estado !== 'ABIERTO') {
      this.errorMessage.set('Selecciona un turno abierto.');
      return;
    }
    this.clearMessages();
    this.cierreForm = {
      conteoFisico: Number(turno.saldoEsperado || 0),
      observacion: '',
    };
    this.cierreDialogVisible.set(true);
  }

  protected cerrarTurno(): void {
    const turno = this.selectedTurno();
    if (!turno || this.saving()) {
      return;
    }
    if (Number(this.cierreForm.conteoFisico) < 0) {
      this.errorMessage.set('El conteo físico no puede ser negativo.');
      return;
    }
    this.saving.set(true);
    this.api.cerrarTurnoCaja(turno.id, {
      conteoFisico: Number(this.cierreForm.conteoFisico),
      observacion: this.cierreForm.observacion.trim() || null,
    })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (closed) => {
          this.cierreDialogVisible.set(false);
          this.successMessage.set(
            `Turno ${closed.numero} cerrado. Diferencia: ${this.money(closed.diferenciaCierre || 0)}.`,
          );
          this.loadData(closed.id);
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected openCajaFisicaDialog(caja?: CajaFisica): void {
    this.clearMessages();
    this.cajaFisicaForm = caja
      ? {
        id: caja.id,
        sucursalId: caja.sucursalId,
        codigo: caja.codigo,
        nombre: caja.nombre,
        moneda: caja.moneda as CajaFisicaForm['moneda'],
        estado: caja.estado,
        usuarioIds: [...(caja.usuarioIds || [])],
      }
      : this.emptyPhysicalBoxForm();
    this.cajaFisicaDialogVisible.set(true);
  }

  protected guardarCajaFisica(): void {
    if (this.saving()) {
      return;
    }
    const form = this.cajaFisicaForm;
    if (!form.sucursalId || !form.codigo.trim() || !form.nombre.trim() || !form.usuarioIds.length) {
      this.errorMessage.set('Completa sucursal, código, nombre y al menos un cajero autorizado.');
      return;
    }
    const request = {
      sucursalId: form.sucursalId,
      codigo: form.codigo.trim().toUpperCase(),
      nombre: form.nombre.trim(),
      moneda: form.moneda,
      estado: form.estado,
      usuarioIds: form.usuarioIds,
    } as const;
    const operation = form.id
      ? this.api.actualizarCajaFisica(form.id, request)
      : this.api.crearCajaFisica(request);
    this.saving.set(true);
    operation.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.cajaFisicaDialogVisible.set(false);
        this.successMessage.set(form.id ? 'Caja física actualizada.' : 'Caja física creada.');
        this.loadData();
      },
      error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
    });
  }

  protected goToPos(): void {
    void this.router.navigate(['/admin/ventas/nueva']);
  }

  protected turnoSeverity(estado: string): 'success' | 'secondary' {
    return estado === 'ABIERTO' ? 'success' : 'secondary';
  }

  protected differenceClass(value: number | null): string {
    const amount = Number(value || 0);
    if (Math.abs(amount) < 0.005) {
      return 'difference-ok';
    }
    return amount > 0 ? 'difference-positive' : 'difference-negative';
  }

  protected movementClass(tipo: string): string {
    return ['RETIRO', 'DEPOSITO', 'REEMBOLSO'].includes(tipo)
      ? 'movement-out'
      : 'movement-in';
  }

  protected paymentLabel(value: string): string {
    return value === 'YAPE' || value === 'PLIN' ? `Billetera · ${value}` : value;
  }

  private loadMovimientos(): void {
    const turnoId = this.selectedTurnoId();
    if (!turnoId) {
      this.movimientos.set([]);
      return;
    }
    this.api.listCajaMovimientos(turnoId).subscribe({
      next: (movimientos) => this.movimientos.set(movimientos),
      error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
    });
  }

  private requireOpenTurn(): boolean {
    const turno = this.selectedTurno();
    if (!turno || turno.estado !== 'ABIERTO') {
      this.errorMessage.set('Debes tener un turno de caja abierto para realizar esta operación.');
      return false;
    }
    return true;
  }

  private emptyOpenForm(): AbrirTurnoForm {
    return { cajaId: null, saldoApertura: 0, observacion: '' };
  }

  private emptyMovementForm(): MovimientoForm {
    return {
      tipoMovimiento: 'INGRESO',
      monto: 0,
      descripcion: '',
      referencia: '',
      clientOperationId: createClientOperationId('cash'),
    };
  }

  private emptyDepositForm(): DepositoForm {
    return {
      monto: 0,
      cuentaEmpresarial: '',
      numeroOperacion: '',
      observacion: '',
      clientOperationId: createClientOperationId('cash-deposit'),
    };
  }

  private emptyCloseForm(): CierreForm {
    return { conteoFisico: 0, observacion: '' };
  }

  private emptyPhysicalBoxForm(): CajaFisicaForm {
    return {
      id: null,
      sucursalId: this.sucursales()[0]?.id ?? null,
      codigo: '',
      nombre: '',
      moneda: 'PEN',
      estado: 'ACTIVA',
      usuarioIds: [],
    };
  }

  private clearMessages(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  private money(value: number): string {
    return `S/ ${Number(value || 0).toFixed(2)}`;
  }

  private resolveError(error: unknown): string {
    if (typeof error === 'object' && error !== null) {
      const httpError = error as {
        status?: number;
        error?: { message?: string; details?: string[] };
      };
      if (httpError.status === 403) {
        return 'No tienes permisos para esta operación de caja.';
      }
      return httpError.error?.details?.[0]
        || httpError.error?.message
        || 'No se pudo completar la operación.';
    }
    return 'No se pudo completar la operación.';
  }
}
