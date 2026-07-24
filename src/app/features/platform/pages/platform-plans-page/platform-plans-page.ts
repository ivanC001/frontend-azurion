import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import {
  AdminSaasApiService,
  ModuloGlobal,
  Plan,
} from '@features/admin/data/admin-saas-api.service';

interface PlanForm {
  nombre: string;
  codigo: string;
  descripcion: string;
  limiteMensualBolsa: number;
  limiteUsuarios: number;
  precioMensual: number;
  moduloCodigos: string[];
}

interface PlanEditForm {
  nombre: string;
  descripcion: string;
  limiteMensualBolsa: number;
  limiteUsuarios: number;
  precioMensual: number;
  estado: string;
  moduloCodigos: string[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-platform-plans-page',
  imports: [DecimalPipe, FormsModule, ButtonModule, InputTextModule, SelectModule, TableModule, TagModule],
  templateUrl: './platform-plans-page.html',
  styleUrl: './platform-plans-page.scss',
})
export class PlatformPlansPage {
  private readonly api = inject(AdminSaasApiService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly plans = signal<Plan[]>([]);
  protected readonly modules = signal<ModuloGlobal[]>([]);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly editPlanId = signal<number | null>(null);
  protected readonly editForm = signal<PlanEditForm | null>(null);

  protected form: PlanForm = {
    nombre: '',
    codigo: '',
    descripcion: '',
    limiteMensualBolsa: 0,
    limiteUsuarios: 5,
    precioMensual: 0,
    moduloCodigos: [],
  };

  protected readonly activePlans = computed(
    () => this.plans().filter((plan) => plan.estado.toUpperCase() === 'ACTIVO').length,
  );
  protected readonly inactivePlans = computed(
    () => this.plans().filter((plan) => plan.estado.toUpperCase() !== 'ACTIVO').length,
  );
  protected readonly monthlyReference = computed(() =>
    this.plans()
      .filter((plan) => plan.estado.toUpperCase() === 'ACTIVO')
      .reduce((total, plan) => total + Number(plan.precioMensual || 0), 0),
  );

  protected readonly statusOptions = [
    { label: 'Activo', value: 'ACTIVO' },
    { label: 'Suspendido', value: 'SUSPENDIDO' },
    { label: 'Inactivo', value: 'INACTIVO' },
  ];

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    forkJoin({
      plans: this.api.listPlanes(),
      modules: this.api.listModulos(),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ plans, modules }) => {
          this.plans.set(plans);
          this.modules.set(modules);
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected createPlan(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (
      !this.form.nombre.trim() ||
      !this.form.codigo.trim() ||
      !this.form.moduloCodigos.length
    ) {
      this.errorMessage.set('Completa nombre, codigo y al menos un modulo del plan.');
      return;
    }

    if (
      this.form.limiteMensualBolsa < 0 ||
      this.form.limiteUsuarios < 1 ||
      this.form.precioMensual < 0
    ) {
      this.errorMessage.set('El plan requiere al menos un usuario; capacidad y precio no pueden ser negativos.');
      return;
    }

    this.saving.set(true);
    this.api
      .createPlan({
        nombre: this.form.nombre.trim(),
        codigo: this.form.codigo.trim().toUpperCase(),
        descripcion: this.form.descripcion.trim() || null,
        limiteMensualBolsa: Math.trunc(this.form.limiteMensualBolsa),
        limiteUsuarios: Math.trunc(this.form.limiteUsuarios),
        precioMensual: Number(this.form.precioMensual),
        moduloCodigos: [...this.form.moduloCodigos],
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set('Plan creado correctamente.');
          this.form = {
            nombre: '',
            codigo: '',
            descripcion: '',
            limiteMensualBolsa: 0,
            limiteUsuarios: 5,
            precioMensual: 0,
            moduloCodigos: [],
          };
          this.load();
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected startEdit(plan: Plan): void {
    this.editPlanId.set(plan.id);
    this.editForm.set({
      nombre: plan.nombre,
      descripcion: plan.descripcion ?? '',
      limiteMensualBolsa: plan.limiteMensualBolsa,
      limiteUsuarios: plan.limiteUsuarios,
      precioMensual: plan.precioMensual,
      estado: plan.estado,
      moduloCodigos: [...(plan.moduloCodigos ?? [])],
    });
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  protected cancelEdit(): void {
    this.editPlanId.set(null);
    this.editForm.set(null);
  }

  protected saveEdit(planId: number): void {
    const edit = this.editForm();
    if (!edit) {
      return;
    }
    if (
      !edit.nombre.trim() ||
      edit.limiteMensualBolsa < 0 ||
      edit.limiteUsuarios < 1 ||
      edit.precioMensual < 0 ||
      !edit.moduloCodigos.length
    ) {
      this.errorMessage.set(
        'El plan requiere nombre, al menos un modulo, un usuario y valores no negativos.',
      );
      return;
    }

    this.saving.set(true);
    this.api
      .updatePlan(planId, {
        nombre: edit.nombre.trim(),
        descripcion: edit.descripcion.trim() || null,
        limiteMensualBolsa: Math.trunc(edit.limiteMensualBolsa),
        limiteUsuarios: Math.trunc(edit.limiteUsuarios),
        precioMensual: Number(edit.precioMensual),
        estado: edit.estado,
        moduloCodigos: [...edit.moduloCodigos],
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set('Plan actualizado.');
          this.cancelEdit();
          this.load();
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected statusSeverity(status: string): 'success' | 'warn' | 'danger' | 'info' {
    const normalized = status.toUpperCase();
    if (normalized === 'ACTIVO') {
      return 'success';
    }
    if (normalized === 'SUSPENDIDO') {
      return 'warn';
    }
    if (normalized === 'INACTIVO') {
      return 'danger';
    }
    return 'info';
  }

  protected isCreateModuleSelected(code: string): boolean {
    return this.form.moduloCodigos.includes(code);
  }

  protected toggleCreateModule(code: string, checked: boolean): void {
    const selected = new Set(this.form.moduloCodigos);
    checked ? selected.add(code) : selected.delete(code);
    this.form.moduloCodigos = [...selected];
  }

  protected isEditModuleSelected(code: string): boolean {
    return this.editForm()?.moduloCodigos.includes(code) ?? false;
  }

  protected toggleEditModule(code: string, checked: boolean): void {
    const edit = this.editForm();
    if (!edit) {
      return;
    }
    const selected = new Set(edit.moduloCodigos);
    checked ? selected.add(code) : selected.delete(code);
    this.editForm.set({ ...edit, moduloCodigos: [...selected] });
  }

  private resolveError(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const apiError = (error as { error?: { message?: string; details?: string[] } }).error;
      return apiError?.details?.[0] || apiError?.message || 'No se pudo completar la operacion.';
    }
    return 'No se pudo completar la operacion.';
  }
}
