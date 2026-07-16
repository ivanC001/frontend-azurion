import type { CrmActividad, CrmProspecto } from '../../../data/admin-saas-api.service';

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
