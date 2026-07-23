import type {
  CrmProspecto,
  CrmLeadAssignmentConfig,
  CreateCrmProspectoRequest,
  RepartirCrmProspectosRequest,
  RepartirCrmProspectosResponse,
  UpdateCrmProspectoRequest,
} from '../../../data/admin-saas-api.service';

export type CrmProspect = CrmProspecto;
export type CreateCrmProspectRequest = CreateCrmProspectoRequest;
export type UpdateCrmProspectRequest = UpdateCrmProspectoRequest;
export type DistributeCrmProspectsRequest = RepartirCrmProspectosRequest;
export type DistributeCrmProspectsResponse = RepartirCrmProspectosResponse;
export type LeadAssignmentConfig = CrmLeadAssignmentConfig;

export interface ProspectFilters {
  readonly query: string;
  readonly estado: string;
  readonly origen: string;
  readonly campania: string;
  readonly asesor: string;
  readonly fechaDesde: string;
  readonly fechaHasta: string;
}
