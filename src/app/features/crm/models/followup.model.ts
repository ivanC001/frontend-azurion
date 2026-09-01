import type { CrmActividad, CrmProspecto } from '@features/crm/data/crm-api.types';

import type { FollowupStatus } from './crm.enums';

export interface FollowupItem {
  readonly prospecto: CrmProspecto;
  readonly ultimaActividad?: CrmActividad;
  readonly proximaActividad?: CrmActividad;
  readonly estado: FollowupStatus | string;
  readonly prioridad: 'overdue' | 'today' | 'upcoming' | 'done' | 'idle';
}

export interface FollowupFilters {
  readonly query: string;
  readonly contacto: string;
  readonly responsable: string;
  readonly origen: string;
  readonly interes: string;
  readonly fecha: string;
}
<<<<<<< HEAD

/** Etapas del embudo en las que puede estar un contacto. */
export type FunnelStage = 'PROSPECTO' | 'SEGUIMIENTO' | 'OPORTUNIDAD' | 'CLIENTE';

/** Estados de prospecto que implican gestion comercial en curso. */
const FOLLOW_UP_STATES = ['CONTACTADO', 'EN_ESPERA', 'CALIFICADO', 'PERDIDO'];

/**
 * Lo que hace falta saber del contacto para ubicarlo en el embudo. Se pasa
 * resuelto para que la regla no dependa de como se consultan oportunidades ni
 * actividades.
 */
export interface ProspectFunnelContext {
  readonly estado: string;
  /** Alguna oportunidad suya termino en venta. */
  readonly hasClosedSale: boolean;
  /** Tiene una oportunidad viva: ni ganada, ni perdida, ni facturada. */
  readonly hasActiveOpportunity: boolean;
  /** Se registro al menos una actividad sobre el contacto. */
  readonly hasActivity: boolean;
  /** Entro por un canal automatico (landing, webhook, WhatsApp...). */
  readonly isAutomaticLead: boolean;
}

/**
 * Ubica un contacto en UNA sola etapa del embudo, la mas avanzada que alcanzo.
 *
 * Es la invariante que sostiene los contadores: si un contacto puede contarse
 * en dos etapas a la vez, las cifras que ve el vendedor dejan de sumar el
 * total real de su cartera. El caso que lo destapo fue un prospecto calificado
 * que ya tenia oportunidad y seguia contando como "en seguimiento".
 *
 * Una oportunidad perdida devuelve el contacto a seguimiento a proposito: la
 * etapa de oportunidades solo muestra las activas, asi que excluirlo de ambas
 * lo haria desaparecer del embudo en lugar de dejarlo disponible para retomar.
 */
export function resolveFunnelStage(context: ProspectFunnelContext): FunnelStage {
  if (context.hasClosedSale) {
    return 'CLIENTE';
  }

  if (context.hasActiveOpportunity) {
    return 'OPORTUNIDAD';
  }

  if (FOLLOW_UP_STATES.includes(context.estado)) {
    return 'SEGUIMIENTO';
  }

  // Un lead automatico sin gestionar sigue siendo captacion aunque el sistema
  // le haya registrado actividades por su cuenta.
  if (context.estado === 'NUEVO' && context.hasActivity && !context.isAutomaticLead) {
    return 'SEGUIMIENTO';
  }

  return 'PROSPECTO';
}

export function isInFollowUpStage(context: ProspectFunnelContext): boolean {
  return resolveFunnelStage(context) === 'SEGUIMIENTO';
}
=======
>>>>>>> b50118bff6d4d47a3981a187eab708420ee804bc
