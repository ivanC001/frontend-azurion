import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { finalize, switchMap } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { AuthSessionService } from '@core/auth/auth-session.service';
import {
  AdminSaasApiService,
  Empresa,
  Permiso,
  Rol,
  RoleScope,
} from '@features/admin/data/admin-saas-api.service';

interface RolForm {
  codigo: string;
  nombre: string;
  descripcion: string;
  ambito: Exclude<RoleScope, 'MIXED'>;
  templateCode: string | null;
}

interface PermisoForm {
  codigo: string;
  nombre: string;
  modulo: string;
  descripcion: string;
}

interface RoleTemplate {
  readonly code: string;
  readonly label: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly descripcion: string;
  readonly ambito: Exclude<RoleScope, 'MIXED'>;
  readonly permisoCodigos: readonly string[];
}

interface PermissionGroup {
  readonly modulo: string;
  readonly permisos: Permiso[];
}

type PermissionAction = 'read' | 'create' | 'update' | 'delete' | 'special';

interface PermissionMatrixRow {
  readonly modulo: string;
  readonly label: string;
  readonly permissionsByAction: Readonly<Record<PermissionAction, Permiso[]>>;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-company-roles-permissions-page',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    TableModule,
    TagModule,
  ],
  templateUrl: './company-roles-permissions-page.html',
  styleUrl: './company-roles-permissions-page.scss',
})
export class CompanyRolesPermissionsPage {
  private readonly api = inject(AdminSaasApiService);
  private readonly session = inject(AuthSessionService);
  private readonly route = inject(ActivatedRoute);

  protected readonly loading = signal(false);
  protected readonly loadingEmpresas = signal(false);
  protected readonly saving = signal(false);
  protected readonly roleDialogVisible = signal(false);
  protected readonly roles = signal<Rol[]>([]);
  protected readonly permisos = signal<Permiso[]>([]);
  protected readonly empresas = signal<Empresa[]>([]);
  protected readonly selectedTenantId = signal(this.session.currentSession()?.tenantId ?? '');
  protected readonly selectedRolId = signal<number | null>(null);
  protected readonly deleteRolId = signal<number | null>(null);
  protected readonly deletePermisoId = signal<number | null>(null);
  protected readonly createRolePermissionIds = signal<number[]>([]);
  protected readonly createRoleScope = signal<Exclude<RoleScope, 'MIXED'>>('ERP');
  protected readonly selectedRolePermissionIds = signal<number[]>([]);
  protected readonly permissionSearch = signal('');
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly matrixActions: readonly PermissionAction[] = [
    'read',
    'create',
    'update',
    'delete',
    'special',
  ];

  protected rolForm: RolForm = {
    codigo: '',
    nombre: '',
    descripcion: '',
    ambito: 'ERP',
    templateCode: null,
  };

  protected permisoForm: PermisoForm = {
    codigo: '',
    nombre: '',
    modulo: '',
    descripcion: '',
  };

