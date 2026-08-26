import { Injectable, computed, signal } from '@angular/core';

import type { CrmEtapaPipeline } from '@features/crm/data/crm-api.types';

import {
  CRM_ACTIVE_PIPELINE_STAGES,
  CRM_OPPORTUNITY_FLOW,
  type PipelineStageOption,
  type StageValidationMode,
} from '../models';
import { humanizeCode } from './crm-text.util';

/**
 * Etapas del embudo comercial.
 *
 * Extraido de CrmPage. Resuelve una sola pregunta: dado un codigo de etapa,
 * como se llama, de que color es, que objetivo persigue y con que rigor se
 * valida la entrada. Todo el CRM consulta esto -- tablero, ficha, seguimiento
 * y reportes -- asi que tenerlo en un unico sitio evita que cada pantalla
 * arrastre su propia copia de los valores por defecto.
 */
@Injectable()
export class CrmStageStore {
  private static readonly DEFAULT_COLOR = '#2563eb';

  private static readonly DEFAULT_ICON = 'pi pi-briefcase';

  /**
   * Colores fijos del tablero. Priman sobre el color configurado en la etapa
   * para que las columnas del embudo se lean siempre igual.
   */
  private static readonly BOARD_COLORS: Record<string, string> = {
    INTERESADO: '#2563eb',
    COTIZADO: '#f59e0b',
    NEGOCIACION: '#7c3aed',
    GANADO: '#10b981',
    PERDIDO: '#ef4444',
  };

  private static readonly DEFAULT_OBJECTIVES: Record<string, string> = {
    NUEVO: 'Oportunidad recien creada, pendiente de primera gestion.',
    CONTACTADO: 'Cliente ya fue contactado y existe una primera respuesta.',
    INTERESADO: 'Cliente mostro interes real y se califico la necesidad.',
    COTIZADO: 'Se envio una propuesta o cotizacion formal.',
    NEGOCIACION: 'Se negocian precio, condiciones, pago o cierre.',
    GANADO: 'Venta aceptada o cierre comercial confirmado.',
    PERDIDO: 'Oportunidad descartada con motivo registrado.',
  };

  private static readonly DEFAULT_PROBABILITIES: Record<string, number> = {
    NUEVO: 10,
    CONTACTADO: 25,
    INTERESADO: 50,
    COTIZADO: 65,
    NEGOCIACION: 80,
    GANADO: 100,
    PERDIDO: 0,
  };

  /** Etapas cuyo salto exige evidencia registrada, no solo un aviso. */
  private static readonly STRICT_STAGES = ['COTIZADO', 'GANADO', 'PERDIDO'];

  readonly stages = signal<CrmEtapaPipeline[]>([]);

  /**
   * Etapas configuradas por el tenant, en el orden del embudo. Si no hay
   * ninguna configurada se cae al flujo estandar para que el CRM sea usable
   * desde el primer dia.
   */
  readonly options = computed<PipelineStageOption[]>(() => {
    const configured = this.orderedStages();
    if (configured.length > 0) {
      return configured.map((item) => ({
        label: item.nombre,
        value: item.codigo,
        id: item.id,
        color: item.color,
        descripcion: item.descripcion,
        probabilidadDefault: item.probabilidadDefault,
        icono: item.icono,
        requiereValidacion: item.requiereValidacion,
        modoValidacion: item.modoValidacion,
      }));
    }

    return CRM_OPPORTUNITY_FLOW.map((value) => ({
      label: humanizeCode(value),
      value,
      id: null,
      color: CrmStageStore.DEFAULT_COLOR,
      descripcion: this.defaultObjective(value),
      probabilidadDefault: this.defaultProbability(value),
      icono: CrmStageStore.DEFAULT_ICON,
      requiereValidacion: true,
      modoValidacion: this.defaultValidationMode(value),
    }));
  });

  /** Columnas que se muestran en el tablero: las de trabajo, sin cerradas. */
  readonly activeOptions = computed(() =>
    this.options().filter((stage) => CRM_ACTIVE_PIPELINE_STAGES.has(stage.value)),
  );

