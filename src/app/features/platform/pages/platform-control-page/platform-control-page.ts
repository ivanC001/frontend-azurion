import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import {
  AdminSaasApiService,
  Empresa,
  EmpresaModulo,
  ModuloGlobal,
  Plan,
  Suscripcion,
  UsuarioTenant,
} from '@features/admin/data/admin-saas-api.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-platform-control-page',
  imports: [FormsModule, ButtonModule, InputTextModule, SelectModule, TableModule, TagModule],
  templateUrl: './platform-control-page.html',
  styleUrl: './platform-control-page.scss',
})
export class PlatformControlPage {
  private readonly api = inject(AdminSaasApiService);
  private readonly route = inject(ActivatedRoute);
  private requestedEmpresaId = Number(this.route.snapshot.queryParamMap.get('empresaId')) || null;

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly empresas = signal<Empresa[]>([]);
  protected readonly modulos = signal<ModuloGlobal[]>([]);
  protected readonly planes = signal<Plan[]>([]);
  protected readonly suscripciones = signal<Suscripcion[]>([]);
  protected readonly usuariosTenant = signal<UsuarioTenant[]>([]);
  protected readonly empresaModulos = signal<EmpresaModulo[]>([]);
  protected readonly selectedEmpresaId = signal<number | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly rolesInputByUser = signal<Record<number, string>>({});
  protected readonly moduleDraft = signal<Record<string, boolean>>({});
  protected readonly subscriptionPlanId = signal<number | null>(null);
  protected customUserLimitEnabled = false;
  protected subscriptionUserLimit = 1;

  protected readonly selectedEmpresa = computed(() => {
    const empresaId = this.selectedEmpresaId();
    if (!empresaId) {
      return null;
    }
    return this.empresas().find((empresa) => empresa.id === empresaId) ?? null;
  });

  protected readonly selectedSubscription = computed(() => {
    const empresaId = this.selectedEmpresaId();
    if (!empresaId) {
      return null;
    }
    const subscriptions = this.suscripciones()
      .filter((item) => item.empresaId === empresaId)
      .sort((left, right) => right.id - left.id);
    return (
      subscriptions.find((item) => item.estado.toUpperCase() === 'ACTIVA') ??
      subscriptions[0] ??
      null
    );
  });

  protected readonly selectedPlan = computed(() =>
    this.planes().find((plan) => plan.id === this.subscriptionPlanId()) ?? null,
  );

  protected readonly planOptions = computed(() => {
    const currentPlanId = this.selectedSubscription()?.planId;
    return this.planes()
      .filter(
        (plan) =>
          plan.estado.toUpperCase() === 'ACTIVO' || plan.id === currentPlanId,
      )
      .map((plan) => ({
        label: `${plan.nombre} · ${plan.limiteUsuarios} usuarios · S/ ${Number(plan.precioMensual).toFixed(2)}`,
        value: plan.id,
      }));
  });

  protected readonly activeTenantUsers = computed(
    () => this.usuariosTenant().filter((user) => user.activo).length,
  );

  protected readonly empresaOptions = computed(() =>
    this.empresas().map((empresa) => ({
      label: `${empresa.razonSocial} (${empresa.ruc})`,
      value: empresa.id,
    })),
  );

  protected readonly activeModuleCount = computed(
    () => Object.values(this.moduleDraft()).filter(Boolean).length,
  );
  protected readonly activeCompanies = computed(
    () => this.empresas().filter((empresa) => empresa.activo).length,
  );
  protected readonly activeSubscriptions = computed(
    () => this.suscripciones().filter((item) => item.estado.toUpperCase() === 'ACTIVA').length,
  );
  protected readonly suspendedSubscriptions = computed(
    () => this.suscripciones().filter((item) => item.estado.toUpperCase() === 'SUSPENDIDA').length,
  );