  protected readonly templates: readonly RoleTemplate[] = [
    {
      code: 'ADMIN_OPERATIVO',
      label: 'Administrador operativo',
      codigo: 'SUPERVISOR_OPERATIVO',
      nombre: 'Supervisor operativo',
      descripcion: 'Controla configuracion, inventario, clientes y caja sin tocar seguridad base.',
      ambito: 'ERP',
      permisoCodigos: [
        'VENTAS_READ',
        'VENTAS_CANCEL',
        'VENTAS_VIEW_MARGIN',
        'CAJA_READ',
        'CAJA_VIEW_OTHERS',
        'PRODUCTOS_READ',
        'INVENTORY_READ',
        'CLIENTES_READ',
        'CLIENTES_VIEW_DEBT',
        'SUCURSALES_READ',
        'REPORTES_READ',
      ],
    },
    {
      code: 'CAJA',
      label: 'Caja y ventas mostrador',
      codigo: 'CAJA_VENTAS',
      nombre: 'Caja y ventas',
      descripcion: 'Atiende caja, clientes y operaciones de punto de venta.',
      ambito: 'ERP',
      permisoCodigos: [
        'VENTAS_READ',
        'VENTAS_CREATE',
        'VENTAS_REPRINT_TICKET',
        'CAJA_READ',
        'CAJA_OPEN',
        'CAJA_CLOSE',
        'CAJA_MOVEMENT_CREATE',
        'CAJA_DEPOSIT',
        'CLIENTES_READ',
        'PRODUCTOS_READ',
        'INVENTORY_READ',
      ],
    },
    {
      code: 'INVENTARIO',
      label: 'Inventario y almacenes',
      codigo: 'INVENTARIO_OPERATIVO',
      nombre: 'Inventario operativo',
      descripcion: 'Gestiona productos, movimientos, stock y consultas de inventario.',
      ambito: 'ERP',
      permisoCodigos: [
        'PRODUCTOS_READ',
        'INVENTORY_READ',
        'INVENTORY_ENTRY',
        'INVENTORY_EXIT',
        'INVENTORY_ADJUST',
        'INVENTORY_TRANSFER',
        'INVENTORY_VIEW_COST',
        'INVENTORY_MANAGE_LOTS',
      ],
    },
    {
      code: 'CONSULTA',
      label: 'Solo consulta',
      codigo: 'CONSULTA_GENERAL',
      nombre: 'Consulta general',
      descripcion: 'Consulta informacion operativa sin registrar cambios.',
      ambito: 'ERP',
      permisoCodigos: [
        'VENTAS_READ',
        'CAJA_READ',
        'PRODUCTOS_READ',
        'INVENTORY_READ',
        'CLIENTES_READ',
        'FACTURACION_READ',
        'SUCURSALES_READ',
        'REPORTES_READ',
      ],
    },
  ];

  protected readonly selectedRol = computed(() => {
    const id = this.selectedRolId();
    if (!id) {
      return null;
    }
    return this.roles().find((rol) => rol.id === id) ?? null;
  });
  protected readonly platformMode = this.route.snapshot.data['securityScope'] === 'platform';
  protected readonly pageTitle = this.platformMode
    ? 'Seguridad de plataforma'
    : 'Seguridad de empresa';
  protected readonly pageDescription = this.platformMode
    ? 'Administra los roles y permisos de cada empresa desde un espacio separado de la operacion tenant.'
    : 'Administra los perfiles de trabajo y accesos internos de tu empresa.';
  protected readonly canWriteRoles = computed(
    () => this.platformMode || this.session.hasPermission('ROLES_WRITE'),
  );
  protected readonly tenantOptions = computed(() =>
    this.empresas().map((empresa) => ({
      label: `${empresa.razonSocial} (${empresa.tenantId})`,
      value: empresa.tenantId,
    })),
  );
  protected readonly selectedEmpresa = computed(() => {
    const tenantId = this.selectedTenantId().trim();
    if (!tenantId) {
      return null;
    }
    return this.empresas().find((empresa) => empresa.tenantId === tenantId) ?? null;
  });

  protected readonly sortedRoles = computed(() =>
    [...this.roles()].sort((a, b) => {
      if (a.sistema !== b.sistema) {
        return a.sistema ? -1 : 1;
      }
      return a.nombre.localeCompare(b.nombre);
    }),
  );

  protected readonly sortedPermisos = computed(() =>
    [...this.permisos()].sort((a, b) => {
      const moduleCompare = (a.modulo || 'GENERAL').localeCompare(b.modulo || 'GENERAL');
      return moduleCompare !== 0 ? moduleCompare : a.nombre.localeCompare(b.nombre);
    }),
  );

  protected readonly roleOptions = computed(() =>
    this.sortedRoles().map((rol) => ({
      label: `${rol.codigo} · ${rol.nombre}`,
      value: rol.id,
    })),
  );

  protected readonly deleteRoleOptions = computed(() =>
    this.sortedRoles()
      .filter((rol) => rol.eliminable)
      .map((rol) => ({
        label: `${rol.codigo} · ${rol.nombre}`,
        value: rol.id,
      })),
  );