  setStages(stages: CrmEtapaPipeline[]): void {
    this.stages.set(stages);
  }

  upsert(stage: CrmEtapaPipeline): void {
    this.stages.update((items) =>
      items.some((item) => item.id === stage.id)
        ? items.map((item) => (item.id === stage.id ? stage : item))
        : [...items, stage],
    );
  }

  optionByValue(value: string | null | undefined): PipelineStageOption | null {
    return this.options().find((stage) => stage.value === value) ?? null;
  }

  name(etapa: string | null | undefined): string {
    return this.optionByValue(etapa)?.label || humanizeCode(etapa);
  }

  color(etapa: string | null | undefined): string {
    return this.optionByValue(etapa)?.color || CrmStageStore.DEFAULT_COLOR;
  }

  /** Color de columna del tablero, con la paleta fija por delante. */
  boardColor(etapa: string | null | undefined): string {
    return CrmStageStore.BOARD_COLORS[String(etapa || '').toUpperCase()] || this.color(etapa);
  }

  softColor(etapa: string | null | undefined): string {
    return `color-mix(in srgb, ${this.color(etapa)} 13%, white)`;
  }

  /** Avance dentro del embudo, en porcentaje, para las barras de progreso. */
  progress(etapa: string | null | undefined): number {
    const stages = this.options();
    const index = stages.findIndex((stage) => stage.value === etapa);
    if (index < 0 || stages.length <= 1) {
      return 0;
    }
    return Math.round((index / (stages.length - 1)) * 100);
  }

  objective(stage: PipelineStageOption | string | null | undefined): string {
    const code = typeof stage === 'string' ? stage : stage?.value;
    const configured =
      typeof stage === 'string' ? this.optionByValue(code)?.descripcion : stage?.descripcion;
    return configured || this.defaultObjective(code);
  }

  /**
   * El modo configurado llega como texto libre desde la API, asi que se
   * normaliza: cualquier valor no reconocido cae a WARNING, que avisa sin
   * bloquear el avance de la oportunidad.
   */
  validationMode(stage: PipelineStageOption | string | null | undefined): StageValidationMode {
    const code = typeof stage === 'string' ? stage : stage?.value;
    const configured =
      typeof stage === 'string' ? this.optionByValue(code)?.modoValidacion : stage?.modoValidacion;
    const normalized = String(configured || this.defaultValidationMode(code)).toUpperCase();
    return normalized === 'STRICT' || normalized === 'FREE' ? normalized : 'WARNING';
  }

  defaultObjective(stage: string | null | undefined): string {
    return (
      CrmStageStore.DEFAULT_OBJECTIVES[String(stage || '').toUpperCase()] ||
      'Etapa comercial configurable.'
    );
  }

  defaultProbability(stage: string | null | undefined): number {
    return CrmStageStore.DEFAULT_PROBABILITIES[String(stage || '').toUpperCase()] ?? 0;
  }

  /**
   * NUEVO no bloquea nada; las etapas que comprometen una propuesta o un
   * cierre exigen evidencia; el resto solo avisa.
   */
  defaultValidationMode(stage: string | null | undefined): StageValidationMode {
    const code = String(stage || '').toUpperCase();
    if (code === 'NUEVO') {
      return 'FREE';
    }
    return CrmStageStore.STRICT_STAGES.includes(code) ? 'STRICT' : 'WARNING';
  }

  /** Etapas configuradas que pertenecen al flujo, en su orden canonico. */
  private orderedStages(): CrmEtapaPipeline[] {
    const order = new Map<string, number>(
      CRM_OPPORTUNITY_FLOW.map((stage, index) => [stage, index]),
    );
    return this.stages()
      .filter((item) => order.has(item.codigo))
      .sort((left, right) => (order.get(left.codigo) ?? 0) - (order.get(right.codigo) ?? 0));
  }
}