  protected readonly moduleCards = computed(() =>
    this.modulos().map((modulo) => {
      const assigned = this.empresaModulos().find((item) => item.moduloCodigo === modulo.codigo) ?? null;
      return {
        ...modulo,
        activo: this.moduleDraft()[modulo.codigo] ?? assigned?.activo ?? false,
        estado: assigned?.estado ?? 'INACTIVO',
      };
    }),
  );

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    forkJoin({
      empresas: this.api.listEmpresas(),
      modulos: this.api.listModulos(),
      planes: this.api.listPlanes(),
      suscripciones: this.api.listSuscripciones(),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ empresas, modulos, planes, suscripciones }) => {
          this.empresas.set(empresas);
          this.modulos.set(modulos);
          this.planes.set(planes);
          this.suscripciones.set(suscripciones);

          const current = this.selectedEmpresaId();
          const requested = this.requestedEmpresaId;
          if (requested && empresas.some((empresa) => empresa.id === requested)) {
            this.selectedEmpresaId.set(requested);
          } else if (!current || !empresas.some((empresa) => empresa.id === current)) {
            this.selectedEmpresaId.set(empresas[0]?.id ?? null);
          }
          this.requestedEmpresaId = null;
          this.syncSubscriptionDraft();
          this.loadCompanyContext();
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected onEmpresaChange(): void {
    this.successMessage.set(null);
    this.syncSubscriptionDraft();
    this.loadCompanyContext();
  }

  protected onSubscriptionPlanChange(planId: number | null): void {
    this.subscriptionPlanId.set(planId);
    if (!this.customUserLimitEnabled) {
      this.subscriptionUserLimit =
        this.planes().find((plan) => plan.id === planId)?.limiteUsuarios ?? 1;
    }
  }

  protected toggleCustomUserLimit(enabled: boolean): void {
    this.customUserLimitEnabled = enabled;
    if (!enabled) {
      this.subscriptionUserLimit = this.selectedPlan()?.limiteUsuarios ?? 1;
    }
  }

  protected saveSubscriptionPlan(): void {
    const empresa = this.selectedEmpresa();
    const plan = this.selectedPlan();
    const planId = this.subscriptionPlanId();
    if (!empresa || !plan || !planId) {
      this.errorMessage.set('Selecciona una empresa y un plan activo.');
      return;
    }

    const requestedLimit = Math.trunc(Number(this.subscriptionUserLimit));
    if (
      this.customUserLimitEnabled &&
      (!Number.isFinite(requestedLimit) ||
        requestedLimit < 1 ||
        requestedLimit < this.activeTenantUsers())
    ) {
      this.errorMessage.set(
        `El cupo debe ser igual o mayor a los ${this.activeTenantUsers()} usuarios activos.`,
      );
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);
    this.api
      .updateEmpresaSubscriptionPlan(empresa.id, {
        planId,
        limiteUsuarios: this.customUserLimitEnabled ? requestedLimit : null,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (subscription) => {
          this.successMessage.set(
            `Plan ${subscription.planNombre} aplicado con cupo de ${subscription.limiteUsuarios} usuarios.`,
          );
          this.load();
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected toggleCompanyModule(codigo: string, checked: boolean): void {
    this.moduleDraft.set({
      ...this.moduleDraft(),
      [codigo]: checked,
    });
  }

  protected saveModules(): void {
    const empresa = this.selectedEmpresa();
    if (!empresa) {
      return;
    }

    const request = {
      modulos: this.modulos().map((modulo) => {
        const current = this.empresaModulos().find((item) => item.moduloCodigo === modulo.codigo) ?? null;
        const activo = this.moduleDraft()[modulo.codigo] ?? current?.activo ?? false;
        return {
          moduloCodigo: modulo.codigo,
          activo,
          estado: activo ? 'ACTIVO' : 'INACTIVO',
          fechaInicio: activo ? current?.fechaInicio || new Date().toISOString().slice(0, 10) : current?.fechaInicio || null,
          fechaFin: activo ? null : current?.fechaFin || null,
          configuracionExtra: current?.configuracionExtra ?? null,
        };
      }),
    };

    this.saving.set(true);
    this.api
      .syncEmpresaModulos(empresa.id, request)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (modulos) => {
          this.empresaModulos.set(modulos);
          this.moduleDraft.set(this.buildModuleDraft(modulos));
          this.successMessage.set(
            'Modulos actualizados. AZURION aplico las migraciones pendientes para los modulos activos de esta empresa.',
          );
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected updateSubscriptionStatus(estado: string): void {
    const suscripcion = this.selectedSubscription();
    if (!suscripcion) {
      this.errorMessage.set('La empresa seleccionada no tiene suscripcion para actualizar.');
      return;
    }

    this.saving.set(true);
    this.api
      .updateSuscripcionEstado(suscripcion.id, {
        estado,
        fechaFin: estado === 'CANCELADA' ? new Date().toISOString().slice(0, 10) : null,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set(`Suscripcion actualizada a ${estado}.`);
          this.load();
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected toggleUser(user: UsuarioTenant): void {
    const empresa = this.selectedEmpresa();
    if (!empresa) {
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
        },
        { tenantId: empresa.tenantId },
      )
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set(`Usuario ${user.username} actualizado.`);
          this.loadTenantUsers();
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected updateUserRoles(user: UsuarioTenant): void {
    const empresa = this.selectedEmpresa();
    if (!empresa) {
      return;
    }

    const raw = this.rolesInputByUser()[user.id] ?? user.roles.join(', ');
    const rolCodigos = raw
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter((item) => item.length > 0);

    if (!rolCodigos.length) {
      this.errorMessage.set('Debes indicar al menos un rol para sincronizar.');
      return;
    }

    this.saving.set(true);
    this.api
      .syncUsuarioRoles(user.id, { rolCodigos }, { tenantId: empresa.tenantId })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set(`Roles actualizados para ${user.username}.`);
          this.loadTenantUsers();
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected statusSeverity(status: string): 'success' | 'warn' | 'danger' | 'info' {
    const normalized = status.toUpperCase();
    if (normalized === 'ACTIVA') {
      return 'success';
    }
    if (normalized === 'SUSPENDIDA') {
      return 'warn';
    }
    if (normalized === 'CANCELADA') {
      return 'danger';
    }
    return 'info';
  }

  protected userSeverity(active: boolean): 'success' | 'danger' {
    return active ? 'success' : 'danger';
  }

  protected setRolesInput(userId: number, value: string): void {
    this.rolesInputByUser.set({
      ...this.rolesInputByUser(),
      [userId]: value,
    });
  }

  protected moduleIcon(code: string): string {
    const normalized = code.toUpperCase();
    if (normalized === 'CRM') return 'pi-chart-line';
    if (normalized === 'ERP') return 'pi-box';
    if (normalized === 'FACTURACION') return 'pi-receipt';
    if (normalized === 'INVENTARIO') return 'pi-database';
    if (normalized === 'CAJA') return 'pi-credit-card';
    if (normalized === 'VENTAS') return 'pi-shopping-cart';
    if (normalized === 'REPORTES') return 'pi-chart-bar';
    return 'pi-th-large';
  }

  private loadTenantUsers(): void {
    const empresa = this.selectedEmpresa();
    if (!empresa) {
      this.usuariosTenant.set([]);
      return;
    }

    this.loading.set(true);
    this.api
      .listUsuarios({ tenantId: empresa.tenantId })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (users) => {
          this.usuariosTenant.set(users);
          const rolesByUser: Record<number, string> = {};
          for (const user of users) {
            rolesByUser[user.id] = user.roles.join(', ');
          }
          this.rolesInputByUser.set(rolesByUser);
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  private loadCompanyModules(): void {
    const empresa = this.selectedEmpresa();
    if (!empresa) {
      this.empresaModulos.set([]);
      this.moduleDraft.set({});
      return;
    }

    this.api.listEmpresaModulos(empresa.id).subscribe({
      next: (modulos) => {
        this.empresaModulos.set(modulos);
        this.moduleDraft.set(this.buildModuleDraft(modulos));
      },
      error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
    });
  }

  private loadCompanyContext(): void {
    this.loadTenantUsers();
    this.loadCompanyModules();
  }

  private syncSubscriptionDraft(): void {
    const subscription = this.selectedSubscription();
    const fallbackPlan =
      this.planes().find((plan) => plan.estado.toUpperCase() === 'ACTIVO') ?? null;
    const planId = subscription?.planId ?? fallbackPlan?.id ?? null;
    const plan = this.planes().find((item) => item.id === planId) ?? fallbackPlan;

    this.subscriptionPlanId.set(planId);
    this.customUserLimitEnabled =
      subscription?.limiteUsuariosPersonalizado ?? false;
    this.subscriptionUserLimit =
      subscription?.limiteUsuarios ?? plan?.limiteUsuarios ?? 1;
  }

  private buildModuleDraft(modulos: EmpresaModulo[]): Record<string, boolean> {
    const next: Record<string, boolean> = {};
    for (const modulo of modulos) {
      next[modulo.moduloCodigo] = modulo.activo;
    }
    return next;
  }

  private resolveError(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const apiError = (error as { error?: { message?: string; details?: string[] } }).error;
      return apiError?.details?.[0] || apiError?.message || 'No se pudo completar la operacion.';
    }
    return 'No se pudo completar la operacion.';
  }
}