  protected readonly deletePermissionOptions = computed(() =>
    this.sortedPermisos()
      .filter((permiso) => permiso.eliminable)
      .map((permiso) => ({
        label: `${permiso.codigo} · ${permiso.nombre}`,
        value: permiso.id,
      })),
  );

  protected readonly templateOptions = computed(() =>
    this.templates.map((template) => ({
      label: template.label,
      value: template.code,
    })),
  );

  protected readonly scopeOptions = [
    { label: 'ERP', value: 'ERP' },
    { label: 'CRM', value: 'CRM' },
    { label: 'Gobierno del tenant', value: 'TENANT' },
    { label: 'Compartido: clientes y cotizaciones', value: 'SHARED' },
  ] satisfies { label: string; value: Exclude<RoleScope, 'MIXED'> }[];

  protected readonly createPermissionGroups = computed(() =>
    this.groupPermissions(
      this.sortedPermisos().filter((permission) =>
        this.isPermissionInScope(this.createRoleScope(), permission.modulo),
      ),
    ),
  );
  protected readonly selectedRolePermissionGroups = computed(() =>
    this.groupPermissions(
      this.sortedPermisos().filter((permission) =>
        this.isPermissionInScope(this.selectedRol()?.ambito ?? 'MIXED', permission.modulo),
      ),
    ),
  );
  protected readonly visibleSelectedRolePermissionGroups = computed(() => {
    const query = this.permissionSearch().trim().toLowerCase();
    if (!query) {
      return this.selectedRolePermissionGroups();
    }
    return this.groupPermissions(
      this.sortedPermisos().filter(
        (permiso) =>
          permiso.codigo.toLowerCase().includes(query) ||
          permiso.nombre.toLowerCase().includes(query) ||
          (permiso.modulo || '').toLowerCase().includes(query),
      ),
    );
  });
  protected readonly permissionMatrix = computed<PermissionMatrixRow[]>(() => {
    const query = this.permissionSearch().trim().toLowerCase();
    const rows = this.selectedRolePermissionGroups().map((group) => {
      const permissionsByAction: Record<PermissionAction, Permiso[]> = {
        read: [],
        create: [],
        update: [],
        delete: [],
        special: [],
      };
      for (const permiso of group.permisos) {
        permissionsByAction[this.resolvePermissionAction(permiso.codigo)].push(permiso);
      }
      return {
        modulo: group.modulo,
        label: this.moduleLabel(group.modulo),
        permissionsByAction,
      };
    });

    if (!query) {
      return rows;
    }
    return rows.filter(
      (row) =>
        row.label.toLowerCase().includes(query) ||
        row.modulo.toLowerCase().includes(query) ||
        Object.values(row.permissionsByAction)
          .flat()
          .some(
            (permission) =>
              permission.codigo.toLowerCase().includes(query) ||
              permission.nombre.toLowerCase().includes(query),
          ),
    );
  });
  protected readonly customRolesCount = computed(
    () => this.roles().filter((rol) => !rol.sistema).length,
  );
  protected readonly systemRolesCount = computed(
    () => this.roles().filter((rol) => rol.sistema).length,
  );
  protected readonly erpRolesCount = computed(
    () => this.roles().filter((rol) => rol.ambito === 'ERP' && !rol.deprecated).length,
  );
  protected readonly crmRolesCount = computed(
    () => this.roles().filter((rol) => rol.ambito === 'CRM' && !rol.deprecated).length,
  );
  protected readonly customPermissionsCount = computed(
    () => this.permisos().filter((permiso) => !permiso.sistema).length,
  );

  constructor() {
    if (this.platformMode) {
      this.loadEmpresas();
      return;
    }
    this.load();
  }

