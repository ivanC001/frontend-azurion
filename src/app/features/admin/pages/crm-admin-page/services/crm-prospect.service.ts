import { Injectable, inject } from '@angular/core';

import { AdminSaasApiService } from '../../../data/admin-saas-api.service';
import type { CrmProspectoPageRequest } from '../../../data/admin-saas-api.service';
import type {
  CreateCrmProspectRequest,
  DistributeCrmProspectsRequest,
  UpdateCrmProspectRequest,
} from '../models';

@Injectable({ providedIn: 'root' })
export class CrmProspectService {
  private readonly api = inject(AdminSaasApiService);

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

  convertToCustomer(id: number) {
    return this.api.convertirCrmProspectoCliente(id);
  }
}
