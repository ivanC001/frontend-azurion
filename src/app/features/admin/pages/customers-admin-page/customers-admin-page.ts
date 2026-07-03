import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { AuthSessionService } from '@core/auth/auth-session.service';
import {
  AdminSaasApiService,
  Cliente,
  ClienteAbono,
  Empresa,
} from '../../data/admin-saas-api.service';
import { UbigeoPickerComponent } from '../../components/ubigeo-picker/ubigeo-picker';

interface ClienteForm {
  id: number | null;
  tenantId: string;
  tipoDocumento: '1' | '6';
  numeroDocumento: string;
  nombre: string;
  email: string;
  direccion: string;
  ubigeo: string;
  telefono: string;
  limiteCredito: number;
  diasCredito: number;
  activo: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-customers-admin-page',
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
    UbigeoPickerComponent,
  ],
  templateUrl: './customers-admin-page.html',
  styleUrl: './customers-admin-page.scss',
})
export class CustomersAdminPage {
  private readonly api = inject(AdminSaasApiService);
  private readonly session = inject(AuthSessionService);

  protected readonly clientes = signal<Cliente[]>([]);
  protected readonly empresas = signal<Empresa[]>([]);
  protected readonly loading = signal(false);
  protected readonly loadingEmpresas = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly clienteDialogVisible = signal(false);
  protected readonly abonoDialogVisible = signal(false);
  protected readonly selectedDeudor = signal<Cliente | null>(null);
  protected readonly abonos = signal<ClienteAbono[]>([]);
  protected readonly loadingAbonos = signal(false);
  protected abonoForm = { monto: 0, observacion: '' };

  protected form: ClienteForm = {
    id: null,
    tenantId: this.session.currentSession()?.tenantId || '',
    tipoDocumento: '6',
    numeroDocumento: '',
    nombre: '',
    email: '',
    direccion: '',
    ubigeo: '',
    telefono: '',
    limiteCredito: 0,
    diasCredito: 0,
    activo: true,
  };

  protected readonly isGeneralAdmin = computed(() => {
    const session = this.session.currentSession();
    if (session?.adminGeneral) {
      return true;
    }

    const roles = session?.roles ?? [];
    return roles.includes('ROLE_ADMIN_GENERAL') || roles.includes('ROLE_PLATFORM_ADMIN');
  });

  protected readonly tenantOptions = computed(() =>
    this.empresas().map((empresa) => ({
      label: `${empresa.razonSocial} (${empresa.tenantId})`,
      value: empresa.tenantId,
    })),
  );

  protected readonly selectedEmpresa = computed(() => {
    const tenantId = this.form.tenantId.trim();
    if (!tenantId) {
      return null;
    }
    return this.empresas().find((empresa) => empresa.tenantId === tenantId) ?? null;
  });