  protected load(): void {
    const tenantId = this.resolveTenantId();
    if (!tenantId) {
      this.roles.set([]);
      this.permisos.set([]);
      this.selectedRolId.set(null);
      this.loading.set(false);
      this.errorMessage.set('Selecciona una empresa para administrar roles y permisos.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    forkJoin({
      roles: this.api.listRoles({ tenantId }),
      permisos: this.api.listPermisos({ tenantId }),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ roles, permisos }) => {
          this.roles.set(roles);
          this.permisos.set(permisos);

          const currentRoleId = this.selectedRolId();
          if (!currentRoleId || !roles.some((rol) => rol.id === currentRoleId)) {
            this.selectedRolId.set(roles[0]?.id ?? null);
          }
          this.refreshSelectedRolePermissions();

          if (this.deleteRolId() && !roles.some((rol) => rol.id === this.deleteRolId())) {
            this.deleteRolId.set(null);
          }
          if (
            this.deletePermisoId() &&
            !permisos.some((permiso) => permiso.id === this.deletePermisoId())
          ) {
            this.deletePermisoId.set(null);
          }
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected onRolSelectionChange(roleId: number | null): void {
    this.selectedRolId.set(roleId);
    this.refreshSelectedRolePermissions();
    this.successMessage.set(null);
  }

  protected onTenantChange(tenantId: string | null): void {
    this.selectedTenantId.set(tenantId ?? '');
    this.deleteRolId.set(null);
    this.deletePermisoId.set(null);
    this.createRolePermissionIds.set([]);
    this.selectedRolePermissionIds.set([]);
    this.successMessage.set(null);
    this.load();
  }

  protected applyTemplate(templateCode: string | null): void {
    this.rolForm.templateCode = templateCode;
    if (!templateCode) {
      return;
    }

    const template = this.templates.find((item) => item.code === templateCode);
    if (!template) {
      return;
    }

    this.rolForm = {
      codigo: template.codigo,
      nombre: template.nombre,
      descripcion: template.descripcion,
      ambito: template.ambito,
      templateCode,
    };
    this.createRoleScope.set(template.ambito);
    this.createRolePermissionIds.set(this.resolvePermissionIds(template.permisoCodigos));
  }

  protected createRol(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (!this.rolForm.nombre.trim()) {
      this.errorMessage.set('Completa el nombre del rol.');
      return;
    }

    const tenantId = this.resolveTenantId();
    if (!tenantId) {
      this.errorMessage.set('Selecciona una empresa para crear roles.');
      return;
    }

    const generatedCode =
      this.rolForm.codigo.trim() || this.buildIdentifier(this.rolForm.nombre, true);
    if (!generatedCode) {
      this.errorMessage.set('No se pudo generar el codigo del rol.');
      return;
    }

    const permisoIds = [...this.createRolePermissionIds()];
    this.saving.set(true);
    this.api
      .createRol(
        {
          codigo: generatedCode,
          nombre: this.rolForm.nombre.trim(),
          descripcion: this.rolForm.descripcion.trim() || null,
          ambito: this.rolForm.ambito,
        },
        { tenantId },
      )
      .pipe(
        switchMap((role) =>
          permisoIds.length
            ? this.api.syncRolPermisos(role.id, permisoIds, { tenantId })
            : of(role),
        ),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: (role) => {
          this.successMessage.set(`Rol ${role.codigo} listo para asignar usuarios.`);
          this.roleDialogVisible.set(false);
          this.resetRoleForm();
          this.createRolePermissionIds.set([]);
          this.selectedRolId.set(role.id);
          this.load();
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected createPermiso(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (
      !this.permisoForm.codigo.trim() ||
      !this.permisoForm.nombre.trim() ||
      !this.permisoForm.modulo.trim()
    ) {
      this.errorMessage.set('Completa codigo, nombre y modulo del permiso.');
      return;
    }

    const tenantId = this.resolveTenantId();
    if (!tenantId) {
      this.errorMessage.set('Selecciona una empresa para crear permisos.');
      return;
    }

    this.saving.set(true);
    this.api
      .createPermiso(
        {
          codigo: this.buildIdentifier(this.permisoForm.codigo),
          nombre: this.permisoForm.nombre.trim(),
          modulo: this.buildIdentifier(this.permisoForm.modulo),
          descripcion: this.permisoForm.descripcion.trim() || null,
        },
        { tenantId },
      )
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (permiso) => {
          this.successMessage.set(`Permiso ${permiso.codigo} creado y disponible para roles.`);
          this.permisoForm = { codigo: '', nombre: '', modulo: '', descripcion: '' };
          this.load();
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected deleteRol(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const rolId = this.deleteRolId();
    if (!rolId) {
      this.errorMessage.set('Selecciona un rol personalizado para eliminar.');
      return;
    }

    const role = this.roles().find((item) => item.id === rolId);
    if (!role?.eliminable) {
      this.errorMessage.set('Ese rol base no se puede eliminar.');
      return;
    }

    const tenantId = this.resolveTenantId();
    if (!tenantId) {
      this.errorMessage.set('Selecciona una empresa para eliminar roles.');
      return;
    }

    if (!globalThis.confirm(`Se eliminara el rol ${role.codigo}. Deseas continuar?`)) {
      return;
    }

    this.saving.set(true);
    this.api
      .deleteRol(rolId, { tenantId })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set(`Rol ${role.codigo} eliminado.`);
          this.deleteRolId.set(null);
          this.load();
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected deletePermiso(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const permisoId = this.deletePermisoId();
    if (!permisoId) {
      this.errorMessage.set('Selecciona un permiso personalizado para eliminar.');
      return;
    }

    const permiso = this.permisos().find((item) => item.id === permisoId);
    if (!permiso?.eliminable) {
      this.errorMessage.set('Ese permiso base no se puede eliminar.');
      return;
    }

    const tenantId = this.resolveTenantId();
    if (!tenantId) {
      this.errorMessage.set('Selecciona una empresa para eliminar permisos.');
      return;
    }

    if (!globalThis.confirm(`Se eliminara el permiso ${permiso.codigo}. Deseas continuar?`)) {
      return;
    }

    this.saving.set(true);
    this.api
      .deletePermiso(permisoId, { tenantId })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set(`Permiso ${permiso.codigo} eliminado.`);
          this.deletePermisoId.set(null);
          this.load();
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected saveSelectedRolePermissions(): void {
    const rol = this.selectedRol();
    if (!rol) {
      this.errorMessage.set('Selecciona un rol para guardar permisos.');
      return;
    }

    const tenantId = this.resolveTenantId();
    if (!tenantId) {
      this.errorMessage.set('Selecciona una empresa para guardar permisos.');
      return;
    }

    if (!rol.gestionaPermisos) {
      this.errorMessage.set(
        'Los roles administrativos del sistema mantienen permisos automaticos.',
      );
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.saving.set(true);
    this.api
      .syncRolPermisos(rol.id, this.selectedRolePermissionIds(), { tenantId })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (savedRole) => {
          this.successMessage.set(`Permisos actualizados para ${savedRole.codigo}.`);
          this.selectedRolId.set(savedRole.id);
          this.load();
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected toggleCreatePermission(permisoId: number): void {
    this.createRolePermissionIds.set(this.toggleId(this.createRolePermissionIds, permisoId));
  }

  protected openRoleDialog(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.resetRoleForm();
    this.createRolePermissionIds.set([]);
    this.roleDialogVisible.set(true);
  }

  protected hasCreatePermission(permisoId: number): boolean {
    return this.createRolePermissionIds().includes(permisoId);
  }

  protected toggleSelectedRolePermission(permisoId: number): void {
    const rol = this.selectedRol();
    if (!rol?.gestionaPermisos || !this.canWriteRoles()) {
      return;
    }
    this.selectedRolePermissionIds.set(this.toggleId(this.selectedRolePermissionIds, permisoId));
  }

  protected hasSelectedRolePermission(permisoId: number): boolean {
    return this.selectedRolePermissionIds().includes(permisoId);
  }

  protected setAllSelectedRolePermissions(selected: boolean): void {
    const rol = this.selectedRol();
    if (!this.canWriteRoles() || !rol?.gestionaPermisos) {
      return;
    }
    this.selectedRolePermissionIds.set(
      selected
        ? this.selectedRolePermissionGroups().flatMap((group) =>
            group.permisos.map((permiso) => permiso.id),
          )
        : [],
    );
  }

  protected togglePermissionCell(row: PermissionMatrixRow, action: PermissionAction): void {
    const rol = this.selectedRol();
    if (!this.canWriteRoles() || !rol?.gestionaPermisos) {
      return;
    }
    const ids = row.permissionsByAction[action].map((permission) => permission.id);
    if (!ids.length) {
      return;
    }
    const current = new Set(this.selectedRolePermissionIds());
    const shouldSelect = !ids.every((id) => current.has(id));
    ids.forEach((id) => (shouldSelect ? current.add(id) : current.delete(id)));
    this.selectedRolePermissionIds.set([...current].sort((a, b) => a - b));
  }

  protected permissionCellState(
    row: PermissionMatrixRow,
    action: PermissionAction,
  ): 'checked' | 'partial' | 'unchecked' | 'empty' {
    const ids = row.permissionsByAction[action].map((permission) => permission.id);
    if (!ids.length) {
      return 'empty';
    }
    const selectedCount = ids.filter((id) => this.selectedRolePermissionIds().includes(id)).length;
    if (selectedCount === ids.length) {
      return 'checked';
    }
    return selectedCount > 0 ? 'partial' : 'unchecked';
  }

  protected permissionCellTitle(row: PermissionMatrixRow, action: PermissionAction): string {
    return row.permissionsByAction[action].map((permission) => permission.nombre).join(', ');
  }

  protected permissionCellCount(row: PermissionMatrixRow, action: PermissionAction): number {
    return row.permissionsByAction[action].length;
  }

  protected suggestRoleCodeFromName(): void {
    if (this.rolForm.codigo.trim()) {
      return;
    }
    this.rolForm.codigo = this.buildIdentifier(this.rolForm.nombre, true);
  }

  protected sanitizeRoleCode(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }
    const normalized = this.buildIdentifier(input.value, true);
    input.value = normalized;
    this.rolForm.codigo = normalized;
  }

  protected sanitizePermissionCode(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }
    const normalized = this.buildIdentifier(input.value);
    input.value = normalized;
    this.permisoForm.codigo = normalized;
  }

  protected sanitizePermissionModule(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }
    const normalized = this.buildIdentifier(input.value);
    input.value = normalized;
    this.permisoForm.modulo = normalized;
  }

  protected roleSeverity(rol: Rol): 'contrast' | 'info' {
    return rol.sistema ? 'contrast' : 'info';
  }

  protected permissionSeverity(permiso: Permiso): 'contrast' | 'success' {
    return permiso.sistema ? 'contrast' : 'success';
  }

  protected onRoleScopeChange(scope: Exclude<RoleScope, 'MIXED'>): void {
    this.rolForm.ambito = scope;
    this.createRoleScope.set(scope);
    this.rolForm.templateCode = null;
    const allowedIds = new Set(
      this.sortedPermisos()
        .filter((permission) => this.isPermissionInScope(scope, permission.modulo))
        .map((permission) => permission.id),
    );
    this.createRolePermissionIds.set(
      this.createRolePermissionIds().filter((permissionId) => allowedIds.has(permissionId)),
    );
  }

  protected roleScopeLabel(role: Rol): string {
    if (role.ambito === 'TENANT') return 'Tenant';
    if (role.ambito === 'SHARED') return 'Compartido';
    if (role.ambito === 'MIXED') return 'Legado mixto';
    return role.ambito;
  }

  private refreshSelectedRolePermissions(): void {
    const role = this.selectedRol();
    this.selectedRolePermissionIds.set(role ? role.permisos.map((item) => item.id) : []);
  }

  private resolveTenantId(): string | null {
    if (this.platformMode) {
      const tenantId = this.selectedTenantId().trim();
      return tenantId || null;
    }

    return this.session.currentSession()?.tenantId ?? null;
  }

  private resolvePermissionIds(permissionCodes: readonly string[]): number[] {
    const codeSet = new Set(permissionCodes);
    return this.sortedPermisos()
      .filter((permiso) => codeSet.has(permiso.codigo))
      .map((permiso) => permiso.id);
  }

  private groupPermissions(permisos: Permiso[]): PermissionGroup[] {
    const grouped = new Map<string, Permiso[]>();
    for (const permiso of permisos) {
      const modulo = permiso.modulo || 'GENERAL';
      const current = grouped.get(modulo) ?? [];
      current.push(permiso);
      grouped.set(modulo, current);
    }

    return [...grouped.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([modulo, items]) => ({
        modulo,
        permisos: [...items].sort((a, b) => a.nombre.localeCompare(b.nombre)),
      }));
  }

  private isPermissionInScope(scope: RoleScope, moduleValue: string | null): boolean {
    if (scope === 'MIXED') {
      return true;
    }
    const module = (moduleValue || 'GENERAL').toUpperCase();
    if (scope === 'TENANT') {
      return ['GENERAL', 'SEGURIDAD', 'CONFIGURACION', 'SUCURSALES', 'SAAS_CORE', 'AUDITORIA'].includes(module);
    }
    if (scope === 'CRM') {
      return ['CRM', 'CLIENTES', 'COTIZACIONES'].includes(module);
    }
    if (scope === 'SHARED') {
      return ['CLIENTES', 'COTIZACIONES'].includes(module);
    }
    return module !== 'CRM';
  }

  private resetRoleForm(): void {
    this.rolForm = {
      codigo: '',
      nombre: '',
      descripcion: '',
      ambito: 'ERP',
      templateCode: null,
    };
    this.createRoleScope.set('ERP');
  }

  private resolvePermissionAction(code: string): PermissionAction {
    if (/(READ|VIEW|DOWNLOAD)/.test(code)) {
      return 'read';
    }
    if (/(CREATE|EMIT|OPEN|ENTRY|REGISTER_PAYMENT)/.test(code)) {
      return 'create';
    }
    if (/(DELETE|CANCEL|CLOSE|WITHDRAW)/.test(code)) {
      return 'delete';
    }
    if (/(WRITE|UPDATE|ADJUST|MOVEMENT|DEPOSIT|REOPEN|CHANGE|RETRY)/.test(code)) {
      return 'update';
    }
    return 'special';
  }

  private moduleLabel(module: string): string {
    const labels: Record<string, string> = {
      AUDITORIA: 'Auditoria',
      CAJA: 'Caja',
      CLIENTES: 'Clientes',
      CONFIGURACION: 'Configuracion',
      FACTURACION: 'Facturacion',
      INVENTORY: 'Inventario y productos',
      REPORTES: 'Reportes',
      SAAS_CORE: 'Empresa',
      SEGURIDAD: 'Usuarios y seguridad',
      VENTAS: 'Ventas',
    };
    return labels[module] ?? module.replaceAll('_', ' ');
  }

  private toggleId(source: () => number[], id: number): number[] {
    const next = [...source()];
    const index = next.indexOf(id);
    if (index >= 0) {
      next.splice(index, 1);
    } else {
      next.push(id);
    }
    return next.sort((a, b) => a - b);
  }

  private buildIdentifier(value: string, prefixWhenNeeded = false): string {
    const base = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_')
      .slice(0, 80);

    if (!base) {
      return '';
    }

    return prefixWhenNeeded && !/^[A-Z]/.test(base) ? `ROL_${base}` : base;
  }

  private resolveError(error: unknown): string {
    if (typeof error === 'object' && error !== null) {
      const httpError = error as {
        status?: number;
        error?: { message?: string; details?: string[] };
      };
      if (httpError.status === 403) {
        return 'Tu usuario no tiene permisos para administrar seguridad en este tenant.';
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
          const currentTenant = this.selectedTenantId().trim();
          if (!currentTenant || !items.some((empresa) => empresa.tenantId === currentTenant)) {
            this.selectedTenantId.set(items[0]?.tenantId ?? '');
          }
          this.load();
        },
        error: (error: unknown) => {
          this.roles.set([]);
          this.permisos.set([]);
          this.errorMessage.set(this.resolveError(error));
        },
      });
  }
}
