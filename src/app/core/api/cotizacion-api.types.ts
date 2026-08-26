/**
 * Contratos de las cotizaciones comerciales.
 *
 * Los comparten la pantalla de ventas del admin y el CRM, asi que viven en core
 * junto a CotizacionApiService en lugar de dentro de una feature concreta.
 */

import type { RegistrarVentaCajaResponse, TipoComprobanteVenta } from './venta-api.types';

export interface CotizacionDetalle {
  readonly id: number;
  readonly productoId?: number | null;
  readonly productoSku?: string | null;
  readonly productoNombre?: string | null;
  readonly catalogoItemId?: number | null;
  readonly catalogoTipoItem?: string | null;
  readonly catalogoNombre?: string | null;
  readonly catalogoDescripcion?: string | null;
  readonly catalogoMetadataJson?: string | null;
  readonly catalogoMoneda?: string | null;
  readonly catalogoPrecioReferencial?: number | null;
  readonly promocionId?: number | null;
  readonly promocionNombre?: string | null;
  readonly descripcion?: string | null;
  readonly cantidad: number;
  readonly precioUnitario: number;
  readonly descuento: number;
  readonly promocionDescuento?: number | null;
  readonly total: number;
}

export interface Cotizacion {
  readonly id: number;
  readonly clienteId?: number | null;
  readonly clienteDocumento?: string | null;
  readonly clienteNombre?: string | null;
  readonly usuarioId: string;
  readonly usuarioNombre: string;
  readonly asesorApellidos?: string | null;
  readonly asesorTelefono?: string | null;
  readonly asesorEmail?: string | null;
  readonly asesorCargo?: string | null;
  readonly asesorFotoUrl?: string | null;
  readonly sucursalId: number;
  readonly sucursalCodigo: string;
  readonly sucursalNombre: string;
  readonly fechaEmision: string;
  readonly fechaVencimiento?: string | null;
  readonly moneda: string;
  readonly monedaBase: string;
  readonly tipoCambioAplicado: number;
  readonly fechaTipoCambio: string;
  readonly subtotal: number;
  readonly total: number;
  readonly subtotalMonedaBase: number;
  readonly totalMonedaBase: number;
  readonly estado: string;
  readonly observacion?: string | null;
  readonly ventaId?: number | null;
  readonly crmOportunidadId?: number | null;
  readonly fechaEnvio?: string | null;
  readonly canalEnvio?: string | null;
  readonly proximoSeguimientoEn?: string | null;
  readonly fechaRespuesta?: string | null;
  readonly motivoRechazo?: string | null;
  readonly decisionSiguiente?: string | null;
  readonly convertidaEn?: string | null;
  readonly whatsappSendStatus?: 'SENDING' | 'SENT' | 'ERROR' | 'UNKNOWN' | null;
  readonly whatsappMessageId?: string | null;
  readonly detalles: CotizacionDetalle[];
}

export interface PromocionCotizacion {
  readonly id: number;
  readonly codigo: string;
  readonly nombre: string;
  readonly descripcion?: string | null;
  readonly tipoDescuento: 'MONTO' | 'PORCENTAJE' | string;
  readonly valor: number;
  readonly fechaInicio?: string | null;
  readonly fechaFin?: string | null;
  readonly estado: 'ACTIVA' | 'INACTIVA' | string;
}

export interface CreatePromocionCotizacionRequest {
  readonly codigo: string;
  readonly nombre: string;
  readonly descripcion?: string | null;
  readonly tipoDescuento: 'MONTO' | 'PORCENTAJE';
  readonly valor: number;
  readonly fechaInicio?: string | null;
  readonly fechaFin?: string | null;
  readonly estado?: string | null;
}

export interface UpdateCotizacionEstadoRequest {
  readonly estado: string;
  readonly canalEnvio?: string | null;
  readonly proximoSeguimientoEn?: string | null;
  readonly motivoRechazo?: string | null;
  readonly decisionSiguiente?: string | null;
}

export interface CreateCotizacionRequest {
  readonly clienteId?: number | null;
  readonly usuarioId: string;
  readonly usuarioNombre: string;
  readonly sucursalId: number;
  readonly fechaEmision?: string | null;
  readonly fechaVencimiento?: string | null;
  readonly moneda?: string | null;
  readonly observacion?: string | null;
  readonly crmOportunidadId?: number | null;
  readonly detalles: Array<{
    readonly productoId?: number | null;
    readonly catalogoItemId?: number | null;
    readonly promocionId?: number | null;
    readonly descripcion?: string | null;
    readonly cantidad: number;
    readonly precioUnitario: number;
    readonly descuento?: number | null;
  }>;
}

export interface ConvertCotizacionVentaRequest {
  readonly cajaId: number;
  readonly tipoComprobante?: TipoComprobanteVenta | null;
  readonly responsableId: string;
  readonly responsableNombre: string;
  readonly formaPago?: string | null;
  readonly fechaEmision?: string | null;
  readonly moneda?: string | null;
  readonly tipoCambio?: number | null;
}

export interface CotizacionPdfResponse {
  readonly fileName: string;
  readonly contentType: string;
  readonly base64: string;
}

export interface SendCotizacionEmailResponse {
  readonly cotizacion: Cotizacion;
  readonly destinatario: string;
}

export interface ConvertCotizacionVentaResponse {
  readonly cotizacion: Cotizacion;
  readonly venta: RegistrarVentaCajaResponse;
}
