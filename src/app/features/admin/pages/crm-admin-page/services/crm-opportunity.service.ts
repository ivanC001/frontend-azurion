import { Injectable, inject } from '@angular/core';

import { AdminSaasApiService } from '../../../data/admin-saas-api.service';
import type { CrmOportunidadPageRequest } from '../../../data/admin-saas-api.service';
import type {
  CreateCrmNegotiationRequest,
  CreateCrmOpportunityRequest,
  UpdateCrmOpportunityRequest,
} from '../models';
import type { CrmOportunidadRecursoTipo } from '../../../data/admin-saas-api.service';

@Injectable({ providedIn: 'root' })
export class CrmOpportunityService {
  private readonly api = inject(AdminSaasApiService);

  listStages() {
    return this.api.listCrmEtapas();
  }

  listPipeline() {
    return this.api.getCrmPipeline();
  }

  list() {
    return this.api.listCrmOportunidades();
  }

  page(request: CrmOportunidadPageRequest = {}) {
    return this.api.listCrmOportunidadesPage(request);
  }

  pagePaymentTracking(request: CrmOportunidadPageRequest = {}) {
    return this.api.listCrmSeguimientoPagosPage(request);
  }

  get(id: number) {
    return this.api.getCrmOportunidad(id);
  }

  create(request: CreateCrmOpportunityRequest) {
    return this.api.createCrmOportunidad(request);
  }

  update(id: number, request: UpdateCrmOpportunityRequest) {
    return this.api.updateCrmOportunidad(id, request);
  }

  moveStage(id: number, etapaId: number, observacion?: string | null) {
    return this.api.moverCrmOportunidadEtapa(id, etapaId, observacion);
  }

  markWon(id: number) {
    return this.api.marcarCrmOportunidadGanada(id);
  }

  markLost(id: number, motivo: string) {
    return this.api.marcarCrmOportunidadPerdida(id, motivo);
  }

  listHistory(id: number) {
    return this.api.getCrmOportunidadHistorial(id);
  }

  listNegotiations(oportunidadId: number) {
    return this.api.listCrmNegociaciones(oportunidadId);
  }

  createNegotiation(oportunidadId: number, request: CreateCrmNegotiationRequest) {
    return this.api.createCrmNegociacion(oportunidadId, request);
  }

  listResources() {
    return this.api.listCrmOportunidadRecursos();
  }

  createResource(
    oportunidadId: number,
    tipo: CrmOportunidadRecursoTipo,
    data: Readonly<Record<string, unknown>>,
    file?: File | null,
  ) {
    return this.api.createCrmOportunidadRecurso(oportunidadId, tipo, data, file);
  }

  updateResource(
    oportunidadId: number,
    resourceId: number,
    tipo: CrmOportunidadRecursoTipo,
    data: Readonly<Record<string, unknown>>,
    file?: File | null,
  ) {
    return this.api.updateCrmOportunidadRecurso(oportunidadId, resourceId, tipo, data, file);
  }

  deleteResource(oportunidadId: number, resourceId: number) {
    return this.api.deleteCrmOportunidadRecurso(oportunidadId, resourceId);
  }

  downloadResource(oportunidadId: number, resourceId: number, inline = false) {
    return this.api.downloadCrmOportunidadRecurso(oportunidadId, resourceId, inline);
  }
}
