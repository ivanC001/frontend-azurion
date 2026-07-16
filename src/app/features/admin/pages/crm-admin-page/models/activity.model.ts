import type {
  CrmActividad,
  CreateCrmActividadRequest,
  RealizarCrmActividadRequest,
} from '../../../data/admin-saas-api.service';

export type CrmActivity = CrmActividad;
export type CreateCrmActivityRequest = CreateCrmActividadRequest;
export type CompleteCrmActivityRequest = RealizarCrmActividadRequest;

export interface ActivityContextModel {
  readonly type: 'PROSPECTO' | 'OPORTUNIDAD';
  readonly title: string;
  readonly subtitle: string;
  readonly detail: string;
  readonly icon: string;
}
