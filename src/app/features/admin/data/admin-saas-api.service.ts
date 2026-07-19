import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay, tap } from 'rxjs';

import { ApiResponse } from '@core/api/api-response';
import { ApiUrlService } from '@core/api/api-url.service';
import { AuthSessionService } from '@core/auth/auth-session.service';

export interface Empresa {
  readonly id: number;
  readonly ruc: string;
  readonly razonSocial: string;
  readonly tenantId: string;
  readonly schemaName: string;
  readonly logoPanelUrl?: string | null;
  readonly activo: boolean;
}

export interface CreateEmpresaRequest {
  readonly ruc: string;
  readonly razonSocial: string;
  readonly tenantId: string;
  readonly schemaName: string;
  readonly moduloCodigos?: readonly string[] | null;
}

export interface UpdateCurrentEmpresaBrandingRequest {
  readonly logoPanelFile?: File | null;
  readonly clearLogoPanel?: boolean;
}

export interface Plan {
  readonly id: number;
  readonly nombre: string;
  readonly codigo: string;
  readonly descripcion?: string | null;
  readonly limiteMensualBolsa: number;
  readonly precioMensual: number;
  readonly estado: string;
  readonly moduloCodigos?: readonly string[];
}

export interface CreatePlanRequest {
  readonly nombre: string;
  readonly codigo: string;
  readonly descripcion?: string | null;
  readonly limiteMensualBolsa: number;
  readonly precioMensual: number;
  readonly moduloCodigos?: readonly string[];
}

export interface UpdatePlanRequest {
  readonly nombre: string;
  readonly descripcion?: string | null;
  readonly limiteMensualBolsa: number;
  readonly precioMensual: number;
  readonly estado: string;
  readonly moduloCodigos?: readonly string[];
}

export interface ModuloGlobal {
  readonly id: number;
  readonly codigo: string;
  readonly nombre: string;
  readonly descripcion?: string | null;
  readonly estado: string;
}

export interface CreateModuloRequest {
  readonly codigo: string;
  readonly nombre: string;
  readonly descripcion?: string | null;
}

export interface UpdateModuloRequest {
  readonly nombre: string;
  readonly descripcion?: string | null;
  readonly estado: string;
}

export interface EmpresaModulo {
  readonly id: number | null;
  readonly empresaId: number;
  readonly moduloId: number;
  readonly moduloCodigo: string;
  readonly moduloNombre: string;
  readonly estado: string;
  readonly activo: boolean;
  readonly fechaInicio?: string | null;
  readonly fechaFin?: string | null;
  readonly configuracionExtra?: string | null;
  readonly vigente: boolean;
}

export interface EmpresaModuloAssignmentRequest {
  readonly moduloId?: number | null;
  readonly moduloCodigo?: string | null;
  readonly estado: string;
  readonly activo: boolean;
  readonly fechaInicio?: string | null;
  readonly fechaFin?: string | null;
  readonly configuracionExtra?: string | null;
}

export interface SyncEmpresaModulosRequest {
  readonly modulos: readonly EmpresaModuloAssignmentRequest[];
}

export interface ActiveModulesResponse {
  readonly empresaId: number;
  readonly tenantId?: string | null;
  readonly modules: readonly string[];
}

export interface Suscripcion {
  readonly id: number;
  readonly empresaId: number;
  readonly planId: number;
  readonly estado: string;
  readonly fechaInicio: string | null;
  readonly fechaFin: string | null;
}

export interface CreateSuscripcionRequest {
  readonly empresaId: number;
  readonly planId: number;
  readonly fechaInicio?: string | null;
}

export interface UpdateSuscripcionEstadoRequest {
  readonly estado: string;
  readonly fechaFin?: string | null;
}

export interface Almacen {
  readonly id: number;
  readonly codigo: string;
  readonly nombre: string;
  readonly direccion: string | null;
  readonly sucursalId: number;
  readonly sucursalCodigo: string;
  readonly sucursalNombre: string;
  readonly tipoAlmacen: string;
  readonly estado: string;
  readonly activo: boolean;
}

export interface CreateAlmacenRequest {
  readonly codigo: string;
  readonly nombre: string;
  readonly direccion?: string | null;
  readonly sucursalId: number;
}

export interface Sucursal {
  readonly id: number;
  readonly codigo: string;
  readonly nombre: string;
  readonly direccion: string | null;
  readonly ubigeoCodigo: string;
  readonly departamento: string;
  readonly provincia: string;
  readonly distrito: string;
  readonly igvPorcentaje: number;
  readonly tipoOperacionDefaultId?: string | null;
  readonly tipoAfectacionDefaultId?: string | null;
  readonly tributoDefaultId?: string | null;
  readonly porcentajeIgvDefault?: number | null;
  readonly activo: boolean;
}

export interface CreateSucursalRequest {
  readonly codigo: string;
  readonly nombre: string;
  readonly direccion?: string | null;
  readonly ubigeoCodigo: string;
  readonly igvPorcentaje: number;
}

export type UpdateSucursalRequest = CreateSucursalRequest;

export interface Ubigeo {
  readonly codigo: string;
  readonly departamento: string;
  readonly provincia: string;
  readonly distrito: string;
}

export interface Cliente {
  readonly id: number;
  readonly tipoDocumento: string;
  readonly numeroDocumento: string;
  readonly nombre: string;
  readonly email: string | null;
  readonly direccion: string | null;
  readonly ubigeo: string | null;
  readonly telefono: string | null;
  readonly limiteCredito: number;
  readonly saldoDeuda: number;
  readonly creditoDisponible: number;
  readonly diasCredito: number;
  readonly deudor: boolean;
  readonly activo: boolean;
}

export interface CreateClienteRequest {
  readonly tipoDocumento: string;
  readonly numeroDocumento: string;
  readonly nombre: string;
  readonly email?: string | null;
  readonly direccion?: string | null;
  readonly ubigeo?: string | null;
  readonly telefono?: string | null;
  readonly limiteCredito?: number | null;
  readonly diasCredito?: number | null;
  readonly activo?: boolean | null;
}

export interface UpdateClienteRequest {
  readonly tipoDocumento: string;
  readonly numeroDocumento: string;
  readonly nombre: string;
  readonly email?: string | null;
  readonly direccion?: string | null;
  readonly ubigeo?: string | null;
  readonly telefono?: string | null;
  readonly limiteCredito?: number | null;
  readonly diasCredito?: number | null;
  readonly activo?: boolean | null;
}

export interface ClienteAbono {
  readonly id: number;
  readonly clienteId: number;
  readonly monto: number;
  readonly saldoAnterior: number;
  readonly saldoResultante: number;
  readonly observacion: string | null;
  readonly fecha: string;
}

export interface RegistrarClienteAbonoRequest {
  readonly monto: number;
  readonly observacion?: string | null;
}

export interface Caja {
  readonly id: number;
  readonly sucursalId: number;
  readonly sucursalCodigo: string;
  readonly sucursalNombre: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly estado: string;
  readonly saldoCapital: number;
  readonly saldoActual: number;
  readonly saldoSalida: number | null;
  readonly totalEntradas: number;
  readonly totalSalidas: number;
  readonly totalDepositos: number;
  readonly diferenciaCierre: number | null;
  readonly responsableAperturaId: string;
  readonly responsableAperturaNombre: string;
  readonly responsableCierreId: string | null;
  readonly responsableCierreNombre: string | null;
  readonly fechaApertura: string;
  readonly fechaCierre: string | null;
  readonly observacionApertura: string | null;
  readonly observacionCierre: string | null;
}

export interface CajaMovimiento {
  readonly id: number;
  readonly cajaId: number;
  readonly tipoMovimiento: string;
  readonly monto: number;
  readonly saldoAnterior: number;
  readonly saldoResultante: number;
  readonly descripcion: string;
  readonly referencia: string | null;
  readonly cuentaEmpresarial: string | null;
  readonly responsableId: string;
  readonly responsableNombre: string;
  readonly fechaMovimiento: string;
}

export type TipoComprobanteVenta = 'FACTURA' | 'BOLETA' | 'BOLETA_SIN_NOMBRE' | 'TICKET_VENTA';

export interface VentaProductoRequest {
  readonly productoId: number;
  readonly almacenId?: number | null;
  readonly cantidad: number;
  readonly precioUnitario: number;
  readonly descuento?: number | null;
  readonly afectacionIgv?: string | null;
  readonly descripcion?: string | null;
  readonly codigoSunat?: string | null;
  readonly unidad?: string | null;
  readonly porcentajeIgv?: number | null;
  readonly mtoValorGratuito?: number | null;
  readonly icbper?: number | null;
  readonly factorIcbper?: number | null;
  readonly isc?: number | null;
  readonly porcentajeIsc?: number | null;
  readonly tipSisIsc?: string | null;
  readonly otroTributo?: number | null;
  readonly porcentajeOtroTributo?: number | null;
  readonly descuentos?: Array<Record<string, unknown>>;
  readonly cargos?: Array<Record<string, unknown>>;
}

export interface VentaPercepcionRequest {
  readonly codigoRegimen: string;
  readonly porcentaje?: number | null;
  readonly montoBase?: number | null;
  readonly monto?: number | null;
  readonly montoTotal?: number | null;
}

export interface VentaDetraccionRequest {
  readonly codigoBien: string;
  readonly codigoMedioPago: string;
  readonly cuentaBanco?: string | null;
  readonly porcentaje?: number | null;
  readonly monto?: number | null;
  readonly valorReferencial?: number | null;
}

export interface VentaAnticipoRequest {
  readonly tipoDocRel: string;
  readonly nroDocRel: string;
  readonly total: number;
}

export interface VentaCuotaRequest {
  readonly monto: number;
  readonly fechaPago: string;
  readonly moneda?: string | null;
}

export interface VentaLeyendaRequest {
  readonly codigo: string;
  readonly valor: string;
}

export interface AbrirCajaRequest {
  readonly sucursalId: number;
  readonly codigo: string;
  readonly nombre: string;
  readonly saldoCapital: number;
  readonly responsableId: string;
  readonly responsableNombre: string;
  readonly observacion?: string | null;
}

export interface CerrarCajaRequest {
  readonly saldoSalida: number;
  readonly responsableId: string;
  readonly responsableNombre: string;
  readonly observacion?: string | null;
}

export interface RegistrarMovimientoCajaRequest {
  readonly tipoMovimiento: string;
  readonly monto: number;
  readonly descripcion: string;
  readonly referencia?: string | null;
  readonly responsableId: string;
  readonly responsableNombre: string;
}

export interface DepositoCuentaEmpresarialRequest {
  readonly monto: number;
  readonly cuentaEmpresarial: string;
  readonly numeroOperacion?: string | null;
  readonly responsableId: string;
  readonly responsableNombre: string;
  readonly observacion?: string | null;
}

export interface RegistrarVentaCajaRequest {
  readonly tipoComprobante: TipoComprobanteVenta;
  readonly total: number;
  readonly responsableId: string;
  readonly responsableNombre: string;
  readonly clienteId?: number | null;
  readonly clienteTipoDocumento?: string | null;
  readonly clienteNumeroDocumento?: string | null;
  readonly clienteNombre?: string | null;
  readonly fechaEmision?: string | null;
  readonly moneda?: string | null;
  readonly tipoCambio?: number | null;
  readonly formaPago?: string | null;
  readonly contingencia?: boolean | null;
  readonly tipoOperacionSunat?: string | null;
  readonly percepcion?: VentaPercepcionRequest | null;
  readonly detraccion?: VentaDetraccionRequest | null;
  readonly anticipos?: VentaAnticipoRequest[] | null;
  readonly cuotas?: VentaCuotaRequest[] | null;
  readonly leyendas?: VentaLeyendaRequest[] | null;
  readonly descripcion?: string | null;
  readonly items: VentaProductoRequest[];
}

