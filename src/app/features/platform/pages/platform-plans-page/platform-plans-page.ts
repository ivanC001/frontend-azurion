import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { AdminSaasApiService, Plan } from '@features/admin/data/admin-saas-api.service';

interface PlanForm {
  nombre: string;
  codigo: string;
  limiteMensualBolsa: number;
  precioMensual: number;
}

interface PlanEditForm {
  nombre: string;
  limiteMensualBolsa: number;
  precioMensual: number;
  estado: string;
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
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly editPlanId = signal<number | null>(null);
  protected readonly editForm = signal<PlanEditForm | null>(null);

  protected form: PlanForm = {
    nombre: '',
    codigo: '',
    limiteMensualBolsa: 0,
    precioMensual: 0,
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
    this.api
      .listPlanes()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => this.plans.set(items),
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected createPlan(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (!this.form.nombre.trim() || !this.form.codigo.trim()) {
      this.errorMessage.set('Completa nombre y codigo del plan.');
      return;
    }

    if (this.form.limiteMensualBolsa < 0 || this.form.precioMensual < 0) {
      this.errorMessage.set('Limite y precio deben ser mayores o iguales a cero.');
      return;
    }

    this.saving.set(true);
    this.api
      .createPlan({
        nombre: this.form.nombre.trim(),
        codigo: this.form.codigo.trim().toUpperCase(),
        limiteMensualBolsa: Math.trunc(this.form.limiteMensualBolsa),
        precioMensual: Number(this.form.precioMensual),
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set('Plan creado correctamente.');
          this.form = { nombre: '', codigo: '', limiteMensualBolsa: 0, precioMensual: 0 };
          this.load();
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected startEdit(plan: Plan): void {
    this.editPlanId.set(plan.id);
    this.editForm.set({
      nombre: plan.nombre,
      limiteMensualBolsa: plan.limiteMensualBolsa,
      precioMensual: plan.precioMensual,
      estado: plan.estado,
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

    this.saving.set(true);
    this.api
      .updatePlan(planId, {
        nombre: edit.nombre.trim(),
        limiteMensualBolsa: Math.trunc(edit.limiteMensualBolsa),
        precioMensual: Number(edit.precioMensual),
        estado: edit.estado,
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

  private resolveError(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const apiError = (error as { error?: { message?: string; details?: string[] } }).error;
      return apiError?.details?.[0] || apiError?.message || 'No se pudo completar la operacion.';
    }
    return 'No se pudo completar la operacion.';
  }
}
