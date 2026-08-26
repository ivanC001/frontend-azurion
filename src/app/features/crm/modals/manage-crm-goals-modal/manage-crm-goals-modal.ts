import { ChangeDetectionStrategy, Component, effect, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';

import {
  CrmGoal,
  CrmGoalScope,
  CrmResponsableOption,
  SaveCrmGoalRequest,
} from '@features/crm/data/crm-api.types';

interface GoalDraft {
  id: number | null;
  alcance: CrmGoalScope;
  responsableId: string | null;
  metaIngresos: number;
  metaOportunidadesGanadas: number;
  metaProspectosNuevos: number;
  metaActividadesRealizadas: number;
  metaConversion: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-manage-crm-goals-modal',
  standalone: true,
  imports: [DialogModule, FormsModule],
  templateUrl: './manage-crm-goals-modal.html',
  styleUrl: './manage-crm-goals-modal.scss',
})
export class ManageCrmGoalsModal {
  readonly visible = input(false);
  readonly goals = input<readonly CrmGoal[]>([]);
  readonly advisors = input<readonly CrmResponsableOption[]>([]);
  readonly year = input.required<number>();
  readonly month = input.required<number>();
  readonly currency = input('PEN');
  readonly currencySymbol = input('S/');
  readonly saving = input(false);

  readonly closed = output<void>();
  readonly periodChanged = output<{ year: number; month: number }>();
  readonly saveRequested = output<SaveCrmGoalRequest>();
  readonly deleteRequested = output<number>();

  protected draft: GoalDraft = this.emptyDraft();
  protected readonly months = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];
  protected readonly years = Array.from(
    { length: 7 },
    (_, index) => new Date().getFullYear() - 2 + index,
  );

  constructor() {
    effect(() => {
      if (this.visible()) {
        const current = this.goals().find((goal) => goal.id === this.draft.id);
        if (current) {
          this.fillDraft(current);
        }
      }
    });
  }

  protected closeFromVisibility(visible: boolean): void {
    if (!visible) {
      this.closed.emit();
    }
  }

  protected selectPeriod(year: number, month: number): void {
    this.resetDraft();
    this.periodChanged.emit({ year: Number(year), month: Number(month) });
  }

  protected edit(goal: CrmGoal): void {
    this.fillDraft(goal);
  }

  protected resetDraft(): void {
    this.draft = this.emptyDraft();
  }

  protected save(): void {
    if (!this.isValid()) {
      return;
    }
    this.saveRequested.emit({
      anio: this.year(),
      mes: this.month(),
      alcance: this.draft.alcance,
      responsableId: this.draft.alcance === 'ASESOR' ? this.draft.responsableId : null,
      metaIngresos: Number(this.draft.metaIngresos || 0),
      metaOportunidadesGanadas: Number(this.draft.metaOportunidadesGanadas || 0),
      metaProspectosNuevos: Number(this.draft.metaProspectosNuevos || 0),
      metaActividadesRealizadas: Number(this.draft.metaActividadesRealizadas || 0),
      metaConversion: Number(this.draft.metaConversion || 0),
    });
  }

  protected isValid(): boolean {
    return this.draft.alcance === 'EQUIPO' || Boolean(this.draft.responsableId);
  }

  protected progress(goal: CrmGoal): number {
    return Math.min(100, Math.max(0, Number(goal.progresoIngresos || 0)));
  }

  protected goalLabel(goal: CrmGoal): string {
    return goal.alcance === 'EQUIPO' ? 'Equipo comercial' : goal.responsableNombre;
  }

  private fillDraft(goal: CrmGoal): void {
    this.draft = {
      id: goal.id,
      alcance: goal.alcance,
      responsableId: goal.responsableId ?? null,
      metaIngresos: goal.metaIngresos,
      metaOportunidadesGanadas: goal.metaOportunidadesGanadas,
      metaProspectosNuevos: goal.metaProspectosNuevos,
      metaActividadesRealizadas: goal.metaActividadesRealizadas,
      metaConversion: goal.metaConversion,
    };
  }

  private emptyDraft(): GoalDraft {
    return {
      id: null,
      alcance: 'EQUIPO',
      responsableId: null,
      metaIngresos: 0,
      metaOportunidadesGanadas: 0,
      metaProspectosNuevos: 0,
      metaActividadesRealizadas: 0,
      metaConversion: 0,
    };
  }
}
