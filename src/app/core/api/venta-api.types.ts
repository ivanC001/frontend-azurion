/**
 * Contratos de la venta registrada en caja.
 *
 * Viven en core porque una cotizacion se convierte en venta tanto desde la
 * pantalla de ventas del admin como desde el CRM, y ambas necesitan describir
 * el resultado de esa conversion.
 */

export interface FacturadorDocumentStatus {
  readonly facturacionEstado?: string | null;
  readonly facturacionIntentos?: number | null;
  readonly facturadorHttpStatus?: number | null;
  readonly facturadorEndpoint?: string | null;
  readonly facturadorTipoComprobante?: string | null;
  readonly facturadorMensaje?: string | null;
  readonly facturadorSunatEstado?: string | null;
  readonly facturadorDocumentoId?: string | null;
  readonly facturadorTicket?: string | null;
  readonly facturadorPdfUrl?: string | null;
  readonly facturadorXmlUrl?: string | null;
  readonly facturadorCdrUrl?: string | null;
  readonly facturadorRespuestaJson?: string | null;
  readonly facturacionActualizadoEn?: string | null;
}

export interface CajaMovimiento {
  readonly id: number;
  readonly turnoId: number;
  readonly cajaId: number;
  readonly tipoMovimiento: string;
  readonly origen: string;
  readonly medioPago: string;
  readonly afectaEfectivo: boolean;
  readonly ventaId: number | null;
  readonly monto: number;
  readonly saldoAnterior: number;
  readonly saldoResultante: number;
  readonly descripcion: string;
  readonly referencia: string | null;
  readonly cuentaEmpresarial: string | null;
  readonly responsableId: string;
  readonly responsableNombre: string;
  readonly fechaMovimiento: string;
  readonly anulado: boolean;
  readonly motivoAnulacion: string | null;
}

export type TipoComprobanteVenta = 'FACTURA' | 'BOLETA' | 'BOLETA_SIN_NOMBRE' | 'TICKET_VENTA';

export type FormatoImpresionComprobante = 'A4' | 'TICKET';

export interface FacturadorVentaResponse {
  readonly success: boolean;
  readonly status: number;
  readonly endpoint: string;
  readonly tipoComprobante: string;
  readonly message: string;
  readonly data?: unknown;
}

export interface VentaRecord extends FacturadorDocumentStatus {
  readonly id: number;
  readonly externalId: string;
  readonly clienteDocumento: string;
  readonly clienteNombre: string;
  readonly moneda: string;
  readonly total: number;
  readonly cajaTurnoId?: number | null;
  readonly formaPago?: string | null;
  readonly metodoPago?: string | null;
  readonly fechaVenta: string;
}

export interface RegistrarVentaCajaResponse {
  readonly venta: VentaRecord;
  readonly movimientoCaja: CajaMovimiento | null;
  readonly facturacion: FacturadorVentaResponse;
}
