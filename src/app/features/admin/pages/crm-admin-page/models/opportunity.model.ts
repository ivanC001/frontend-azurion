import type {
  CrmEtapaPipeline,
  CrmNegociacion,
  CrmOportunidad,
  CrmOportunidadHistorial,
  CreateCrmNegociacionRequest,
  CreateCrmOportunidadRequest,
  UpdateCrmOportunidadRequest,
} from '../../../data/admin-saas-api.service';

export type CrmOpportunity = CrmOportunidad;
export type CrmPipelineStage = CrmEtapaPipeline;
export type CrmNegotiation = CrmNegociacion;
export type CrmOpportunityHistory = CrmOportunidadHistorial;
export type CreateCrmOpportunityRequest = CreateCrmOportunidadRequest;
export type UpdateCrmOpportunityRequest = UpdateCrmOportunidadRequest;
export type CreateCrmNegotiationRequest = CreateCrmNegociacionRequest;

export interface OpportunityRequirement {
  readonly id: string;
  readonly oportunidadId: number;
  readonly catalogoItemId: number | null;
  readonly nombre: string;
  readonly cantidad: number;
  readonly precioUnitario: number;
  readonly observacion: string;
  readonly createdAt: string;
}
