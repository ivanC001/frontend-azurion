import { Injectable, inject } from '@angular/core';

import { CrmApiService } from '@features/crm/data/crm-api.service';
import type { CrmProspectoPageRequest } from '@features/crm/data/crm-api.types';
import type {
  CreateCrmProspectRequest,
  DistributeCrmProspectsRequest,
  UpdateCrmProspectRequest,
} from '../models';

@Injectable({ providedIn: 'root' })
export class CrmProspectService {
  private readonly api = inject(CrmApiService);

  list() {
    return this.api.listCrmProspectos();
  }

  page(request: CrmProspectoPageRequest = {}) {
    return this.api.listCrmProspectosPage(request);
  }

  get(id: number) {
    return this.api.getCrmProspecto(id);
  }

  create(request: CreateCrmProspectRequest) {
    return this.api.createCrmProspecto(request);
  }

  update(id: number, request: UpdateCrmProspectRequest) {
    return this.api.updateCrmProspecto(id, request);
  }

  distribute(request: DistributeCrmProspectsRequest) {
    return this.api.repartirCrmProspectos(request);
  }

  getAssignmentConfiguration() {
    return this.api.getCrmLeadAssignmentConfig();
  }

  updateAssignmentConfiguration(automatico: boolean, responsableIds: readonly string[]) {
    return this.api.updateCrmLeadAssignmentConfig({ automatico, responsableIds });
  }

  delete(id: number) {
    return this.api.deleteCrmProspecto(id);
  }

  convertToCustomer(id: number) {
    return this.api.convertirCrmProspectoCliente(id);
  }
}
