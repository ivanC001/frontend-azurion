import { Injectable, inject } from '@angular/core';

import { AdminSaasApiService } from '../../../data/admin-saas-api.service';
import type { CrmActividadPageRequest } from '../../../data/admin-saas-api.service';
import type { CompleteCrmActivityRequest, CreateCrmActivityRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class CrmFollowupService {
  private readonly api = inject(AdminSaasApiService);

  listActivities() {
    return this.api.listCrmActividades();
  }

  pageActivities(request: CrmActividadPageRequest = {}) {
    return this.api.listCrmActividadesPage(request);
  }

  createActivity(request: CreateCrmActivityRequest) {
    return this.api.createCrmActividad(request);
  }

  completeActivity(id: number, request?: string | CompleteCrmActivityRequest | null) {
    return this.api.realizarCrmActividad(id, request);
  }

  cancelActivity(id: number, request?: string | CompleteCrmActivityRequest | null) {
    return this.api.cancelarCrmActividad(id, request);
  }
}
