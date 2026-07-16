import type {
  Cotizacion,
  CotizacionDetalle,
  CotizacionPdfResponse,
  CreateCotizacionRequest,
  GenerarCotizacionDesdeOportunidadRequest,
  PromocionCotizacion,
  UpdateCotizacionEstadoRequest,
} from '../../../data/admin-saas-api.service';

export type CrmQuotation = Cotizacion;
export type CrmQuotationDetail = CotizacionDetalle;
export type CrmQuotationPromotion = PromocionCotizacion;
export type CrmQuotationPdfResponse = CotizacionPdfResponse;
export type CreateCrmQuotationRequest = CreateCotizacionRequest;
export type UpdateCrmQuotationStatusRequest = UpdateCotizacionEstadoRequest;
export type GenerateQuotationFromOpportunityRequest = GenerarCotizacionDesdeOportunidadRequest;
