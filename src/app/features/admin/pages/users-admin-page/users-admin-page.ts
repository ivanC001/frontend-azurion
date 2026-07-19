import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { concatMap, finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { AuthSessionService } from '@core/auth/auth-session.service';
import {
  AdminSaasApiService,
  Empresa,
  Rol,
  Sucursal,
  UsuarioTenant,
} from '../../data/admin-saas-api.service';

interface UsuarioForm {
  tenantId: string;
  username: string;
  password: string;
  nombres: string;
  email: string;
  roles: string[];
  sucursalIds: number[];
}

interface RolForm {
  codigo: string;
  nombre: string;
  descripcion: string;
  deleteRoleId: number | null;
}

interface EditUsuarioForm {
  id: number | null;
  username: string;
  nombres: string;
  email: string;
  activo: boolean;
  roles: string[];
  sucursalIds: number[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-users-admin-page',
  imports: [
    FormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    MultiSelectModule,
    SelectModule,
    TableModule,
    TagModule,
    TooltipModule,
  ],
  templateUrl: './users-admin-page.html',
  styleUrl: './users-admin-page.scss',
})
export class UsersAdminPage {
  private readonly api = inject(AdminSaasApiService);
  private readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);

  protected readonly usuarios = signal<UsuarioTenant[]>([]);
  protected readonly empresas = signal<Empresa[]>([]);
  protected readonly roles = signal<Rol[]>([]);
  protected readonly sucursales = signal<Sucursal[]>([]);
  protected readonly loading = signal(false);
  protected readonly loadingEmpresas = signal(false);
  protected readonly loadingRoles = signal(false);
  protected readonly saving = signal(false);
  protected readonly creatingRole = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly userDialogVisible = signal(false);
  protected readonly roleDialogVisible = signal(false);
  protected readonly editDialogVisible = signal(false);
  protected readonly searchTerm = signal('');

  protected form: UsuarioForm = {
    tenantId: this.session.currentSession()?.tenantId || 'public',
    username: '',
    password: '',
    nombres: '',
    email: '',
    roles: this.session.currentSession()?.adminGeneral ? ['ADMIN_EMPRESA'] : [],
    sucursalIds: [],
  };
  protected rolForm: RolForm = {
    codigo: '',
    nombre: '',
    descripcion: '',
    deleteRoleId: null,
  };
  protected editForm: EditUsuarioForm = {
    id: null,
    username: '',
    nombres: '',
    email: '',
    activo: true,
    roles: [],
    sucursalIds: [],
  };

  protected readonly activeUsers = computed(
    () => this.usuarios().filter((user) => user.activo).length,
  );
  protected readonly inactiveUsers = computed(
    () => this.usuarios().filter((user) => !user.activo).length,
  );
  protected readonly filteredUsers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) {
      return this.usuarios();
    }
    return this.usuarios().filter(
      (user) =>
        user.username.toLowerCase().includes(term) ||
        user.nombres.toLowerCase().includes(term) ||
        (user.email || '').toLowerCase().includes(term) ||
        user.roles.some((role) => role.toLowerCase().includes(term)),
    );
  });
  protected readonly isGeneralAdmin = computed(() => !!this.session.currentSession()?.adminGeneral);
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
  protected readonly sortedRoles = computed(() =>
    [...this.roles()]
      .filter((role) => this.isGeneralAdmin() || role.codigo !== 'ADMIN_EMPRESA')
      .filter((role) => !role.deprecated)
      .filter((role) => {
        if (this.isGeneralAdmin()) return true;
        if (role.ambito === 'ERP') return this.session.hasModule('ERP');
        if (role.ambito === 'CRM') return this.session.hasModule('CRM');
        return true;
      })
      .sort((a, b) => a.codigo.localeCompare(b.codigo)),
  );
  protected readonly sucursalOptions = computed(() =>
    this.sucursales()
      .filter((sucursal) => sucursal.activo)
      .map((sucursal) => ({
        label: `${sucursal.codigo} - ${sucursal.nombre}`,
        value: sucursal.id,
      })),
  );

  constructor() {
    if (this.isGeneralAdmin()) {
      this.loadEmpresas();
      return;
    }

    this.load();
  }

  protected load(): void {
    this.errorMessage.set(null);
    const tenantId = this.resolveTargetTenant();
    if (!tenantId) {
      this.loading.set(false);
      this.usuarios.set([]);
      this.errorMessage.set('Selecciona el tenant para ver y registrar usuarios.');
      return;
    }

    this.loading.set(true);
    forkJoin({
      usuarios: this.api.listUsuarios({ tenantId }),
      sucursales: this.api.listSucursales({ tenantId }),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ usuarios, sucursales }) => {
          this.usuarios.set(usuarios);
          this.sucursales.set(sucursales);
          this.loadRoles();
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected save(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (!this.form.username.trim() || !this.form.password || !this.form.nombres.trim()) {
      this.errorMessage.set('Completa username, password y nombres.');
      return;
    }
    if (this.form.password.length < 8) {
      this.errorMessage.set('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (!this.form.roles.length) {
      this.errorMessage.set('Debes asignar al menos un rol al usuario.');
      return;
    }
    if (this.sucursales().length > 0 && !this.form.sucursalIds.length) {
      this.errorMessage.set('Debes asignar al menos una sucursal al usuario.');
      return;
    }

    const tenantId = this.resolveTargetTenant();
    if (!tenantId) {
      this.errorMessage.set('Debes indicar el tenantId destino para registrar usuarios.');
      return;
    }
    if (
      this.isGeneralAdmin() &&
      !this.empresas().some((empresa) => empresa.tenantId === tenantId)
    ) {
      this.errorMessage.set(
        'El tenant seleccionado no existe. Verifica la empresa o crea el tenant primero.',
      );
      return;
    }

    this.saving.set(true);
    this.api
      .createUsuario(
        {
          username: this.form.username.trim(),
          password: this.form.password,
          nombres: this.form.nombres.trim(),
          email: this.form.email.trim() || null,
          rolCodigos: this.form.roles.map((role) => role.toUpperCase()),
          sucursalIds: this.form.sucursalIds,
        },
        { tenantId },
      )
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set('Usuario registrado correctamente.');
          this.form = {
            tenantId: this.form.tenantId,
            username: '',
            password: '',
            nombres: '',
            email: '',
            roles: [],
            sucursalIds: [],
          };
          this.userDialogVisible.set(false);
          this.load();
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected statusSeverity(active: boolean): 'success' | 'danger' {
    return active ? 'success' : 'danger';
  }

  protected onTenantChange(): void {
    this.successMessage.set(null);
    this.rolForm.deleteRoleId = null;
    this.form.roles = [];
    this.form.sucursalIds = [];
    this.load();
  }

  protected openUserDialog(): void {
    if (this.saving() || this.creatingRole()) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.loadRoles();

    if (!this.form.roles.length) {
      const suggestedRole =
        (this.isGeneralAdmin()
          ? this.roles().find((role) => role.codigo === 'ADMIN_EMPRESA')
          : null) ??
        (this.session.hasModule('CRM') && !this.session.hasModule('ERP')
          ? this.sortedRoles().find((role) => role.codigo === 'CRM_VENDEDOR')
          : this.sortedRoles().find((role) => role.codigo === 'ERP_VENDEDOR')) ??
        this.sortedRoles()[0];
      this.form.roles = suggestedRole ? [suggestedRole.codigo] : [];
    }

    this.userDialogVisible.set(true);
  }

  protected openRoleDialog(): void {
    void this.router.navigate([
      this.isGeneralAdmin() ? '/admin/seguridad-plataforma' : '/admin/seguridad-empresa',
    ]);
  }

  protected setSearch(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.searchTerm.set(input?.value ?? '');
  }

  protected openEditDialog(user: UsuarioTenant): void {
    if (this.saving() || this.creatingRole()) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.loadRoles();
    this.editForm = {
      id: user.id,
      username: user.username,
      nombres: user.nombres,
      email: user.email || '',
      activo: user.activo,
      roles: [...user.roles],
      sucursalIds: user.sucursales.map((sucursal) => sucursal.id),
    };
    this.editDialogVisible.set(true);
  }

  protected toggleEditRole(roleCode: string): void {
    const current = [...this.editForm.roles];
    const normalized = roleCode.toUpperCase();
    const index = current.indexOf(normalized);
    if (index >= 0) {
      current.splice(index, 1);
    } else {
      current.push(normalized);
    }
    this.editForm = { ...this.editForm, roles: current };
  }

  protected hasEditRole(roleCode: string): boolean {
    return this.editForm.roles.includes(roleCode.toUpperCase());
  }

  protected saveEditedUser(): void {
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

    if (!this.editForm.id || !this.editForm.nombres.trim()) {
      this.errorMessage.set('Completa los datos obligatorios para editar.');
      return;
    }

    if (!this.editForm.roles.length) {
      this.errorMessage.set('El usuario debe tener al menos un rol.');
      return;
    }
    if (this.sucursales().length > 0 && !this.editForm.sucursalIds.length) {
      this.errorMessage.set('El usuario debe tener al menos una sucursal asignada.');
      return;
    }

    this.saving.set(true);
    this.api
      .updateUsuario(
        this.editForm.id,
        {
          nombres: this.editForm.nombres.trim(),
          email: this.editForm.email.trim() || null,
          activo: this.editForm.activo,
          sucursalIds: this.editForm.sucursalIds,
        },
        { tenantId },
      )
      .pipe(
        concatMap(() =>
          this.api.syncUsuarioRoles(
            this.editForm.id!,
            {
              rolCodigos: this.editForm.roles.map((role) => role.toUpperCase()),
            },
            { tenantId },
          ),
        ),
      )
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set(`Usuario ${this.editForm.username} actualizado.`);
          this.editDialogVisible.set(false);
          this.load();
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected toggleUsuarioActivo(user: UsuarioTenant): void {
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

    this.saving.set(true);
    this.api
      .updateUsuario(
        user.id,
        {
          nombres: user.nombres,
          email: user.email,
          activo: !user.activo,
          sucursalIds: user.sucursales.map((sucursal) => sucursal.id),
        },
        { tenantId },
      )
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set(
            `Usuario ${user.username} ${user.activo ? 'inhabilitado' : 'habilitado'} correctamente.`,
          );
          this.load();
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected deleteUsuario(user: UsuarioTenant): void {
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

    const confirmed = globalThis.confirm(
      `Se eliminara el usuario ${user.username}. Deseas continuar?`,
    );
    if (!confirmed) {
      return;
    }

    this.saving.set(true);
    this.api
      .deleteUsuario(user.id, { tenantId })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set(`Usuario ${user.username} eliminado correctamente.`);
          this.load();
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected canOperateInTenant(): boolean {
    const tenantId = this.resolveTargetTenant();
    if (!tenantId) {
      return false;
    }

    if (!this.isGeneralAdmin()) {
      return true;
    }

    return this.empresas().some((empresa) => empresa.tenantId === tenantId);
  }

  protected toggleRole(roleCode: string): void {
    const current = [...this.form.roles];
    const normalized = roleCode.toUpperCase();
    const index = current.indexOf(normalized);
    if (index >= 0) {
      current.splice(index, 1);
    } else {
      current.push(normalized);
    }
    this.form.roles = current;
  }

  protected hasRole(roleCode: string): boolean {
    return this.form.roles.includes(roleCode.toUpperCase());
  }

  protected createRole(): void {
    if (this.creatingRole()) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);

    const tenantId = this.resolveTargetTenant();
    if (!tenantId) {
      this.errorMessage.set('Selecciona un tenant para crear roles.');
      return;
    }

    if (!this.rolForm.nombre.trim()) {
      this.errorMessage.set('Completa el nombre del rol.');
      return;
    }

    const generatedCode = this.rolForm.codigo.trim() || this.buildRoleCode(this.rolForm.nombre);
    if (!generatedCode) {
      this.errorMessage.set('No se pudo generar el codigo del rol.');
      return;
    }

    this.creatingRole.set(true);
    this.api
      .createRol(
        {
          codigo: generatedCode,
          nombre: this.rolForm.nombre.trim(),
          descripcion: this.rolForm.descripcion.trim() || null,
          ambito:
            this.session.hasModule('CRM') && !this.session.hasModule('ERP') ? 'CRM' : 'ERP',
        },
        { tenantId },
      )
      .pipe(finalize(() => this.creatingRole.set(false)))
      .subscribe({
        next: (role) => {
          this.successMessage.set(`Rol ${role.codigo} creado y disponible para asignacion.`);
          this.rolForm = {
            codigo: '',
            nombre: '',
            descripcion: '',
            deleteRoleId: this.rolForm.deleteRoleId,
          };
          this.loadRoles();
          this.toggleRole(role.codigo);
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected deleteRole(): void {
    if (this.creatingRole()) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);

    const tenantId = this.resolveTargetTenant();
    if (!tenantId) {
      this.errorMessage.set('Selecciona un tenant para eliminar roles.');
      return;
    }

    const roleId = this.rolForm.deleteRoleId;
    if (!roleId) {
      this.errorMessage.set('Selecciona un rol para eliminar.');
      return;
    }

    const role = this.roles().find((item) => item.id === roleId);
    if (!role) {
      this.errorMessage.set('El rol seleccionado ya no existe.');
      return;
    }

    this.creatingRole.set(true);
    this.api
      .deleteRol(roleId, { tenantId })
      .pipe(finalize(() => this.creatingRole.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set(`Rol ${role.codigo} eliminado.`);
          this.form.roles = this.form.roles.filter((code) => code !== role.codigo);
          this.rolForm.deleteRoleId = null;
          this.loadRoles();
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected suggestRoleCodeFromName(): void {
    if (this.rolForm.codigo.trim()) {
      return;
    }
    this.rolForm.codigo = this.buildRoleCode(this.rolForm.nombre);
  }

  protected sanitizeRoleCode(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }
    const normalized = this.buildRoleCode(input.value);
    input.value = normalized;
    this.rolForm.codigo = normalized;
  }

  private resolveTargetTenant(): string | null {
    if (this.isGeneralAdmin()) {
      return this.form.tenantId.trim() || null;
    }

    return this.session.currentSession()?.tenantId || null;
  }

  private resolveError(error: unknown): string {
    if (typeof error === 'object' && error !== null) {
      const httpError = error as {
        status?: number;
        error?: { message?: string; details?: string[] };
      };
      if (httpError.status === 403) {
        return 'Tu usuario no tiene permisos para esta accion. Solicita al administrador general el rol ADMIN_EMPRESA para tu tenant.';
      }

      if (!('error' in httpError)) {
        return 'No se pudo completar la operacion.';
      }

      const apiError = httpError.error;
      return apiError?.details?.[0] || apiError?.message || 'No se pudo completar la operacion.';
    }
    return 'No se pudo completar la operacion.';
  }

  private buildRoleCode(value: string): string {
    const base = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_')
      .slice(0, 40);

    if (!base) {
      return '';
    }

    return /^[A-Z]/.test(base) ? base : `ROL_${base}`;
  }

  private loadRoles(): void {
    const tenantId = this.resolveTargetTenant();
    if (!tenantId) {
      this.roles.set([]);
      return;
    }

    this.loadingRoles.set(true);
    this.api
      .listRoles({ tenantId })
      .pipe(finalize(() => this.loadingRoles.set(false)))
      .subscribe({
        next: (items) => this.roles.set(items),
        error: (error: unknown) => {
          this.roles.set([]);
          this.errorMessage.set(this.resolveError(error));
        },
      });
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
          const hasCurrentTenant = items.some((empresa) => empresa.tenantId === currentTenant);
          if (!hasCurrentTenant) {
            this.form.tenantId = items[0]?.tenantId ?? '';
          }
          this.load();
          this.loadRoles();
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.resolveError(error));
          this.usuarios.set([]);
        },
      });
  }
}
