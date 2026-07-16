import { Injectable, inject } from '@angular/core';

import { AdminSaasApiService, ConvertCotizacionVentaRequest } from '../../../data/admin-saas-api.service';
import type {
  CreateCrmQuotationRequest,
  GenerateQuotationFromOpportunityRequest,
  UpdateCrmQuotationStatusRequest,
} from '../models';

@Injectable({ providedIn: 'root' })
export class CrmQuotationService {
  private readonly api = inject(AdminSaasApiService);

  list(oportunidadId?: number | null) {
    return this.api.listCotizaciones(oportunidadId);
  }

  listPromotions() {
    return this.api.listPromocionesCotizacion();
  }

  create(request: CreateCrmQuotationRequest) {
    return this.api.createCotizacion(request);
  }

  updateStatus(id: number, request: string | UpdateCrmQuotationStatusRequest) {
    return this.api.updateCotizacionEstado(id, request);
  }

  getPdf(id: number) {
    return this.api.getCotizacionPdf(id);
  }

  convertToSale(id: number, request: ConvertCotizacionVentaRequest) {
    return this.api.convertCotizacionVenta(id, request);
  }

  generateFromOpportunity(id: number, request: GenerateQuotationFromOpportunityRequest) {
    return this.api.generarCotizacionDesdeCrmOportunidad(id, request);
  }
}