  protected readonly filteredClientes = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) {
      return this.clientes();
    }

    return this.clientes().filter(
      (cliente) =>
        cliente.numeroDocumento.toLowerCase().includes(term) ||
        cliente.nombre.toLowerCase().includes(term) ||
        (cliente.email || '').toLowerCase().includes(term),
    );
  });

  protected readonly customerStats = computed(() => {
    const clientes = this.clientes();
    return {
      total: clientes.length,
      activos: clientes.filter((cliente) => cliente.activo).length,
      deudores: clientes.filter((cliente) => cliente.deudor).length,
      deudaTotal: clientes.reduce((total, cliente) => total + Number(cliente.saldoDeuda || 0), 0),
    };
  });

  constructor() {
    if (this.isGeneralAdmin()) {
      this.loadEmpresas();
      return;
    }

    this.load();
  }

  protected load(): void {
    const tenantId = this.resolveTargetTenant();
    if (!tenantId) {
      this.clientes.set([]);
      this.errorMessage.set('Selecciona una empresa para listar clientes.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.api
      .listClientes({ tenantId })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => this.clientes.set(items),
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected setSearch(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.searchTerm.set(input?.value ?? '');
  }

  protected onTenantChange(): void {
    this.successMessage.set(null);
    this.load();
  }

  protected openCreateDialog(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.form = {
      id: null,
      tenantId: this.form.tenantId,
      tipoDocumento: '6',
      numeroDocumento: '',
      nombre: '',
      email: '',
      direccion: '',
      ubigeo: '',
      telefono: '',
      limiteCredito: 0,
      diasCredito: 0,
      activo: true,
    };
    this.clienteDialogVisible.set(true);
  }

  protected openEditDialog(cliente: Cliente): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.form = {
      id: cliente.id,
      tenantId: this.form.tenantId,
      tipoDocumento: cliente.tipoDocumento === '1' ? '1' : '6',
      numeroDocumento: cliente.numeroDocumento,
      nombre: cliente.nombre,
      email: cliente.email || '',
      direccion: cliente.direccion || '',
      ubigeo: cliente.ubigeo || '',
      telefono: cliente.telefono || '',
      limiteCredito: Number(cliente.limiteCredito || 0),
      diasCredito: Number(cliente.diasCredito || 0),
      activo: cliente.activo,
    };
    this.clienteDialogVisible.set(true);
  }

  protected saveCliente(): void {
    if (this.saving()) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);

    const tenantId = this.resolveTargetTenant();
    if (!tenantId) {
      this.errorMessage.set('Debes indicar el tenant destino.');
      return;
    }

    if (
      this.isGeneralAdmin() &&
      !this.empresas().some((empresa) => empresa.tenantId === tenantId)
    ) {
      this.errorMessage.set('El tenant seleccionado no existe. Verifica la empresa.');
      return;
    }

    const numeroDocumento = this.form.numeroDocumento.trim();
    const nombre = this.form.nombre.trim();
    const email = this.form.email.trim();
    const direccion = this.form.direccion.trim();
    const ubigeo = this.form.ubigeo.trim();
    const telefono = this.form.telefono.trim();
    const limiteCredito = Math.max(0, Number(this.form.limiteCredito || 0));
    const diasCredito = Math.max(0, Number(this.form.diasCredito || 0));
    const clienteActual = this.form.id
      ? this.clientes().find((cliente) => cliente.id === this.form.id)
      : null;

    if (!/^\d+$/.test(numeroDocumento)) {
      this.errorMessage.set('El numero de documento debe contener solo digitos.');
      return;
    }

    if (this.form.tipoDocumento === '1' && numeroDocumento.length !== 8) {
      this.errorMessage.set('Para DNI, el numero de documento debe tener 8 digitos.');
      return;
    }

    if (this.form.tipoDocumento === '6' && numeroDocumento.length !== 11) {
      this.errorMessage.set('Para RUC, el numero de documento debe tener 11 digitos.');
      return;
    }

    if (!nombre) {
      this.errorMessage.set('Completa el nombre o razon social del cliente.');
      return;
    }

    if (this.form.tipoDocumento === '6' && !direccion) {
      this.errorMessage.set('Para clientes con RUC registra la direccion fiscal.');
      return;
    }

    if (this.form.tipoDocumento === '6' && !ubigeo) {
      this.errorMessage.set('Para clientes con RUC selecciona el ubigeo fiscal.');
      return;
    }

    if (ubigeo && !/^\d{6}$/.test(ubigeo)) {
      this.errorMessage.set('El ubigeo debe contener 6 digitos.');
      return;
    }

    if (email && !this.isEmailValid(email)) {
      this.errorMessage.set('Ingresa un email valido.');
      return;
    }

    if (clienteActual && limiteCredito < Number(clienteActual.saldoDeuda || 0)) {
      this.errorMessage.set('El limite de credito no puede ser menor a la deuda pendiente.');
      return;
    }

    this.saving.set(true);
    const request = {
      tipoDocumento: this.form.tipoDocumento,
      numeroDocumento,
      nombre,
      email: email || null,
      direccion: direccion || null,
      ubigeo: ubigeo || null,
      telefono: telefono || null,
      limiteCredito,
      diasCredito,
      activo: this.form.activo,
    };

    const action$ = this.form.id
      ? this.api.updateCliente(this.form.id, request, { tenantId })
      : this.api.createCliente(request, { tenantId });

    action$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.clienteDialogVisible.set(false);
        this.successMessage.set(
          this.form.id ? 'Cliente actualizado correctamente.' : 'Cliente creado correctamente.',
        );
        this.load();
      },
      error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
    });
  }

  protected deleteCliente(cliente: Cliente): void {
    if (this.saving()) {
      return;
    }

    const tenantId = this.resolveTargetTenant();
    if (!tenantId) {
      this.errorMessage.set('Debes indicar el tenant destino.');
      return;
    }

    const confirmed = globalThis.confirm(
      `Se eliminara el cliente ${cliente.nombre}. Deseas continuar?`,
    );
    if (!confirmed) {
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.api
      .deleteCliente(cliente.id, { tenantId })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set(`Cliente ${cliente.nombre} eliminado.`);
          this.load();
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected openAbonoDialog(cliente: Cliente): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.selectedDeudor.set(cliente);
    this.abonoForm = { monto: Number(cliente.saldoDeuda || 0), observacion: '' };
    this.abonoDialogVisible.set(true);
    this.loadAbonos(cliente);
  }

  protected saveAbono(): void {
    const cliente = this.selectedDeudor();
    const tenantId = this.resolveTargetTenant();
    const monto = Number(this.abonoForm.monto || 0);
    if (!cliente || !tenantId || this.saving()) {
      return;
    }
    if (monto <= 0) {
      this.errorMessage.set('El monto del abono debe ser mayor a cero.');
      return;
    }
    if (monto > Number(cliente.saldoDeuda || 0)) {
      this.errorMessage.set('El abono no puede superar la deuda pendiente.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);
    this.api
      .registrarClienteAbono(
        cliente.id,
        {
          monto,
          observacion: this.abonoForm.observacion.trim() || null,
        },
        { tenantId },
      )
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.abonoDialogVisible.set(false);
          this.selectedDeudor.set(null);
          this.successMessage.set(
            `Abono de S/ ${monto.toFixed(2)} registrado para ${cliente.nombre}.`,
          );
          this.load();
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected onTipoDocumentoChange(): void {
    const maxLength = this.form.tipoDocumento === '1' ? 8 : 11;
    this.form = {
      ...this.form,
      numeroDocumento: this.form.numeroDocumento.replace(/\D+/g, '').slice(0, maxLength),
    };
  }

  protected sanitizeNumeroDocumento(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const maxLength = this.form.tipoDocumento === '1' ? 8 : 11;
    if (!input) {
      return;
    }
    const cleaned = input.value.replace(/\D+/g, '').slice(0, maxLength);
    input.value = cleaned;
    this.form = { ...this.form, numeroDocumento: cleaned };
  }

  protected formatTipoDocumento(tipo: string): string {
    return tipo === '1' ? 'DNI' : 'RUC';
  }

  protected customerStatusSeverity(cliente: Cliente): 'success' | 'warn' | 'danger' {
    if (!cliente.activo) {
      return 'danger';
    }
    return cliente.deudor ? 'warn' : 'success';
  }

  protected customerStatusLabel(cliente: Cliente): string {
    if (!cliente.activo) {
      return 'Inactivo';
    }
    return cliente.deudor ? 'Deudor' : 'Al dia';
  }

  private resolveTargetTenant(): string | null {
    if (this.isGeneralAdmin()) {
      return this.form.tenantId.trim() || null;
    }
    return this.session.currentSession()?.tenantId || null;
  }

  private isEmailValid(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private loadAbonos(cliente: Cliente): void {
    const tenantId = this.resolveTargetTenant();
    if (!tenantId) {
      this.abonos.set([]);
      return;
    }
    this.loadingAbonos.set(true);
    this.api
      .listClienteAbonos(cliente.id, { tenantId })
      .pipe(finalize(() => this.loadingAbonos.set(false)))
      .subscribe({
        next: (items) => this.abonos.set(items),
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  private resolveError(error: unknown): string {
    if (typeof error === 'object' && error !== null) {
      const httpError = error as {
        status?: number;
        error?: { message?: string; details?: string[] };
      };
      if (httpError.status === 403) {
        return 'No tienes permisos para clientes en este tenant. Solicita rol ADMIN_EMPRESA, ADMIN o SALES.';
      }

      if (!('error' in httpError)) {
        return 'No se pudo completar la operacion.';
      }

      const apiError = httpError.error;
      return apiError?.details?.[0] || apiError?.message || 'No se pudo completar la operacion.';
    }

    return 'No se pudo completar la operacion.';
  }

  private loadEmpresas(): void {
    this.loadingEmpresas.set(true);
    this.errorMessage.set(null);
    this.api
      .listEmpresas()
      .pipe(finalize(() => this.loadingEmpresas.set(false)))
      .subscribe({
        next: (items) => {
          this.empresas.set(items);
          const currentTenant = this.form.tenantId.trim();
          const hasTenant = items.some((empresa) => empresa.tenantId === currentTenant);
          if (!hasTenant) {
            this.form = { ...this.form, tenantId: items[0]?.tenantId ?? '' };
          }
          this.load();
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.resolveError(error));
          this.clientes.set([]);
        },
      });
  }
}
