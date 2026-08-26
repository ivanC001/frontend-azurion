import { Injectable, inject } from '@angular/core';

import { CrmApiService } from '@features/crm/data/crm-api.service';
import type { CrmActividadPageRequest } from '@features/crm/data/crm-api.types';
import type { CompleteCrmActivityRequest, CreateCrmActivityRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class CrmFollowupService {
  private readonly api = inject(CrmApiService);

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