export interface FacturadorVentaResponse {
  readonly success: boolean;
  readonly status: number;
  readonly endpoint: string;
  readonly tipoComprobante: string;
  readonly message: string;
  readonly data?: unknown;
}

export interface VentaRecord {
  readonly id: number;
  readonly externalId: string;
  readonly clienteDocumento: string;
  readonly clienteNombre: string;
  readonly moneda: string;
  readonly total: number;
  readonly fechaVenta: string;
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

export interface VentaStatusStreamEvent {
  readonly tenantId?: string | null;
  readonly source?: string | null;
  readonly ventaId?: number | null;
  readonly externalId: string;
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
  readonly facturacionActualizadoEn?: string | null;
}

export interface RegistrarVentaCajaResponse {
  readonly venta: {
    readonly id: number;
    readonly externalId: string;
    readonly clienteDocumento: string;
    readonly clienteNombre: string;
    readonly moneda: string;
    readonly total: number;
    readonly fechaVenta: string;
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
  };
  readonly movimientoCaja: CajaMovimiento | null;
  readonly facturacion: FacturadorVentaResponse;
}

export interface RegistrarGuiaRemisionRequest {
  readonly sucursalOrigenId: number;
  readonly sucursalDestinoId: number;
  readonly fechaTraslado: string;
  readonly motivoTraslado?: string | null;
  readonly transportista?: string | null;
  readonly observacion?: string | null;
  readonly responsableId: string;
  readonly responsableNombre: string;
  readonly items: Array<{
    readonly productoId: number;
    readonly descripcion?: string | null;
    readonly cantidad: number;
  }>;
}

export interface RegistrarGuiaRemisionResponse {
  readonly externalId: string;
  readonly guia?: GuiaRemisionRecord | null;
  readonly facturacion: FacturadorVentaResponse;
}

export interface GuiaRemisionRecord {
  readonly id: number;
  readonly externalId: string;
  readonly sucursalOrigenId: number;
  readonly sucursalOrigenNombre: string;
  readonly sucursalDestinoId: number;
  readonly sucursalDestinoNombre: string;
  readonly fechaEmision: string;
  readonly fechaTraslado: string;
  readonly motivoTraslado?: string | null;
  readonly transportista?: string | null;
  readonly observacion?: string | null;
  readonly responsableId: string;
  readonly responsableNombre: string;
  readonly itemsResumen?: string | null;
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

export interface RegistrarNotaFiscalRequest {
  readonly ventaId: number;
  readonly motivoCodigo: string;
  readonly motivoDescripcion: string;
  readonly monto: number;
  readonly responsableId: string;
  readonly responsableNombre: string;
}

export interface RegistrarNotaFiscalResponse {
  readonly externalId: string;
  readonly nota?: NotaFiscalRecord | null;
  readonly facturacion: FacturadorVentaResponse;
}

export interface NotaFiscalRecord {
  readonly id: number;
  readonly externalId: string;
  readonly tipoDocumento: string;
  readonly tipoNota: string;
  readonly ventaId: number;
  readonly ventaExternalId: string;
  readonly ventaTipoDocumento?: string | null;
  readonly ventaNumeroDocumento?: string | null;
  readonly clienteDocumento: string;
  readonly clienteNombre: string;
  readonly moneda: string;
  readonly monto: number;
  readonly fechaEmision: string;
  readonly motivoCodigo: string;
  readonly motivoDescripcion: string;
  readonly responsableId: string;
  readonly responsableNombre: string;
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

type VentasListPayload =
  | VentaRecord[]
  | { readonly items?: readonly VentaRecord[]; readonly total?: number }
  | null;

export interface Producto {
  readonly id: number;
  readonly codigo?: string | null;
  readonly codigoBarras?: string | null;
  readonly sku: string;
  readonly nombre: string;
  readonly descripcion?: string | null;
  readonly categoriaId?: number | null;
  readonly marcaId?: number | null;
  readonly unidadMedidaId?: number | null;
  readonly tipoProducto?: string | null;
  readonly costoPromedio?: number | null;
  readonly afectoIgv?: boolean | null;
  readonly tipoAfectacionIgvId?: string | null;
  readonly tributoId?: string | null;
  readonly porcentajeImpuesto?: number | null;
  readonly usaConfiguracionEmpresa?: boolean | null;
  readonly stock?: boolean | null;
  readonly lotes?: boolean | null;
  readonly vencimiento?: boolean | null;
  readonly stockMinimo?: number | null;
  readonly foto?: string | null;
  readonly estado?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
  readonly precio: number;
  readonly almacenId: number;
  readonly almacenCodigo: string;
  readonly almacenNombre: string;
  readonly stockCantidad: number;
  readonly activo: boolean;
  readonly imagenUrl?: string | null;
  readonly precioCompraBase?: number | null;
  readonly precioVentaBase?: number | null;
  readonly manejaStock?: boolean | null;
  readonly manejaLotes?: boolean | null;
  readonly manejaVencimiento?: boolean | null;
  readonly stockMinimoGlobal?: number | null;
}

export interface CategoriaProducto {
  readonly id: number;
  readonly nombre: string;
  readonly descripcion?: string | null;
  readonly padreId?: number | null;
  readonly estado: string;
}

export interface CreateProductoRequest {
  readonly sku: string;
  readonly nombre: string;
  readonly precio: number;
  readonly almacenId: number;
  readonly codigo?: string | null;
  readonly codigoBarras?: string | null;
  readonly descripcion?: string | null;
  readonly categoriaId?: number | null;
  readonly marcaId?: number | null;
  readonly unidadMedidaId?: number | null;
  readonly tipoProducto?: string | null;
  readonly costoPromedio?: number | null;
  readonly afectoIgv?: boolean | null;
  readonly tipoAfectacionIgvId?: string | null;
  readonly tributoId?: string | null;
  readonly porcentajeImpuesto?: number | null;
  readonly usaConfiguracionEmpresa?: boolean | null;
  readonly stock?: boolean | null;
  readonly lotes?: boolean | null;
  readonly vencimiento?: boolean | null;
  readonly stockMinimo?: number | null;
  readonly foto?: string | null;
  readonly precioCompraBase?: number | null;
  readonly precioVentaBase?: number | null;
}

export interface UpdateProductoRequest {
  readonly nombre: string;
  readonly precio: number;
  readonly activo: boolean;
  readonly codigo?: string | null;
  readonly codigoBarras?: string | null;
  readonly descripcion?: string | null;
  readonly categoriaId?: number | null;
  readonly marcaId?: number | null;
  readonly unidadMedidaId?: number | null;
  readonly tipoProducto?: string | null;
  readonly costoPromedio?: number | null;
  readonly afectoIgv?: boolean | null;
  readonly tipoAfectacionIgvId?: string | null;
  readonly tributoId?: string | null;
  readonly porcentajeImpuesto?: number | null;
  readonly usaConfiguracionEmpresa?: boolean | null;
  readonly stock?: boolean | null;
  readonly lotes?: boolean | null;
  readonly vencimiento?: boolean | null;
  readonly stockMinimo?: number | null;
  readonly foto?: string | null;
  readonly estado?: string | null;
  readonly precioCompraBase?: number | null;
  readonly precioVentaBase?: number | null;
}

export interface ConfiguracionTributaria {
  readonly id: number;
  readonly tipoOperacionDefaultId: string;
  readonly tipoAfectacionDefaultId: string;
  readonly tributoDefaultId: string;
  readonly porcentajeIgvDefault: number;
  readonly monedaDefault: string;
  readonly estado: string;
}

export interface TaxResolution {
  readonly tipoOperacionCodigo: string;
  readonly tipoAfectacionCodigo: string;
  readonly tributoCodigo: string;
  readonly porcentajeIgv: number;
  readonly moneda: string;
  readonly origen: 'EMPRESA' | 'SUCURSAL' | 'PRODUCTO';
}

export interface SucursalTributariaRequest {
  readonly tipoOperacionDefaultId?: string | null;
  readonly tipoAfectacionDefaultId?: string | null;
  readonly tributoDefaultId?: string | null;
  readonly porcentajeIgvDefault?: number | null;
}

export interface ProductoTributariaRequest {
  readonly usaConfiguracionEmpresa: boolean;
  readonly afectoIgv?: boolean | null;
  readonly tipoAfectacionIgvId?: string | null;
  readonly tributoId?: string | null;
  readonly porcentajeImpuesto?: number | null;
}

export interface StockMovimientoRequest {
  readonly productoId: number;
  readonly almacenId: number;
  readonly almacenDestinoId?: number | null;
  readonly loteId?: number | null;
  readonly codigoLote?: string | null;
  readonly fechaFabricacion?: string | null;
  readonly fechaVencimiento?: string | null;
  readonly tipoMovimiento: string;
  readonly motivo: string;
  readonly cantidad: number;
  readonly costoUnitario?: number | null;
  readonly precioCompra?: number | null;
  readonly precioVenta?: number | null;
  readonly usuarioId?: string | null;
  readonly referencia?: string | null;
}

export interface KardexMovimiento {
  readonly id: number;
  readonly productoId: number;
  readonly productoSku: string;
  readonly productoNombre: string;
  readonly almacenId: number;
  readonly almacenCodigo: string;
  readonly tipoMovimiento: string;
  readonly motivo: string;
  readonly cantidad: number;
  readonly saldoResultante: number;
  readonly referencia: string | null;
  readonly fechaMovimiento: string;
}

export interface StockItem {
  readonly id: number;
  readonly productoId: number;
  readonly productoSku: string;
  readonly productoNombre: string;
  readonly almacenId: number;
  readonly almacenCodigo: string;
  readonly almacenNombre: string;
  readonly cantidad: number;
  readonly stockMinimo: number;
  readonly stockBajo: boolean;
  readonly sinStock: boolean;
}

export interface StockLoteItem {
  readonly id: number;
  readonly loteId: number;
  readonly codigoLote: string;
  readonly productoId: number;
  readonly productoSku: string;
  readonly productoNombre: string;
  readonly almacenId: number;
  readonly almacenCodigo: string;
  readonly almacenNombre: string;
  readonly stockActual: number;
  readonly fechaIngreso: string;
  readonly fechaVencimiento?: string | null;
  readonly estado: string;
}

export interface CompraDetalle {
  readonly id: number;
  readonly productoId: number;
  readonly productoSku: string;
  readonly productoNombre: string;
  readonly cantidad: number;
  readonly costoUnitario: number;
  readonly precioVenta: number;
  readonly total: number;
  readonly ventaProyectada: number;
  readonly gananciaProyectada: number;
  readonly margenPorcentaje: number;
  readonly codigoLote?: string | null;
  readonly fechaFabricacion?: string | null;
  readonly fechaVencimiento?: string | null;
}

export interface Compra {
  readonly id: number;
  readonly proveedorId?: number | null;
  readonly proveedorDocumento?: string | null;
  readonly proveedorNombre?: string | null;
  readonly tipoComprobante: string;
  readonly serie?: string | null;
  readonly correlativo?: string | null;
  readonly numeroComprobante: string;
  readonly fechaEmision?: string | null;
  readonly fechaIngreso: string;
  readonly almacenId: number;
  readonly almacenCodigo: string;
  readonly almacenNombre: string;
  readonly total: number;
  readonly ventaProyectada: number;
  readonly gananciaProyectada: number;
  readonly margenPorcentaje: number;
  readonly estado: string;
  readonly detalles: CompraDetalle[];
}

export interface CreateCompraRequest {
  readonly proveedorDocumento?: string | null;
  readonly proveedorNombre?: string | null;
  readonly tipoComprobante: 'FACTURA' | 'BOLETA' | 'TICKET' | 'OTRO';
  readonly serie?: string | null;
  readonly correlativo?: string | null;
  readonly numeroComprobante: string;
  readonly fechaEmision: string;
  readonly almacenId: number;
  readonly detalles: Array<{
    readonly productoId: number;
    readonly cantidad: number;
    readonly costoUnitario: number;
    readonly precioVenta: number;
    readonly codigoLote?: string | null;
    readonly fechaFabricacion?: string | null;
    readonly fechaVencimiento?: string | null;
  }>;
}

export interface CotizacionDetalle {
  readonly id: number;
  readonly productoId?: number | null;
  readonly productoSku?: string | null;
  readonly productoNombre?: string | null;
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
  readonly sucursalId: number;
  readonly sucursalCodigo: string;
  readonly sucursalNombre: string;
  readonly fechaEmision: string;
  readonly fechaVencimiento?: string | null;
  readonly moneda: string;
  readonly subtotal: number;
  readonly total: number;
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

export interface PageResponse<T> {
  readonly content: T[];
  readonly page: number;
  readonly size: number;
  readonly totalElements: number;
  readonly totalPages: number;
  readonly first: boolean;
  readonly last: boolean;
}

export interface CrmPageRequest {
  readonly query?: string | null;
  readonly estado?: string | null;
  readonly responsableId?: string | null;
  readonly page?: number | null;
  readonly size?: number | null;
}

export interface CrmProspectoPageRequest extends CrmPageRequest {
  readonly origen?: string | null;
  readonly canalIngreso?: string | null;
  readonly campania?: string | null;
  readonly fechaDesde?: string | null;
  readonly fechaHasta?: string | null;
}

export interface CrmOportunidadPageRequest extends CrmPageRequest {
  readonly etapaId?: number | null;
  readonly etapa?: string | null;
  readonly cierreDesde?: string | null;
  readonly cierreHasta?: string | null;
}

export interface CrmActividadPageRequest extends CrmPageRequest {
  readonly tipoActividad?: string | null;
  readonly usuarioId?: string | null;
  readonly prospectoId?: number | null;
  readonly oportunidadId?: number | null;
  readonly fechaDesde?: string | null;
  readonly fechaHasta?: string | null;
}

export interface CrmProspecto {
  readonly id: number;
  readonly tipoPersona: 'NATURAL' | 'JURIDICA' | string;
  readonly tipoDocumento?: string | null;
  readonly numeroDocumento?: string | null;
  readonly nombre: string;
  readonly razonSocial?: string | null;
  readonly nombreComercial?: string | null;
  readonly telefono?: string | null;
  readonly correo?: string | null;
  readonly direccion?: string | null;
  readonly origen: string;
  readonly canalIngreso?: string | null;
  readonly campania?: string | null;
  readonly landingUrl?: string | null;
  readonly landingKey?: string | null;
  readonly mensaje?: string | null;
  readonly tipoInteres?: string | null;
  readonly interesPrincipal?: string | null;
  readonly interesDetalle?: string | null;
  readonly presupuestoEstimado?: number | null;
  readonly fechaInteres?: string | null;
  readonly catalogoItemId?: number | null;
  readonly productoPendiente?: boolean | null;
  readonly metadataJson?: string | null;
  readonly estado: string;
  readonly nivelInteres?: string | null;
  readonly necesidadIdentificada?: boolean | null;
  readonly interesReal?: string | null;
  readonly presupuestoDefinido?: string | null;
  readonly tomadorDecision?: string | null;
  readonly fechaEstimadaCompra?: string | null;
  readonly scoreCalificacion?: number | null;
  readonly temperatura?: string | null;
  readonly motivoEspera?: string | null;
  readonly fechaProximoContacto?: string | null;
  readonly motivoPerdida?: string | null;
  readonly observacionPerdida?: string | null;
  readonly oportunidadId?: number | null;
  readonly responsableId: string;
  readonly observacion?: string | null;
  readonly clienteId?: number | null;
  readonly fechaConversion?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export interface CreateCrmProspectoRequest {
  readonly tipoPersona: 'NATURAL' | 'JURIDICA' | string;
  readonly tipoDocumento?: string | null;
  readonly numeroDocumento?: string | null;
  readonly nombre: string;
  readonly razonSocial?: string | null;
  readonly nombreComercial?: string | null;
  readonly telefono?: string | null;
  readonly correo?: string | null;
  readonly direccion?: string | null;
  readonly origen: string;
  readonly canalIngreso?: string | null;
  readonly campania?: string | null;
  readonly landingUrl?: string | null;
  readonly mensaje?: string | null;
  readonly tipoInteres?: string | null;
  readonly interesPrincipal?: string | null;
  readonly interesDetalle?: string | null;
  readonly presupuestoEstimado?: number | null;
  readonly fechaInteres?: string | null;
  readonly catalogoItemId?: number | null;
  readonly metadataJson?: string | null;
  readonly estado?: string | null;
  readonly nivelInteres?: string | null;
  readonly necesidadIdentificada?: boolean | null;
  readonly interesReal?: string | null;
  readonly presupuestoDefinido?: string | null;
  readonly tomadorDecision?: string | null;
  readonly fechaEstimadaCompra?: string | null;
  readonly motivoEspera?: string | null;
  readonly fechaProximoContacto?: string | null;
  readonly motivoPerdida?: string | null;
  readonly observacionPerdida?: string | null;
  readonly responsableId?: string | null;
  readonly observacion?: string | null;
}

export type UpdateCrmProspectoRequest = Partial<CreateCrmProspectoRequest>;

export interface RepartirCrmProspectosRequest {
  readonly prospectoIds: readonly number[];
  readonly responsableIds: readonly string[];
  readonly soloNuevos?: boolean | null;
}

export interface RepartirCrmProspectosResponse {
  readonly totalAsignados: number;
  readonly asignadosPorResponsable: Record<string, number>;
  readonly prospectos: CrmProspecto[];
}

export interface CrmCatalogoItem {
  readonly id: number;
  readonly tipoItem: string;
  readonly nombre: string;
  readonly descripcion?: string | null;
  readonly precioReferencial: number;
  readonly estado: string;
  readonly metadataJson?: string | null;
  readonly publicToken?: string | null;
  readonly publicEnabled?: boolean | null;
  readonly landingSlug?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export interface CreateCrmCatalogoItemRequest {
  readonly tipoItem: string;
  readonly nombre: string;
  readonly descripcion?: string | null;
  readonly precioReferencial?: number | null;
  readonly estado?: string | null;
  readonly metadataJson?: string | null;
  readonly publicEnabled?: boolean | null;
  readonly landingSlug?: string | null;
}

export type UpdateCrmCatalogoItemRequest = Partial<CreateCrmCatalogoItemRequest>;

export interface CrmOportunidad {
  readonly id: number;
  readonly prospectoId?: number | null;
  readonly prospectoNombre?: string | null;
  readonly clienteId?: number | null;
  readonly clienteNombre?: string | null;
  readonly tipoOportunidad?: string | null;
  readonly catalogoItemId?: number | null;
  readonly titulo: string;
  readonly descripcion?: string | null;
  readonly montoEstimado: number;
  readonly montoReal?: number | null;
  readonly probabilidad: number;
  readonly etapaId?: number | null;
  readonly etapa: string;
  readonly etapaNombre?: string | null;
  readonly etapaColor?: string | null;
  readonly fechaCierreEstimada?: string | null;
  readonly responsableId: string;
  readonly estado: string;
  readonly motivoPerdida?: string | null;
  readonly fechaCierreReal?: string | null;
  readonly fechaUltimaActualizacion?: string | null;
  readonly fechaGanada?: string | null;
  readonly fechaPerdida?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export interface CrmNegociacion {
  readonly id: number;
  readonly oportunidadId: number;
  readonly cotizacionId?: number | null;
  readonly codigoCotizacion?: string | null;
  readonly estado: string;
  readonly solicitudCliente: string;
  readonly precioOriginal: number;
  readonly descuento: number;
  readonly precioFinal: number;
  readonly formaPago?: string | null;
  readonly cuotas: number;
  readonly fechaInicio?: string | null;
  readonly fechaEntrega?: string | null;
  readonly observacion?: string | null;
  readonly resultado: string;
  readonly usuarioId?: string | null;
  readonly usuarioNombre?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export interface CreateCrmNegociacionRequest {
  readonly cotizacionId?: number | null;
  readonly estado?: string | null;
  readonly solicitudCliente?: string | null;
  readonly precioOriginal?: number | null;
  readonly descuento?: number | null;
  readonly precioFinal?: number | null;
  readonly formaPago?: string | null;
  readonly cuotas?: number | null;
  readonly fechaInicio?: string | null;
  readonly fechaEntrega?: string | null;
  readonly observacion?: string | null;
  readonly resultado?: string | null;
}

export interface CreateCrmOportunidadRequest {
  readonly prospectoId?: number | null;
  readonly clienteId?: number | null;
  readonly tipoOportunidad?: string | null;
  readonly catalogoItemId?: number | null;
  readonly titulo: string;
  readonly descripcion?: string | null;
  readonly montoEstimado?: number | null;
  readonly probabilidad?: number | null;
  readonly etapa?: string | null;
  readonly fechaCierreEstimada?: string | null;
  readonly responsableId?: string | null;
}

export interface UpdateCrmOportunidadRequest extends Partial<CreateCrmOportunidadRequest> {
  readonly estado?: string | null;
  readonly motivoPerdida?: string | null;
}

export interface CrmActividad {
  readonly id: number;
  readonly prospectoId?: number | null;
  readonly prospectoNombre?: string | null;
  readonly oportunidadId?: number | null;
  readonly oportunidadTitulo?: string | null;
  readonly clienteId?: number | null;
  readonly clienteNombre?: string | null;
  readonly tipoActividad: string;
  readonly asunto: string;
  readonly descripcion?: string | null;
  readonly fechaProgramada: string;
  readonly fechaRealizada?: string | null;
  readonly estado: string;
  readonly usuarioId: string;
  readonly resultado?: string | null;
  readonly resultadoContacto?: string | null;
  readonly nivelInteres?: string | null;
  readonly estadoProspectoResultado?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export interface CreateCrmActividadRequest {
  readonly prospectoId?: number | null;
  readonly oportunidadId?: number | null;
  readonly clienteId?: number | null;
  readonly tipoActividad: string;
  readonly asunto: string;
  readonly descripcion?: string | null;
  readonly fechaProgramada: string;
  readonly usuarioId?: string | null;
}

export interface RealizarCrmActividadRequest {
  readonly resultado?: string | null;
  readonly resultadoContacto?: string | null;
  readonly nivelInteres?: string | null;
  readonly estadoProspecto?: string | null;
}

export interface CrmEtapaResumen {
  readonly etapa: string;
  readonly cantidad: number;
  readonly monto: number;
}

export interface CrmEtapaPipeline {
  readonly id: number;
  readonly codigo: string;
  readonly nombre: string;
  readonly descripcion?: string | null;
  readonly orden: number;
  readonly probabilidadDefault?: number | null;
  readonly color: string;
  readonly icono?: string | null;
  readonly ganado: boolean;
  readonly perdido: boolean;
  readonly requiereValidacion?: boolean | null;
  readonly modoValidacion?: 'STRICT' | 'WARNING' | 'FREE' | string | null;
  readonly activo: boolean;
}

export interface CreateCrmEtapaPipelineRequest {
  readonly codigo: string;
  readonly nombre: string;
  readonly descripcion?: string | null;
  readonly orden?: number | null;
  readonly probabilidadDefault?: number | null;
  readonly color?: string | null;
  readonly icono?: string | null;
  readonly ganado?: boolean | null;
  readonly perdido?: boolean | null;
  readonly requiereValidacion?: boolean | null;
  readonly modoValidacion?: string | null;
  readonly activo?: boolean | null;
}

export type UpdateCrmEtapaPipelineRequest = Partial<CreateCrmEtapaPipelineRequest>;

export interface CrmPipelineColumn {
  readonly etapa: CrmEtapaPipeline;
  readonly cantidad: number;
  readonly monto: number;
  readonly oportunidades: CrmOportunidad[];
}

export interface CrmOportunidadHistorial {
  readonly id: number;
  readonly oportunidadId: number;
  readonly etapaOrigenId?: number | null;
  readonly etapaOrigenCodigo?: string | null;
  readonly etapaOrigenNombre?: string | null;
  readonly etapaDestinoId: number;
  readonly etapaDestinoCodigo: string;
  readonly etapaDestinoNombre: string;
  readonly usuarioId: string;
  readonly observacion?: string | null;
  readonly fechaCambio: string;
}

export interface CrmReporteBucket {
  readonly codigo: string;
  readonly nombre: string;
  readonly cantidad: number;
  readonly monto: number;
}

export interface CrmDashboard {
  readonly prospectosNuevos: number;
  readonly prospectosConvertidos: number;
  readonly oportunidadesAbiertas: number;
  readonly oportunidadesGanadas: number;
  readonly oportunidadesPerdidas: number;
  readonly actividadesPendientes: number;
  readonly actividadesVencidas: number;
  readonly leadsAutomaticos: number;
  readonly leadsManuales: number;
  readonly montoPipeline: number;
  readonly embudo: CrmEtapaResumen[];
}

export interface CrmReportes {
  readonly oportunidadesPorEtapa: CrmEtapaResumen[];
  readonly actividadesPendientes: number;
  readonly actividadesRealizadas: number;
  readonly prospectosConvertidos: number;
  readonly prospectosDescartados: number;
}

export type CrmOportunidadRecursoTipo = 'REQUISITO' | 'PAGO' | 'DOCUMENTO' | 'CIERRE';

export interface CrmOportunidadRecurso {
  readonly id: number;
  readonly oportunidadId: number;
  readonly tipo: CrmOportunidadRecursoTipo;
  readonly data: Readonly<Record<string, unknown>>;
  readonly hasArchivo: boolean;
  readonly archivoNombre?: string | null;
  readonly archivoMimeType?: string | null;
  readonly archivoSize?: number | null;
  readonly createdBy: string;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export interface CrmResultadosResumen {
  readonly ganadas: number;
  readonly perdidas: number;
  readonly montoGanado: number;
  readonly montoPerdido: number;
}

export interface CrmCanalTokenConfig {
  readonly id?: number | null;
  readonly canal: 'WEB' | 'WHATSAPP' | 'INSTAGRAM' | 'FACEBOOK' | string;
  readonly nombre: string;
  readonly accessToken?: string | null;
  readonly verifyToken?: string | null;
  readonly webhookUrl?: string | null;
  readonly appId?: string | null;
  readonly appSecret?: string | null;
  readonly phoneNumberId?: string | null;
  readonly wabaId?: string | null;
  readonly accessTokenConfigured?: boolean;
  readonly verifyTokenConfigured?: boolean;
  readonly appSecretConfigured?: boolean;
  readonly webhookVerifiedAt?: string | null;
  readonly lastConnectionTestAt?: string | null;
  readonly lastConnectionOk?: boolean | null;
  readonly lastConnectionMessage?: string | null;
  readonly wabaSubscribed?: boolean | null;
  readonly metaDisplayPhoneNumber?: string | null;
  readonly metaVerifiedName?: string | null;
  readonly metaQualityRating?: string | null;
  readonly metaTokenExpiresAt?: string | null;
  readonly activo: boolean;
  readonly metadataJson?: string | null;
}

export interface CrmInboxChannelAvailability {
  readonly canal: 'WHATSAPP' | 'FACEBOOK' | 'INSTAGRAM' | 'CORREO' | string;
  readonly nombre: string;
  readonly activo: boolean;
}

export interface UpdateCrmCanalTokenConfigRequest {
  readonly canal: string;
  readonly nombre?: string | null;
  readonly accessToken?: string | null;
  readonly verifyToken?: string | null;
  readonly webhookUrl?: string | null;
  readonly appId?: string | null;
  readonly appSecret?: string | null;
  readonly phoneNumberId?: string | null;
  readonly wabaId?: string | null;
  readonly activo?: boolean | null;
  readonly metadataJson?: string | null;
}

export interface WhatsappVerifyTokenResponse {
  readonly verifyToken: string;
  readonly generadoEn: string;
}

export interface WhatsappConnectionStatus {
  readonly activo: boolean;
  readonly configuracionCompleta: boolean;
  readonly accesoMetaValido: boolean;
  readonly wabaSuscrita: boolean;
  readonly webhookVerificado: boolean;
  readonly conectado: boolean;
  readonly displayPhoneNumber?: string | null;
  readonly verifiedName?: string | null;
  readonly qualityRating?: string | null;
  readonly tokenExpiresAt?: string | null;
  readonly permissions: string[];
  readonly message?: string | null;
  readonly testedAt?: string | null;
  readonly webhookVerifiedAt?: string | null;
}

export interface CrmWhatsappMessage {
  readonly id: number;
  readonly prospectoId?: number | null;
  readonly metaMessageId: string;
  readonly direccion: 'ENTRANTE' | 'SALIENTE' | string;
  readonly remitente?: string | null;
  readonly destinatario?: string | null;
  readonly tipoMensaje: string;
  readonly contenido?: string | null;
  readonly estado: string;
  readonly mensajeEn?: string | null;
  readonly leidoEn?: string | null;
  readonly createdAt?: string | null;
}

export interface CrmWhatsappConversation {
  readonly id: number;
  readonly prospectoId: number;
  readonly nombre: string;
  readonly telefono?: string | null;
  readonly correo?: string | null;
  readonly direccion?: string | null;
  readonly origen?: string | null;
  readonly canalIngreso?: string | null;
  readonly campania?: string | null;
  readonly interesPrincipal?: string | null;
  readonly estadoProspecto?: string | null;
  readonly nivelInteres?: string | null;
  readonly responsableId?: string | null;
  readonly estadoConversacion: 'ABIERTA' | 'RESUELTA' | 'ARCHIVADA' | string;
  readonly noLeidos: number;
  readonly ultimoMensaje?: string | null;
  readonly ultimaDireccion?: string | null;
  readonly ultimoMensajeEn?: string | null;
  readonly notaInterna?: string | null;
}

export interface CrmWhatsappConversationFilters {
  readonly query?: string | null;
  readonly estado?: string | null;
  readonly soloNoLeidas?: boolean;
  readonly soloMias?: boolean;
}

export interface SendCrmWhatsappMessageRequest {
  readonly mensaje: string;
  readonly previewUrl?: boolean | null;
}

export interface CrmCurrencyConfig {
  readonly id?: number | null;
  readonly moneda: 'USD' | 'EUR' | string;
  readonly nombre: string;
  readonly simbolo: string;
  readonly tipoCambioBase: number;
  readonly margenConversionPorcentaje: number;
  readonly tipoCambioVenta: number;
  readonly activo: boolean;
}

export interface UpdateCrmCurrencyConfigRequest {
  readonly moneda: string;
  readonly nombre?: string | null;
  readonly simbolo?: string | null;
  readonly tipoCambioBase?: number | null;
  readonly margenConversionPorcentaje?: number | null;
  readonly activo?: boolean | null;
}

export interface GenerarCotizacionDesdeOportunidadRequest extends CreateCotizacionRequest {
}

export interface UsuarioTenant {
  readonly id: number;
  readonly username: string;
  readonly nombres: string;
  readonly email: string | null;
  readonly activo: boolean;
  readonly roles: string[];
  readonly sucursales: Array<{
    readonly id: number;
    readonly codigo: string;
    readonly nombre: string;
  }>;
  readonly ultimoAcceso: string | null;
}

export interface UpdateUsuarioTenantRequest {
  readonly nombres: string;
  readonly email?: string | null;
  readonly activo?: boolean;
  readonly sucursalIds?: number[];
}

export interface SyncUsuarioRolesRequest {
  readonly rolCodigos: string[];
}

export interface CreateUsuarioTenantRequest {
  readonly username: string;
  readonly password: string;
  readonly nombres: string;
  readonly email?: string | null;
  readonly rolCodigos?: string[];
  readonly sucursalIds?: number[];
}

export type RoleScope = 'TENANT' | 'ERP' | 'CRM' | 'SHARED' | 'MIXED';

export interface Rol {
  readonly id: number;
  readonly codigo: string;
  readonly nombre: string;
  readonly descripcion: string | null;
  readonly ambito: RoleScope;
  readonly activo: boolean;
  readonly sistema: boolean;
  readonly deprecated: boolean;
  readonly editable: boolean;
  readonly eliminable: boolean;
  readonly gestionaPermisos: boolean;
  readonly permisos: Permiso[];
}

export interface Permiso {
  readonly id: number;
  readonly codigo: string;
  readonly nombre: string;
  readonly descripcion: string | null;
  readonly modulo: string | null;
  readonly activo: boolean;
  readonly sistema: boolean;
  readonly editable: boolean;
  readonly eliminable: boolean;
}

export interface CreateRolRequest {
  readonly codigo: string;
  readonly nombre: string;
  readonly descripcion?: string | null;
  readonly ambito: Exclude<RoleScope, 'MIXED'>;
}

export interface CreatePermisoRequest {
  readonly codigo: string;
  readonly nombre: string;
  readonly descripcion?: string | null;
  readonly modulo: string;
}

export interface TenantScopedOptions {
  readonly tenantId?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AdminSaasApiService {
  private static readonly MASTER_DATA_CACHE_TTL_MS = 120_000;

  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);
  private readonly session = inject(AuthSessionService);
  private readonly cache = new Map<
    string,
    { readonly expiresAt: number; readonly value$: Observable<unknown> }
  >();

  listEmpresas() {
    return this.cached('empresas', () =>
      this.http
        .get<ApiResponse<Empresa[]>>(this.apiUrl.url('saasCore', '/v1/saas/empresas'), {
          headers: this.session.apiHeaders(),
        })
        .pipe(map((response) => response.data)),
    );
  }

  createEmpresa(request: CreateEmpresaRequest) {
    return this.http
      .post<ApiResponse<Empresa>>(this.apiUrl.url('saasCore', '/v1/saas/empresas'), request, {
        headers: this.session.apiHeaders(),
      })
      .pipe(
        map((response) => response.data),
        tap(() => this.invalidateCache('empresas')),
      );
  }

  getCurrentEmpresa() {
    return this.http
      .get<ApiResponse<Empresa>>(this.apiUrl.url('saasCore', '/v1/saas/empresas/current'), {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  updateCurrentEmpresaBranding(request: UpdateCurrentEmpresaBrandingRequest) {
    const formData = new FormData();

    if (request.logoPanelFile) {
      formData.set('logoPanelFile', request.logoPanelFile, request.logoPanelFile.name);
    }
    if (request.clearLogoPanel) {
      formData.set('clearLogoPanel', 'true');
    }

    return this.http
      .put<ApiResponse<Empresa>>(
        this.apiUrl.url('saasCore', '/v1/saas/empresas/current/branding'),
        formData,
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  listPlanes() {
    return this.cached('planes', () =>
      this.http
        .get<ApiResponse<Plan[]>>(this.apiUrl.url('saasCore', '/v1/saas/planes'), {
          headers: this.session.apiHeaders(),
        })
        .pipe(map((response) => response.data)),
    );
  }

  createPlan(request: CreatePlanRequest) {
    return this.http
      .post<ApiResponse<Plan>>(this.apiUrl.url('saasCore', '/v1/saas/planes'), request, {
        headers: this.session.apiHeaders(),
      })
      .pipe(
        map((response) => response.data),
        tap(() => this.invalidateCache('planes')),
      );
  }

  updatePlan(id: number, request: UpdatePlanRequest) {
    return this.http
      .put<ApiResponse<Plan>>(this.apiUrl.url('saasCore', `/v1/saas/planes/${id}`), request, {
        headers: this.session.apiHeaders(),
      })
      .pipe(
        map((response) => response.data),
        tap(() => this.invalidateCache('planes')),
      );
  }

  listModulos() {
    return this.cached('modulos-globales', () =>
      this.http
        .get<ApiResponse<ModuloGlobal[]>>(this.apiUrl.url('saasCore', '/v1/saas/modulos'), {
          headers: this.session.apiHeaders(),
        })
        .pipe(map((response) => response.data)),
    );
  }

  createModulo(request: CreateModuloRequest) {
    return this.http
      .post<ApiResponse<ModuloGlobal>>(this.apiUrl.url('saasCore', '/v1/saas/modulos'), request, {
        headers: this.session.apiHeaders(),
      })
      .pipe(
        map((response) => response.data),
        tap(() => this.invalidateCache('modulos-globales')),
      );
  }

  updateModulo(id: number, request: UpdateModuloRequest) {
    return this.http
      .put<ApiResponse<ModuloGlobal>>(
        this.apiUrl.url('saasCore', `/v1/saas/modulos/${id}`),
        request,
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(
        map((response) => response.data),
        tap(() => this.invalidateCache('modulos-globales')),
      );
  }

  listEmpresaModulos(empresaId: number) {
    return this.http
      .get<ApiResponse<EmpresaModulo[]>>(
        this.apiUrl.url('saasCore', `/v1/saas/empresas/${empresaId}/modulos`),
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  syncEmpresaModulos(empresaId: number, request: SyncEmpresaModulosRequest) {
    return this.http
      .put<ApiResponse<EmpresaModulo[]>>(
        this.apiUrl.url('saasCore', `/v1/saas/empresas/${empresaId}/modulos`),
        request,
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  getMeModules() {
    return this.http
      .get<ApiResponse<ActiveModulesResponse>>(this.apiUrl.url('saasCore', '/v1/me/modules'), {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  listSuscripciones(empresaId?: number) {
    const params = empresaId ? new HttpParams().set('empresaId', empresaId) : undefined;

    return this.http
      .get<ApiResponse<Suscripcion[]>>(this.apiUrl.url('saasCore', '/v1/saas/suscripciones'), {
        headers: this.session.apiHeaders(),
        params,
      })
      .pipe(map((response) => response.data));
  }

  createSuscripcion(request: CreateSuscripcionRequest) {
    return this.http
      .post<ApiResponse<Suscripcion>>(
        this.apiUrl.url('saasCore', '/v1/saas/suscripciones'),
        request,
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  updateSuscripcionEstado(id: number, request: UpdateSuscripcionEstadoRequest) {
    return this.http
      .put<ApiResponse<Suscripcion>>(
        this.apiUrl.url('saasCore', `/v1/saas/suscripciones/${id}/estado`),
        request,
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  listAlmacenes() {
    return this.cached('almacenes', () =>
      this.http
        .get<ApiResponse<Almacen[]>>(this.apiUrl.url('saasCore', '/v1/saas/almacenes'), {
          headers: this.session.apiHeaders(),
        })
        .pipe(map((response) => response.data)),
    );
  }

  createAlmacen(request: CreateAlmacenRequest) {
    return this.http
      .post<ApiResponse<Almacen>>(this.apiUrl.url('saasCore', '/v1/saas/almacenes'), request, {
        headers: this.session.apiHeaders(),
      })
      .pipe(
        map((response) => response.data),
        tap(() => this.invalidateCache('almacenes')),
      );
  }

  listSucursales(options: TenantScopedOptions = {}) {
    const tenantId = options.tenantId?.trim() || null;
    return this.cached(this.tenantCacheKey('sucursales', tenantId), () =>
      this.http
        .get<ApiResponse<Sucursal[]>>(this.apiUrl.url('saasCore', '/v1/saas/sucursales'), {
          headers: this.session.apiHeaders(tenantId),
        })
        .pipe(map((response) => response.data)),
    );
  }

  createSucursal(request: CreateSucursalRequest) {
    return this.http
      .post<ApiResponse<Sucursal>>(this.apiUrl.url('saasCore', '/v1/saas/sucursales'), request, {
        headers: this.session.apiHeaders(),
      })
      .pipe(
        map((response) => response.data),
        tap(() => this.invalidateCache('sucursales')),
      );
  }

  updateSucursal(id: number, request: UpdateSucursalRequest) {
    return this.http
      .put<ApiResponse<Sucursal>>(
        this.apiUrl.url('saasCore', `/v1/saas/sucursales/${id}`),
        request,
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(
        map((response) => response.data),
        tap(() => this.invalidateCache('sucursales')),
      );
  }

  changeSucursalStatus(id: number, activo: boolean) {
    return this.http
      .patch<ApiResponse<Sucursal>>(
        this.apiUrl.url('saasCore', `/v1/saas/sucursales/${id}/estado`),
        { activo },
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(
        map((response) => response.data),
        tap(() => this.invalidateCache('sucursales')),
      );
  }

  getConfiguracionTributaria() {
    return this.http
      .get<ApiResponse<ConfiguracionTributaria>>(
        this.apiUrl.url('saasCore', '/v1/saas/configuracion/tributaria'),
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  updateConfiguracionTributaria(request: Omit<ConfiguracionTributaria, 'id'>) {
    return this.http
      .put<ApiResponse<ConfiguracionTributaria>>(
        this.apiUrl.url('saasCore', '/v1/saas/configuracion/tributaria'),
        request,
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  getSucursalTributaria(id: number) {
    return this.http
      .get<ApiResponse<TaxResolution>>(
        this.apiUrl.url('saasCore', `/v1/saas/configuracion/sucursales/${id}/tributaria`),
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  updateSucursalTributaria(id: number, request: SucursalTributariaRequest) {
    return this.http
      .put<ApiResponse<TaxResolution>>(
        this.apiUrl.url('saasCore', `/v1/saas/configuracion/sucursales/${id}/tributaria`),
        request,
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  getProductoTributaria(id: number) {
    return this.http
      .get<ApiResponse<TaxResolution>>(
        this.apiUrl.url('saasCore', `/v1/saas/configuracion/productos/${id}/tributaria`),
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  updateProductoTributaria(id: number, request: ProductoTributariaRequest) {
    return this.http
      .put<ApiResponse<TaxResolution>>(
        this.apiUrl.url('saasCore', `/v1/saas/configuracion/productos/${id}/tributaria`),
        request,
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  listUbigeos(query?: string) {
    let params = new HttpParams();
    const normalizedQuery = query?.trim() || '';
    if (query?.trim()) {
      params = params.set('query', normalizedQuery);
    }

    return this.cached(
      `ubigeos:${normalizedQuery.toLowerCase()}`,
      () =>
        this.http
          .get<ApiResponse<Ubigeo[]>>(this.apiUrl.url('saasCore', '/v1/saas/ubigeos'), {
            headers: this.session.apiHeaders(),
            params,
          })
          .pipe(map((response) => response.data)),
      600_000,
    );
  }

  listClientes(options: TenantScopedOptions = {}) {
    const tenantId = options.tenantId?.trim() || null;
    return this.cached(this.tenantCacheKey('clientes', tenantId), () =>
      this.http
        .get<ApiResponse<Cliente[]>>(this.apiUrl.url('saasCore', '/v1/saas/clientes'), {
          headers: this.session.apiHeaders(tenantId),
        })
        .pipe(map((response) => response.data)),
    );
  }

  createCliente(request: CreateClienteRequest, options: TenantScopedOptions = {}) {
    const tenantId = options.tenantId?.trim() || null;
    return this.http
      .post<ApiResponse<Cliente>>(this.apiUrl.url('saasCore', '/v1/saas/clientes'), request, {
        headers: this.session.apiHeaders(tenantId),
      })
      .pipe(
        map((response) => response.data),
        tap(() => this.invalidateCache('clientes')),
      );
  }

  updateCliente(id: number, request: UpdateClienteRequest, options: TenantScopedOptions = {}) {
    const tenantId = options.tenantId?.trim() || null;
    return this.http
      .put<ApiResponse<Cliente>>(this.apiUrl.url('saasCore', `/v1/saas/clientes/${id}`), request, {
        headers: this.session.apiHeaders(tenantId),
      })
      .pipe(
        map((response) => response.data),
        tap(() => this.invalidateCache('clientes')),
      );
  }

  deleteCliente(id: number, options: TenantScopedOptions = {}) {
    const tenantId = options.tenantId?.trim() || null;
    return this.http
      .delete<ApiResponse<string>>(this.apiUrl.url('saasCore', `/v1/saas/clientes/${id}`), {
        headers: this.session.apiHeaders(tenantId),
      })
      .pipe(
        map((response) => response.data),
        tap(() => this.invalidateCache('clientes')),
      );
  }

  registrarClienteAbono(
    id: number,
    request: RegistrarClienteAbonoRequest,
    options: TenantScopedOptions = {},
  ) {
    const tenantId = options.tenantId?.trim() || null;
    return this.http
      .post<ApiResponse<ClienteAbono>>(
        this.apiUrl.url('saasCore', `/v1/saas/clientes/${id}/abonos`),
        request,
        {
          headers: this.session.apiHeaders(tenantId),
        },
      )
      .pipe(map((response) => response.data));
  }

  listClienteAbonos(id: number, options: TenantScopedOptions = {}) {
    const tenantId = options.tenantId?.trim() || null;
    return this.http
      .get<ApiResponse<ClienteAbono[]>>(
        this.apiUrl.url('saasCore', `/v1/saas/clientes/${id}/abonos`),
        {
          headers: this.session.apiHeaders(tenantId),
        },
      )
      .pipe(map((response) => response.data));
  }

  listCajas(estado?: string, sucursalId?: number) {
    let params = new HttpParams();
    if (estado) {
      params = params.set('estado', estado);
    }
    if (sucursalId) {
      params = params.set('sucursalId', sucursalId);
    }

    return this.http
      .get<ApiResponse<Caja[]>>(this.apiUrl.url('saasCore', '/v1/saas/cajas'), {
        headers: this.session.apiHeaders(),
        params: params.keys().length ? params : undefined,
      })
      .pipe(map((response) => response.data));
  }

  abrirCaja(request: AbrirCajaRequest) {
    return this.http
      .post<ApiResponse<Caja>>(this.apiUrl.url('saasCore', '/v1/saas/cajas/abrir'), request, {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  cerrarCaja(cajaId: number, request: CerrarCajaRequest) {
    return this.http
      .post<ApiResponse<Caja>>(
        this.apiUrl.url('saasCore', `/v1/saas/cajas/${cajaId}/cerrar`),
        request,
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  registrarMovimientoCaja(cajaId: number, request: RegistrarMovimientoCajaRequest) {
    return this.http
      .post<ApiResponse<CajaMovimiento>>(
        this.apiUrl.url('saasCore', `/v1/saas/cajas/${cajaId}/movimientos`),
        request,
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  depositarCuentaEmpresarial(cajaId: number, request: DepositoCuentaEmpresarialRequest) {
    return this.http
      .post<
        ApiResponse<CajaMovimiento>
      >(this.apiUrl.url('saasCore', `/v1/saas/cajas/${cajaId}/depositos-cuenta-empresarial`), request, { headers: this.session.apiHeaders() })
      .pipe(map((response) => response.data));
  }

  listCajaMovimientos(cajaId: number) {
    return this.http
      .get<ApiResponse<CajaMovimiento[]>>(
        this.apiUrl.url('saasCore', `/v1/saas/cajas/${cajaId}/movimientos`),
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  listVentas(q?: string) {
    const params = q?.trim() ? new HttpParams().set('q', q.trim()) : undefined;
    return this.http
      .get<ApiResponse<VentasListPayload>>(this.apiUrl.url('saasCore', '/v1/saas/ventas'), {
        headers: this.session.apiHeaders(),
        params,
      })
      .pipe(
        map((response) => {
          const payload = response.data;
          if (Array.isArray(payload)) {
            return payload;
          }
          if (payload && Array.isArray(payload.items)) {
            return [...payload.items];
          }
          return [] as VentaRecord[];
        }),
      );
  }

  streamVentasStatus(): Observable<VentaStatusStreamEvent> {
    return new Observable<VentaStatusStreamEvent>((subscriber) => {
      const controller = new AbortController();
      const headers = this.toFetchHeaders(this.session.apiHeaders());
      const endpoint = this.apiUrl.url('saasCore', '/v1/saas/ventas/events');

      const start = async () => {
        try {
          const response = await fetch(endpoint, {
            method: 'GET',
            headers,
            signal: controller.signal,
          });

          if (!response.ok || !response.body) {
            throw new Error(`SSE_HTTP_${response.status}`);
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let buffer = '';

          while (true) {
            const { value, done } = await reader.read();
            if (done) {
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            buffer = this.consumeSseBuffer(buffer, (eventName, eventData) => {
              if (eventName !== 'venta-status' || !eventData.trim()) {
                return;
              }
              try {
                const payload = JSON.parse(eventData) as VentaStatusStreamEvent;
                if (payload.externalId) {
                  subscriber.next(payload);
                }
              } catch {
                // ignore malformed SSE frame
              }
            });
          }

          if (!controller.signal.aborted) {
            subscriber.complete();
          }
        } catch (error) {
          if (!controller.signal.aborted) {
            subscriber.error(error);
          }
        }
      };

      void start();
      return () => controller.abort();
    });
  }

  registrarVentaCaja(cajaId: number, request: RegistrarVentaCajaRequest) {
    return this.http
      .post<ApiResponse<RegistrarVentaCajaResponse>>(
        this.apiUrl.url('saasCore', `/v1/saas/cajas/${cajaId}/ventas`),
        request,
        {
          headers: this.session.apiHeaders(),
          timeout: 20000,
        },
      )
      .pipe(map((response) => response.data));
  }

  registrarGuiaRemision(request: RegistrarGuiaRemisionRequest) {
    return this.http
      .post<ApiResponse<RegistrarGuiaRemisionResponse>>(
        this.apiUrl.url('saasCore', '/v1/saas/guias/remision'),
        request,
        {
          headers: this.session.apiHeaders(),
          timeout: 30000,
        },
      )
      .pipe(map((response) => response.data));
  }

  listGuiasRemision(q?: string) {
    const params = q?.trim() ? new HttpParams().set('q', q.trim()) : undefined;
    return this.http
      .get<ApiResponse<GuiaRemisionRecord[]>>(
        this.apiUrl.url('saasCore', '/v1/saas/guias/remision'),
        {
          headers: this.session.apiHeaders(),
          params,
        },
      )
      .pipe(map((response) => response.data ?? []));
  }

  registrarNotaCredito(request: RegistrarNotaFiscalRequest) {
    return this.http
      .post<ApiResponse<RegistrarNotaFiscalResponse>>(
        this.apiUrl.url('saasCore', '/v1/saas/notas/credito'),
        request,
        {
          headers: this.session.apiHeaders(),
          timeout: 30000,
        },
      )
      .pipe(map((response) => response.data));
  }

  registrarNotaDebito(request: RegistrarNotaFiscalRequest) {
    return this.http
      .post<ApiResponse<RegistrarNotaFiscalResponse>>(
        this.apiUrl.url('saasCore', '/v1/saas/notas/debito'),
        request,
        {
          headers: this.session.apiHeaders(),
          timeout: 30000,
        },
      )
      .pipe(map((response) => response.data));
  }

  listNotasCredito(q?: string) {
    const params = q?.trim() ? new HttpParams().set('q', q.trim()) : undefined;
    return this.http
      .get<ApiResponse<NotaFiscalRecord[]>>(this.apiUrl.url('saasCore', '/v1/saas/notas/credito'), {
        headers: this.session.apiHeaders(),
        params,
      })
      .pipe(map((response) => response.data ?? []));
  }

  listNotasDebito(q?: string) {
    const params = q?.trim() ? new HttpParams().set('q', q.trim()) : undefined;
    return this.http
      .get<ApiResponse<NotaFiscalRecord[]>>(this.apiUrl.url('saasCore', '/v1/saas/notas/debito'), {
        headers: this.session.apiHeaders(),
        params,
      })
      .pipe(map((response) => response.data ?? []));
  }

  listProductos(almacenId?: number) {
    const params = almacenId ? new HttpParams().set('almacenId', almacenId) : undefined;

    return this.http
      .get<ApiResponse<Producto[]>>(this.apiUrl.url('saasCore', '/v1/saas/inventory/productos'), {
        headers: this.session.apiHeaders(),
        params,
      })
      .pipe(map((response) => response.data));
  }

  listCategoriasProducto() {
    return this.cached('categorias-producto', () =>
      this.http
        .get<ApiResponse<CategoriaProducto[]>>(
          this.apiUrl.url('saasCore', '/v1/saas/inventory/categorias'),
          {
            headers: this.session.apiHeaders(),
          },
        )
        .pipe(map((response) => response.data)),
    );
  }

  createProducto(request: CreateProductoRequest) {
    return this.http
      .post<ApiResponse<Producto>>(
        this.apiUrl.url('saasCore', '/v1/saas/inventory/productos'),
        request,
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(
        map((response) => response.data),
        tap(() => this.invalidateCache('categorias-producto')),
      );
  }

  updateProducto(id: number, request: UpdateProductoRequest) {
    return this.http
      .put<ApiResponse<Producto>>(
        this.apiUrl.url('saasCore', `/v1/saas/inventory/productos/${id}`),
        request,
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(
        map((response) => response.data),
        tap(() => this.invalidateCache('categorias-producto')),
      );
  }

  registrarMovimientoStock(request: StockMovimientoRequest) {
    return this.http
      .post<ApiResponse<KardexMovimiento>>(
        this.apiUrl.url('saasCore', '/v1/saas/inventory/movimientos'),
        request,
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  listStock(productoId?: number, almacenId?: number) {
    let params = new HttpParams();
    if (productoId) {
      params = params.set('productoId', productoId);
    }
    if (almacenId) {
      params = params.set('almacenId', almacenId);
    }

    return this.http
      .get<ApiResponse<StockItem[]>>(this.apiUrl.url('saasCore', '/v1/saas/inventory/stock'), {
        headers: this.session.apiHeaders(),
        params: params.keys().length ? params : undefined,
      })
      .pipe(map((response) => response.data));
  }

  listStockLotes(productoId?: number, almacenId?: number) {
    let params = new HttpParams();
    if (productoId) {
      params = params.set('productoId', productoId);
    }
    if (almacenId) {
      params = params.set('almacenId', almacenId);
    }
    return this.http
      .get<ApiResponse<StockLoteItem[]>>(
        this.apiUrl.url('saasCore', '/v1/saas/inventory/stock/lotes'),
        {
          headers: this.session.apiHeaders(),
          params,
        },
      )
      .pipe(map((response) => response.data));
  }

  listCompras() {
    return this.http
      .get<ApiResponse<Compra[]>>(this.apiUrl.url('saasCore', '/v1/saas/inventory/compras'), {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  createCompra(request: CreateCompraRequest) {
    return this.http
      .post<ApiResponse<Compra>>(
        this.apiUrl.url('saasCore', '/v1/saas/inventory/compras'),
        request,
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  listCotizaciones(crmOportunidadId?: number | null) {
    return this.http
      .get<ApiResponse<Cotizacion[]>>(this.apiUrl.url('saasCore', '/v1/saas/cotizaciones'), {
        headers: this.session.apiHeaders(),
        params: crmOportunidadId ? { crmOportunidadId } : undefined,
      })
      .pipe(map((response) => response.data));
  }

  listPromocionesCotizacion() {
    return this.http
      .get<ApiResponse<PromocionCotizacion[]>>(this.apiUrl.url('saasCore', '/v1/saas/cotizaciones/promociones'), {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  createPromocionCotizacion(request: CreatePromocionCotizacionRequest) {
    return this.http
      .post<ApiResponse<PromocionCotizacion>>(
        this.apiUrl.url('saasCore', '/v1/saas/cotizaciones/promociones'),
        request,
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  createCotizacion(request: CreateCotizacionRequest) {
    return this.http
      .post<ApiResponse<Cotizacion>>(
        this.apiUrl.url('saasCore', '/v1/saas/cotizaciones'),
        request,
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  updateCotizacionEstado(id: number, request: string | UpdateCotizacionEstadoRequest) {
    const payload = typeof request === 'string' ? { estado: request } : request;
    return this.http
      .put<ApiResponse<Cotizacion>>(
        this.apiUrl.url('saasCore', `/v1/saas/cotizaciones/${id}/estado`),
        payload,
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  getCotizacionPdf(id: number) {
    return this.http
      .get<ApiResponse<CotizacionPdfResponse>>(
        this.apiUrl.url('saasCore', `/v1/saas/cotizaciones/${id}/pdf`),
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  sendCotizacionEmail(id: number) {
    return this.http
      .post<ApiResponse<SendCotizacionEmailResponse>>(
        this.apiUrl.url('saasCore', `/v1/saas/cotizaciones/${id}/enviar-correo`),
        null,
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  convertCotizacionVenta(id: number, request: ConvertCotizacionVentaRequest) {
    return this.http
      .post<
        ApiResponse<ConvertCotizacionVentaResponse>
      >(this.apiUrl.url('saasCore', `/v1/saas/cotizaciones/${id}/convertir-venta`), request, { headers: this.session.apiHeaders() })
      .pipe(map((response) => response.data));
  }

  listCrmCatalogo(tipoItem?: string | null) {
    return this.http
      .get<ApiResponse<CrmCatalogoItem[]>>(this.apiUrl.url('saasCore', '/v1/saas/crm/catalogo'), {
        headers: this.session.apiHeaders(),
        params: tipoItem ? { tipoItem } : undefined,
      })
      .pipe(map((response) => response.data));
  }

  listCrmIntegraciones() {
    return this.http
      .get<ApiResponse<CrmCanalTokenConfig[]>>(this.apiUrl.url('saasCore', '/v1/saas/crm/integraciones'), {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  listCrmInboxChannels() {
    return this.http
      .get<ApiResponse<CrmInboxChannelAvailability[]>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/bandeja/canales'),
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  saveCrmIntegracion(request: UpdateCrmCanalTokenConfigRequest) {
    return this.http
      .put<ApiResponse<CrmCanalTokenConfig>>(this.apiUrl.url('saasCore', '/v1/saas/crm/integraciones'), request, {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  generateCrmWhatsappVerifyToken() {
    return this.http
      .post<ApiResponse<WhatsappVerifyTokenResponse>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/whatsapp/configuracion/verify-token'),
        null,
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  testCrmWhatsappConnection() {
    return this.http
      .post<ApiResponse<WhatsappConnectionStatus>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/whatsapp/configuracion/probar'),
        null,
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  getCrmWhatsappConnectionStatus() {
    return this.http
      .get<ApiResponse<WhatsappConnectionStatus>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/whatsapp/estado'),
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  listCrmWhatsappConversations(filters: CrmWhatsappConversationFilters = {}) {
    let params = new HttpParams();
    if (filters.query?.trim()) {
      params = params.set('query', filters.query.trim());
    }
    if (filters.estado?.trim()) {
      params = params.set('estado', filters.estado.trim());
    }
    if (filters.soloNoLeidas) {
      params = params.set('soloNoLeidas', true);
    }
    if (filters.soloMias) {
      params = params.set('soloMias', true);
    }

    return this.http
      .get<ApiResponse<CrmWhatsappConversation[]>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/whatsapp/conversaciones'),
        { headers: this.session.apiHeaders(), params },
      )
      .pipe(map((response) => response.data));
  }

  markCrmWhatsappConversationRead(prospectoId: number) {
    return this.http
      .put<ApiResponse<CrmWhatsappConversation>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/whatsapp/conversaciones/${prospectoId}/leer`),
        {},
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  updateCrmWhatsappConversationStatus(prospectoId: number, estado: 'ABIERTA' | 'RESUELTA' | 'ARCHIVADA') {
    return this.http
      .put<ApiResponse<CrmWhatsappConversation>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/whatsapp/conversaciones/${prospectoId}/estado`),
        { estado },
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  assignCrmWhatsappConversation(prospectoId: number, responsableId: string | null) {
    return this.http
      .put<ApiResponse<CrmWhatsappConversation>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/whatsapp/conversaciones/${prospectoId}/asignacion`),
        { responsableId },
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  updateCrmWhatsappConversationNote(prospectoId: number, nota: string | null) {
    return this.http
      .put<ApiResponse<CrmWhatsappConversation>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/whatsapp/conversaciones/${prospectoId}/nota`),
        { nota },
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  listCrmWhatsappMessages(prospectoId: number) {
    return this.http
      .get<ApiResponse<CrmWhatsappMessage[]>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/prospectos/${prospectoId}/whatsapp/mensajes`),
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  sendCrmWhatsappMessage(prospectoId: number, request: SendCrmWhatsappMessageRequest) {
    return this.http
      .post<ApiResponse<CrmWhatsappMessage>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/prospectos/${prospectoId}/whatsapp/mensajes`),
        request,
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  listCrmCurrencyConfig() {
    return this.http
      .get<ApiResponse<CrmCurrencyConfig[]>>(this.apiUrl.url('saasCore', '/v1/saas/crm/configuracion/monedas'), {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  saveCrmCurrencyConfig(request: UpdateCrmCurrencyConfigRequest) {
    return this.http
      .put<ApiResponse<CrmCurrencyConfig>>(this.apiUrl.url('saasCore', '/v1/saas/crm/configuracion/monedas'), request, {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  createCrmCatalogoItem(request: CreateCrmCatalogoItemRequest) {
    return this.http
      .post<ApiResponse<CrmCatalogoItem>>(this.apiUrl.url('saasCore', '/v1/saas/crm/catalogo'), request, {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  updateCrmCatalogoItem(id: number, request: UpdateCrmCatalogoItemRequest) {
    return this.http
      .put<ApiResponse<CrmCatalogoItem>>(this.apiUrl.url('saasCore', `/v1/saas/crm/catalogo/${id}`), request, {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  listCrmProspectos() {
    return this.http
      .get<ApiResponse<CrmProspecto[]>>(this.apiUrl.url('saasCore', '/v1/saas/crm/prospectos'), {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  listCrmProspectosPage(request: CrmProspectoPageRequest = {}) {
    return this.http
      .get<ApiResponse<PageResponse<CrmProspecto>>>(this.apiUrl.url('saasCore', '/v1/saas/crm/prospectos/page'), {
        headers: this.session.apiHeaders(),
        params: this.buildQueryParams(request),
      })
      .pipe(map((response) => response.data));
  }

  getCrmProspecto(id: number) {
    return this.http
      .get<ApiResponse<CrmProspecto>>(this.apiUrl.url('saasCore', `/v1/saas/crm/prospectos/${id}`), {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  createCrmProspecto(request: CreateCrmProspectoRequest) {
    return this.http
      .post<ApiResponse<CrmProspecto>>(this.apiUrl.url('saasCore', '/v1/saas/crm/prospectos'), request, {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  updateCrmProspecto(id: number, request: UpdateCrmProspectoRequest) {
    return this.http
      .put<ApiResponse<CrmProspecto>>(this.apiUrl.url('saasCore', `/v1/saas/crm/prospectos/${id}`), request, {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  repartirCrmProspectos(request: RepartirCrmProspectosRequest) {
    return this.http
      .post<ApiResponse<RepartirCrmProspectosResponse>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/prospectos/repartir'),
        request,
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  convertirCrmProspectoCliente(id: number) {
    return this.http
      .post<ApiResponse<Cliente>>(this.apiUrl.url('saasCore', `/v1/saas/crm/prospectos/${id}/convertir-cliente`), null, {
        headers: this.session.apiHeaders(),
      })
      .pipe(
        map((response) => response.data),
        tap(() => this.invalidateCache('clientes')),
      );
  }

  listCrmEtapas() {
    return this.http
      .get<ApiResponse<CrmEtapaPipeline[]>>(this.apiUrl.url('saasCore', '/v1/saas/crm/etapas'), {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  createCrmEtapa(request: CreateCrmEtapaPipelineRequest) {
    return this.http
      .post<ApiResponse<CrmEtapaPipeline>>(this.apiUrl.url('saasCore', '/v1/saas/crm/etapas'), request, {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  updateCrmEtapa(id: number, request: UpdateCrmEtapaPipelineRequest) {
    return this.http
      .put<ApiResponse<CrmEtapaPipeline>>(this.apiUrl.url('saasCore', `/v1/saas/crm/etapas/${id}`), request, {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  getCrmPipeline() {
    return this.http
      .get<ApiResponse<CrmPipelineColumn[]>>(this.apiUrl.url('saasCore', '/v1/saas/crm/pipeline'), {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  listCrmOportunidades() {
    return this.http
      .get<ApiResponse<CrmOportunidad[]>>(this.apiUrl.url('saasCore', '/v1/saas/crm/oportunidades'), {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  listCrmOportunidadesPage(request: CrmOportunidadPageRequest = {}) {
    return this.http
      .get<ApiResponse<PageResponse<CrmOportunidad>>>(this.apiUrl.url('saasCore', '/v1/saas/crm/oportunidades/page'), {
        headers: this.session.apiHeaders(),
        params: this.buildQueryParams(request),
      })
      .pipe(map((response) => response.data));
  }

  listCrmResultadosPage(request: CrmOportunidadPageRequest = {}) {
    return this.http
      .get<ApiResponse<PageResponse<CrmOportunidad>>>(this.apiUrl.url('saasCore', '/v1/saas/crm/resultados/page'), {
        headers: this.session.apiHeaders(),
        params: this.buildQueryParams(request),
      })
      .pipe(map((response) => response.data));
  }

  listCrmSeguimientoPagosPage(request: CrmOportunidadPageRequest = {}) {
    return this.http
      .get<ApiResponse<PageResponse<CrmOportunidad>>>(this.apiUrl.url('saasCore', '/v1/saas/crm/pagos/seguimiento/page'), {
        headers: this.session.apiHeaders(),
        params: this.buildQueryParams(request),
      })
      .pipe(map((response) => response.data));
  }

  getCrmOportunidad(id: number) {
    return this.http
      .get<ApiResponse<CrmOportunidad>>(this.apiUrl.url('saasCore', `/v1/saas/crm/oportunidades/${id}`), {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  createCrmOportunidad(request: CreateCrmOportunidadRequest) {
    return this.http
      .post<ApiResponse<CrmOportunidad>>(this.apiUrl.url('saasCore', '/v1/saas/crm/oportunidades'), request, {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  updateCrmOportunidad(id: number, request: UpdateCrmOportunidadRequest) {
    return this.http
      .put<ApiResponse<CrmOportunidad>>(this.apiUrl.url('saasCore', `/v1/saas/crm/oportunidades/${id}`), request, {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  moverCrmOportunidadEtapa(id: number, etapaId: number, observacion?: string | null) {
    return this.http
      .put<ApiResponse<CrmOportunidad>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/oportunidades/${id}/etapa`),
        { etapaId, observacion },
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  getCrmOportunidadHistorial(id: number) {
    return this.http
      .get<ApiResponse<CrmOportunidadHistorial[]>>(this.apiUrl.url('saasCore', `/v1/saas/crm/oportunidades/${id}/historial`), {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  marcarCrmOportunidadGanada(id: number) {
    return this.http
      .post<ApiResponse<CrmOportunidad>>(this.apiUrl.url('saasCore', `/v1/saas/crm/oportunidades/${id}/marcar-ganada`), null, {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  marcarCrmOportunidadPerdida(id: number, motivo: string) {
    return this.http
      .post<ApiResponse<CrmOportunidad>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/oportunidades/${id}/marcar-perdida`),
        { motivo },
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  generarCotizacionDesdeCrmOportunidad(id: number, request: GenerarCotizacionDesdeOportunidadRequest) {
    return this.http
      .post<ApiResponse<Cotizacion>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/oportunidades/${id}/generar-cotizacion`),
        request,
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  listCrmNegociaciones(oportunidadId: number) {
    return this.http
      .get<ApiResponse<CrmNegociacion[]>>(this.apiUrl.url('saasCore', `/v1/saas/crm/oportunidades/${oportunidadId}/negociaciones`), {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  createCrmNegociacion(oportunidadId: number, request: CreateCrmNegociacionRequest) {
    return this.http
      .post<ApiResponse<CrmNegociacion>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/oportunidades/${oportunidadId}/negociaciones`),
        request,
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  listCrmActividades() {
    return this.http
      .get<ApiResponse<CrmActividad[]>>(this.apiUrl.url('saasCore', '/v1/saas/crm/actividades'), {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  listCrmOportunidadRecursos() {
    return this.http
      .get<ApiResponse<CrmOportunidadRecurso[]>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/oportunidades/recursos'),
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  createCrmOportunidadRecurso(
    oportunidadId: number,
    tipo: CrmOportunidadRecursoTipo,
    data: Readonly<Record<string, unknown>>,
    file?: File | null,
  ) {
    const formData = this.crmResourceFormData(tipo, data, file);
    return this.http
      .post<ApiResponse<CrmOportunidadRecurso>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/oportunidades/${oportunidadId}/recursos`),
        formData,
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  updateCrmOportunidadRecurso(
    oportunidadId: number,
    resourceId: number,
    tipo: CrmOportunidadRecursoTipo,
    data: Readonly<Record<string, unknown>>,
    file?: File | null,
  ) {
    const formData = this.crmResourceFormData(tipo, data, file);
    return this.http
      .put<ApiResponse<CrmOportunidadRecurso>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/oportunidades/${oportunidadId}/recursos/${resourceId}`),
        formData,
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  deleteCrmOportunidadRecurso(oportunidadId: number, resourceId: number) {
    return this.http
      .delete<ApiResponse<string>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/oportunidades/${oportunidadId}/recursos/${resourceId}`),
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  downloadCrmOportunidadRecurso(oportunidadId: number, resourceId: number, inline = false) {
    return this.http.get(
      this.apiUrl.url('saasCore', `/v1/saas/crm/oportunidades/${oportunidadId}/recursos/${resourceId}/archivo`),
      {
        headers: this.session.apiHeaders(),
        params: new HttpParams().set('inline', inline),
        responseType: 'blob',
      },
    );
  }

  listCrmActividadesPage(request: CrmActividadPageRequest = {}) {
    return this.http
      .get<ApiResponse<PageResponse<CrmActividad>>>(this.apiUrl.url('saasCore', '/v1/saas/crm/actividades/page'), {
        headers: this.session.apiHeaders(),
        params: this.buildQueryParams(request),
      })
      .pipe(map((response) => response.data));
  }

  createCrmActividad(request: CreateCrmActividadRequest) {
    return this.http
      .post<ApiResponse<CrmActividad>>(this.apiUrl.url('saasCore', '/v1/saas/crm/actividades'), request, {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  realizarCrmActividad(id: number, request?: string | RealizarCrmActividadRequest | null) {
    const body = typeof request === 'string' ? { resultado: request } : (request ?? {});
    return this.http
      .put<ApiResponse<CrmActividad>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/actividades/${id}/realizar`),
        body,
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  cancelarCrmActividad(id: number, request?: string | RealizarCrmActividadRequest | null) {
    const body = typeof request === 'string' ? { resultado: request } : (request ?? {});
    return this.http
      .put<ApiResponse<CrmActividad>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/actividades/${id}/cancelar`),
        body,
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  getCrmDashboard() {
    return this.http
      .get<ApiResponse<CrmDashboard>>(this.apiUrl.url('saasCore', '/v1/saas/crm/dashboard'), {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  getCrmReportes() {
    return this.http
      .get<ApiResponse<CrmReportes>>(this.apiUrl.url('saasCore', '/v1/saas/crm/reportes'), {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  getCrmReporteOportunidadesEtapa() {
    return this.http
      .get<ApiResponse<CrmReporteBucket[]>>(this.apiUrl.url('saasCore', '/v1/saas/crm/reportes/oportunidades-etapa'), {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  getCrmReporteOportunidadesVendedor() {
    return this.http
      .get<ApiResponse<CrmReporteBucket[]>>(this.apiUrl.url('saasCore', '/v1/saas/crm/reportes/oportunidades-vendedor'), {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  getCrmReporteProspectosOrigen() {
    return this.http
      .get<ApiResponse<CrmReporteBucket[]>>(this.apiUrl.url('saasCore', '/v1/saas/crm/reportes/prospectos-origen'), {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  getCrmReporteGanadasPerdidas() {
    return this.http
      .get<ApiResponse<CrmResultadosResumen>>(this.apiUrl.url('saasCore', '/v1/saas/crm/reportes/ganadas-perdidas'), {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  listStockBySucursal(sucursalId: number) {
    return this.http
      .get<ApiResponse<StockItem[]>>(
        this.apiUrl.url('saasCore', `/v1/saas/inventory/sucursales/${sucursalId}/stock`),
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  listKardex(productoId?: number, almacenId?: number) {
    let params = new HttpParams();
    if (productoId) {
      params = params.set('productoId', productoId);
    }
    if (almacenId) {
      params = params.set('almacenId', almacenId);
    }

    return this.http
      .get<ApiResponse<KardexMovimiento[]>>(
        this.apiUrl.url('saasCore', '/v1/saas/inventory/kardex'),
        {
          headers: this.session.apiHeaders(),
          params: params.keys().length ? params : undefined,
        },
      )
      .pipe(map((response) => response.data));
  }

  listUsuarios(options: TenantScopedOptions = {}) {
    const tenantId = options.tenantId?.trim() || null;
    return this.http
      .get<ApiResponse<UsuarioTenant[]>>(this.apiUrl.url('saasCore', '/v1/saas/usuarios'), {
        headers: this.session.apiHeaders(tenantId),
      })
      .pipe(map((response) => response.data));
  }

  createUsuario(request: CreateUsuarioTenantRequest, options: TenantScopedOptions = {}) {
    const tenantId = options.tenantId?.trim() || null;
    return this.http
      .post<ApiResponse<UsuarioTenant>>(this.apiUrl.url('saasCore', '/v1/saas/usuarios'), request, {
        headers: this.session.apiHeaders(tenantId),
      })
      .pipe(map((response) => response.data));
  }

  updateUsuario(
    id: number,
    request: UpdateUsuarioTenantRequest,
    options: TenantScopedOptions = {},
  ) {
    const tenantId = options.tenantId?.trim() || null;
    return this.http
      .put<ApiResponse<UsuarioTenant>>(
        this.apiUrl.url('saasCore', `/v1/saas/usuarios/${id}`),
        request,
        {
          headers: this.session.apiHeaders(tenantId),
        },
      )
      .pipe(map((response) => response.data));
  }

  syncUsuarioRoles(
    id: number,
    request: SyncUsuarioRolesRequest,
    options: TenantScopedOptions = {},
  ) {
    const tenantId = options.tenantId?.trim() || null;
    return this.http
      .put<ApiResponse<UsuarioTenant>>(
        this.apiUrl.url('saasCore', `/v1/saas/usuarios/${id}/roles`),
        request,
        {
          headers: this.session.apiHeaders(tenantId),
        },
      )
      .pipe(map((response) => response.data));
  }

  deleteUsuario(id: number, options: TenantScopedOptions = {}) {
    const tenantId = options.tenantId?.trim() || null;
    return this.http
      .delete<ApiResponse<string>>(this.apiUrl.url('saasCore', `/v1/saas/usuarios/${id}`), {
        headers: this.session.apiHeaders(tenantId),
      })
      .pipe(map((response) => response.data));
  }

  listRoles(options: TenantScopedOptions = {}) {
    const tenantId = options.tenantId?.trim() || null;
    return this.cached(this.tenantCacheKey('roles', tenantId), () =>
      this.http
        .get<ApiResponse<Rol[]>>(this.apiUrl.url('saasCore', '/v1/saas/roles'), {
          headers: this.session.apiHeaders(tenantId),
        })
        .pipe(map((response) => response.data)),
    );
  }

  createRol(request: CreateRolRequest, options: TenantScopedOptions = {}) {
    const tenantId = options.tenantId?.trim() || null;
    return this.http
      .post<ApiResponse<Rol>>(this.apiUrl.url('saasCore', '/v1/saas/roles'), request, {
        headers: this.session.apiHeaders(tenantId),
      })
      .pipe(
        map((response) => response.data),
        tap(() => this.invalidateCache('roles')),
      );
  }

  deleteRol(rolId: number, options: TenantScopedOptions = {}) {
    const tenantId = options.tenantId?.trim() || null;
    return this.http
      .delete<ApiResponse<string>>(this.apiUrl.url('saasCore', `/v1/saas/roles/${rolId}`), {
        headers: this.session.apiHeaders(tenantId),
      })
      .pipe(
        map((response) => response.data),
        tap(() => this.invalidateCache('roles')),
      );
  }

  syncRolPermisos(rolId: number, permisoIds: number[], options: TenantScopedOptions = {}) {
    const tenantId = options.tenantId?.trim() || null;
    return this.http
      .put<ApiResponse<Rol>>(
        this.apiUrl.url('saasCore', `/v1/saas/roles/${rolId}/permisos`),
        { permisoIds },
        {
          headers: this.session.apiHeaders(tenantId),
        },
      )
      .pipe(
        map((response) => response.data),
        tap(() => this.invalidateCache('roles')),
      );
  }

  listPermisos(options: TenantScopedOptions = {}) {
    const tenantId = options.tenantId?.trim() || null;
    return this.cached(this.tenantCacheKey('permisos', tenantId), () =>
      this.http
        .get<ApiResponse<Permiso[]>>(this.apiUrl.url('saasCore', '/v1/saas/permisos'), {
          headers: this.session.apiHeaders(tenantId),
        })
        .pipe(map((response) => response.data)),
    );
  }

  createPermiso(request: CreatePermisoRequest, options: TenantScopedOptions = {}) {
    const tenantId = options.tenantId?.trim() || null;
    return this.http
      .post<ApiResponse<Permiso>>(this.apiUrl.url('saasCore', '/v1/saas/permisos'), request, {
        headers: this.session.apiHeaders(tenantId),
      })
      .pipe(
        map((response) => response.data),
        tap(() => this.invalidateCache('permisos', 'roles')),
      );
  }

  deletePermiso(permisoId: number, options: TenantScopedOptions = {}) {
    const tenantId = options.tenantId?.trim() || null;
    return this.http
      .delete<ApiResponse<string>>(this.apiUrl.url('saasCore', `/v1/saas/permisos/${permisoId}`), {
        headers: this.session.apiHeaders(tenantId),
      })
      .pipe(
        map((response) => response.data),
        tap(() => this.invalidateCache('permisos', 'roles')),
      );
  }

  private buildQueryParams(values: object): HttpParams | undefined {
    let params = new HttpParams();
    Object.entries(values as Record<string, unknown>).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        return;
      }
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        params = params.set(key, String(value));
      }
    });
    return params.keys().length ? params : undefined;
  }

  private crmResourceFormData(
    tipo: CrmOportunidadRecursoTipo,
    data: Readonly<Record<string, unknown>>,
    file?: File | null,
  ): FormData {
    const formData = new FormData();
    formData.set(
      'metadata',
      new Blob([JSON.stringify({ tipo, data })], { type: 'application/json' }),
      'metadata.json',
    );
    if (file) {
      formData.set('file', file, file.name);
    }
    return formData;
  }

  private cached<T>(
    key: string,
    sourceFactory: () => Observable<T>,
    ttlMs = AdminSaasApiService.MASTER_DATA_CACHE_TTL_MS,
  ): Observable<T> {
    const now = Date.now();
    const current = this.cache.get(key);
    if (current && current.expiresAt > now) {
      return current.value$ as Observable<T>;
    }

    const value$ = sourceFactory().pipe(shareReplay({ bufferSize: 1, refCount: false }));
    this.cache.set(key, { expiresAt: now + ttlMs, value$ });
    return value$;
  }

  private invalidateCache(...prefixes: string[]): void {
    for (const key of [...this.cache.keys()]) {
      if (prefixes.some((prefix) => key === prefix || key.startsWith(`${prefix}:`))) {
        this.cache.delete(key);
      }
    }
  }

  private tenantCacheKey(scope: string, tenantId: string | null): string {
    return `${scope}:${tenantId || this.session.currentSession()?.tenantId || 'default'}`;
  }

  private toFetchHeaders(httpHeaders: HttpHeaders): Headers {
    const headers = new Headers();
    for (const key of httpHeaders.keys()) {
      const value = httpHeaders.get(key);
      if (value !== null) {
        headers.set(key, value);
      }
    }
    headers.set('Accept', 'text/event-stream');
    return headers;
  }

  private consumeSseBuffer(
    source: string,
    onEvent: (eventName: string, eventData: string) => void,
  ): string {
    let buffer = source.replace(/\r\n/g, '\n');
    let separator = buffer.indexOf('\n\n');

    while (separator >= 0) {
      const chunk = buffer.slice(0, separator);
      buffer = buffer.slice(separator + 2);
      const parsed = this.parseSseChunk(chunk);
      if (parsed) {
        onEvent(parsed.eventName, parsed.data);
      }
      separator = buffer.indexOf('\n\n');
    }

    return buffer;
  }

  private parseSseChunk(chunk: string): { eventName: string; data: string } | null {
    const lines = chunk.split('\n');
    let eventName = 'message';
    const dataLines: string[] = [];

    for (const line of lines) {
      if (!line || line.startsWith(':')) {
        continue;
      }
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim() || 'message';
        continue;
      }
      if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trim());
      }
    }

    if (!dataLines.length) {
      return null;
    }
    return { eventName, data: dataLines.join('\n') };
  }
}
