import type {
  Cotizacion,
  CotizacionDetalle,
  CotizacionPdfResponse,
  CreateCotizacionRequest,
  PromocionCotizacion,
  UpdateCotizacionEstadoRequest,
} from '@core/api/cotizacion-api.types';
import type { GenerarCotizacionDesdeOportunidadRequest } from '@features/crm/data/crm-api.types';

export type CrmQuotation = Cotizacion;
export type CrmQuotationDetail = CotizacionDetalle;
export type CrmQuotationPromotion = PromocionCotizacion;
export type CrmQuotationPdfResponse = CotizacionPdfResponse;
export type CreateCrmQuotationRequest = CreateCotizacionRequest;
export type UpdateCrmQuotationStatusRequest = UpdateCotizacionEstadoRequest;
export type GenerateQuotationFromOpportunityRequest = GenerarCotizacionDesdeOportunidadRequest;
