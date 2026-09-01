/**
 * Contratos de datos que expone la API de administracion.
 *
 * Vivian dentro de admin-saas-api.service.ts, que asi mezclaba 2.000 lineas de
 * tipos con el cliente HTTP. Como consecuencia, cualquier fichero que solo
 * necesitase una interfaz acababa importando el servicio entero.
 *
 * Los tipos se siguen reexportando desde el servicio, asi que los imports
 * existentes continuan funcionando.
 */

// Recursos compartidos por varias features: su contrato vive en core.
export * from '@core/api/catalog-api.types';
export * from '@core/api/venta-api.types';

export * from '@core/api/cotizacion-api.types';

import type {
  FacturadorDocumentStatus,
  FacturadorVentaResponse,
  TipoComprobanteVenta,
  VentaRecord,
} from '@core/api/venta-api.types';

export interface Empresa {
  readonly id: number;
  readonly ruc: string;
  readonly razonSocial: string;
  readonly tipoDocumentoFiscal?: string | null;
  readonly nombreComercial?: string | null;
  readonly direccionFiscal?: string | null;
  readonly distrito?: string | null;
  readonly provincia?: string | null;
  readonly departamento?: string | null;
  readonly paisCodigo?: string | null;
  readonly paisNombre?: string | null;
  readonly correoPrincipal?: string | null;
  readonly telefono?: string | null;
  readonly celular?: string | null;
  readonly sitioWeb?: string | null;
  readonly facebook?: string | null;
  readonly instagram?: string | null;
  readonly representanteNombre?: string | null;
  readonly representanteTipoDocumento?: string | null;
  readonly representanteNumeroDocumento?: string | null;
  readonly representanteCargo?: string | null;
  readonly representanteCorreo?: string | null;
  readonly representanteTelefono?: string | null;
  readonly zonaHoraria?: string | null;
  readonly idioma?: string | null;
  readonly formatoFecha?: string | null;
  readonly formatoHora?: string | null;
  readonly monedaCodigo?: string | null;
  readonly monedaSimbolo?: string | null;
  readonly facturadorStatus?: string | null;
  readonly facturadorDocumentMode?: string | null;
  readonly facturadorFiscalStatus?: string | null;
  readonly facturadorSunatMode?: string | null;
  readonly facturadorLastError?: string | null;
  readonly facturadorProvisionedAt?: string | null;
  readonly tenantId: string;
  readonly schemaName: string;
  readonly logoPanelUrl?: string | null;
  readonly activo: boolean;
}

export interface CreateEmpresaRequest {
  readonly ruc: string;
  readonly razonSocial: string;
  readonly tipoDocumentoFiscal?: string | null;
  readonly nombreComercial?: string | null;
  readonly paisCodigo?: string | null;
  readonly paisNombre?: string | null;
  readonly monedaCodigo?: string | null;
  readonly monedaSimbolo?: string | null;
  readonly zonaHoraria?: string | null;
  readonly idioma?: string | null;
  readonly tenantId: string;
  readonly schemaName: string;
  readonly moduloCodigos?: readonly string[] | null;
}

export interface CreateEmpresaRegistrationRequest extends Omit<
  CreateEmpresaRequest,
  'moduloCodigos'
> {
  readonly planId: number;
  readonly fechaInicio?: string | null;
  readonly limiteUsuarios?: number | null;
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
  readonly limiteUsuarios: number;
  readonly precioMensual: number;
  readonly estado: string;
  readonly moduloCodigos?: readonly string[];
}

export interface CreatePlanRequest {
  readonly nombre: string;
  readonly codigo: string;
  readonly descripcion?: string | null;
  readonly limiteMensualBolsa: number;
  readonly limiteUsuarios: number;
  readonly precioMensual: number;
  readonly moduloCodigos?: readonly string[];
}

export interface UpdatePlanRequest {
  readonly nombre: string;
  readonly descripcion?: string | null;
  readonly limiteMensualBolsa: number;
  readonly limiteUsuarios: number;
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
  readonly planNombre: string;
  readonly planCodigo: string;
  readonly limiteUsuariosPlan: number;
  readonly limiteUsuarios: number;
  readonly limiteUsuariosPersonalizado: boolean;
  readonly estado: string;
  readonly fechaInicio: string | null;
  readonly fechaFin: string | null;
}

export interface EmpresaRegistration {
  readonly empresa: Empresa;
  readonly suscripcion: Suscripcion;
}

export interface EmpresaOperationalSummary {
  readonly empresa: Empresa;
  readonly suscripcion: Suscripcion | null;
  readonly suscripcionVigente: boolean;
  readonly precioMensual: number | null;
  readonly limiteMensualBolsa: number | null;
  readonly usuariosTotal: number | null;
  readonly usuariosActivos: number | null;
  readonly usuariosInactivos: number | null;
  readonly cuposDisponibles: number | null;
  readonly cupoExcedido: boolean;
  readonly conteoUsuariosDisponible: boolean;
  readonly moduloCodigos: readonly string[];
  readonly creadaEn: string | null;
  readonly actualizadaEn: string | null;
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
  readonly permiteVenta: boolean;
  readonly estado: string;
  readonly activo: boolean;
}

export interface CreateAlmacenRequest {
  readonly codigo?: string | null;
  readonly nombre: string;
  readonly direccion?: string | null;
  readonly sucursalId: number;
  readonly tipoAlmacen?: string | null;
  readonly permiteVenta?: boolean | null;
}

export interface UpdateAlmacenRequest {
  readonly nombre: string;
  readonly direccion?: string | null;
  readonly sucursalId: number;
  readonly tipoAlmacen?: string | null;
  readonly permiteVenta?: boolean | null;
  readonly activo?: boolean | null;
}

export interface CreateSucursalRequest {
  readonly codigo?: string | null;
  readonly nombre: string;
  readonly direccion?: string | null;
  // Obligatorio solo en Peru; fuera se envia la ubicacion como texto libre.
  readonly ubigeoCodigo?: string | null;
  readonly departamento?: string | null;
  readonly provincia?: string | null;
  readonly distrito?: string | null;
  readonly igvPorcentaje: number;
  readonly crearAlmacenPrincipal?: boolean;
}

export type UpdateSucursalRequest = Omit<CreateSucursalRequest, 'crearAlmacenPrincipal'> & {
  readonly codigo: string;
};

// El catalogo de ubigeos vive en core: lo comparten features y shared.
export type { Ubigeo } from '@core/api/ubigeo-api.service';

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
  readonly clientOperationId: string;
}

export interface CajaFisica {
  readonly id: number;
  readonly sucursalId: number;
  readonly sucursalCodigo: string;
  readonly sucursalNombre: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly moneda: string;
  readonly estado: 'ACTIVA' | 'INACTIVA';
  readonly usuarioIds: number[];
}

export interface CajaTurno {
  readonly id: number;
  readonly numero: string;
  readonly cajaId: number;
  readonly sucursalId: number;
  readonly sucursalCodigo: string;
  readonly sucursalNombre: string;
  readonly cajaCodigo: string;
  readonly cajaNombre: string;
  readonly moneda: string;
  readonly estado: 'ABIERTO' | 'CERRADO';
  readonly usuarioId: number | null;
  readonly saldoApertura: number;
  readonly saldoEsperado: number;
  readonly conteoFisico: number | null;
  readonly diferenciaCierre: number | null;
  readonly numeroVentas: number;
  readonly totalVentas: number;
  readonly totalEfectivo: number;
  readonly totalTarjeta: number;
  readonly totalBilleteraDigital: number;
  readonly totalTransferencia: number;
  readonly totalCredito: number;
  readonly totalIngresosManuales: number;
  readonly totalRetiros: number;
  readonly totalDepositos: number;
  readonly totalReembolsos: number;
  readonly responsableAperturaId: string;
  readonly responsableAperturaNombre: string;
  readonly responsableCierreId: string | null;
  readonly responsableCierreNombre: string | null;
  readonly fechaApertura: string;
  readonly fechaCierre: string | null;
  readonly observacionApertura: string | null;
  readonly observacionCierre: string | null;
}

export type Caja = CajaTurno;

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

export interface GuardarCajaFisicaRequest {
  readonly sucursalId: number;
  readonly codigo: string;
  readonly nombre: string;
  readonly moneda: string;
  readonly estado: 'ACTIVA' | 'INACTIVA';
  readonly usuarioIds: number[];
}

export interface AbrirCajaTurnoRequest {
  readonly cajaId: number;
  readonly saldoApertura: number;
  readonly observacion?: string | null;
}

export interface CerrarCajaTurnoRequest {
  readonly conteoFisico: number;
  readonly observacion?: string | null;
}

export interface RegistrarMovimientoCajaRequest {
  readonly tipoMovimiento: string;
  readonly monto: number;
  readonly descripcion: string;
  readonly referencia?: string | null;
  readonly clientOperationId: string;
}

export interface DepositoCuentaEmpresarialRequest {
  readonly monto: number;
  readonly cuentaEmpresarial: string;
  readonly numeroOperacion?: string | null;
  readonly observacion?: string | null;
  readonly clientOperationId: string;
}

export interface RegistrarVentaCajaRequest {
  readonly tipoComprobante: TipoComprobanteVenta;
  readonly total: number;
  readonly clienteId?: number | null;
  readonly clienteTipoDocumento?: string | null;
  readonly clienteNumeroDocumento?: string | null;
  readonly clienteNombre?: string | null;
  readonly fechaEmision?: string | null;
  readonly moneda?: string | null;
  readonly tipoCambio?: number | null;
  readonly formaPago?: string | null;
  readonly metodoPago?: string | null;
  readonly contingencia?: boolean | null;
  readonly tipoOperacionSunat?: string | null;
  readonly percepcion?: VentaPercepcionRequest | null;
  readonly detraccion?: VentaDetraccionRequest | null;
  readonly anticipos?: VentaAnticipoRequest[] | null;
  readonly cuotas?: VentaCuotaRequest[] | null;
  readonly leyendas?: VentaLeyendaRequest[] | null;
  readonly descripcion?: string | null;
  readonly items: VentaProductoRequest[];
  readonly clientOperationId: string;
}

export interface VentaStatusStreamEvent extends FacturadorDocumentStatus {
  readonly tenantId?: string | null;
  readonly source?: string | null;
  readonly ventaId?: number | null;
  readonly externalId: string;
}

export interface RegistrarGuiaRemisionRequest {
  readonly clientOperationId: string;
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

export interface GuiaRemisionRecord extends FacturadorDocumentStatus {
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
}

export interface RegistrarNotaFiscalRequest {
  readonly clientOperationId: string;
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

export interface NotaFiscalRecord extends FacturadorDocumentStatus {
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
}

type VentasListPayload =
  VentaRecord[] | { readonly items?: readonly VentaRecord[]; readonly total?: number } | null;

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
  readonly almacenId?: number | null;
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

export interface VentaSummary {
  readonly totalVentas: number;
  readonly totalMonto: number;
  readonly ventasHoy: number;
  readonly aceptadasSunat: number;
  readonly pendientesSunat: number;
  readonly ticketsInternos: number;
}

export interface CreateProductoRapidoRequest {
  readonly codigoBarras?: string | null;
  readonly sku?: string | null;
  readonly nombre: string;
  readonly descripcion?: string | null;
  readonly categoriaId?: number | null;
  readonly unidadMedidaId?: number | null;
  readonly tipoProducto: 'PRODUCTO' | 'SERVICIO';
  readonly precioVenta: number;
  readonly costoInicial: number;
  readonly cantidadInicial: number;
  readonly almacenId?: number | null;
  readonly manejaVencimiento: boolean;
  readonly stockMinimo: number;
  readonly codigoLote?: string | null;
  readonly fechaFabricacion?: string | null;
  readonly fechaVencimiento?: string | null;
  readonly foto?: string | null;
}

export interface UpdateProductoRequest {
  readonly nombre: string;
  readonly precio: number;
  readonly activo: boolean;
  readonly almacenId?: number | null;
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
  readonly clientOperationId: string;
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
  readonly stockMaximo?: number | null;
  readonly ubicacionFisica?: string | null;
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

export interface InventorySummary {
  readonly stockLines: number;
  readonly lowStock: number;
  readonly noStock: number;
  readonly expiring: number;
  readonly expired: number;
  readonly movements: number;
  readonly purchases: number;
  readonly invested: number;
  readonly projectedProfit: number;
}

export interface FiscalSummary {
  readonly desde: string;
  readonly hasta: string;
  readonly ventasBrutas: number;
  readonly ventasNetas: number;
  readonly debitoFiscal: number;
  readonly comprasNetas: number;
  readonly igvCompras: number;
  readonly creditoFiscal: number;
  readonly igvPorPagarEstimado: number;
  readonly saldoCreditoFiscalEstimado: number;
  readonly costoVentasConocido: number;
  readonly margenReal: number | null;
  readonly margenCompleto: boolean;
  readonly lineasVentaSinCostoHistorico: number;
  readonly notasHistoricasSinDesglose: number;
  readonly notasCreditoSinReversionCosto: number;
}

export interface ProductSummary {
  readonly total: number;
  readonly active: number;
  readonly products: number;
  readonly services: number;
  readonly lowStock: number;
}

export interface CompraDetalle {
  readonly id: number;
  readonly productoId: number;
  readonly productoSku: string;
  readonly productoNombre: string;
  readonly cantidad: number;
  readonly costoUnitario: number;
  readonly costoNetoUnitario: number;
  readonly porcentajeIgv: number;
  readonly montoIgvUnitario: number;
  readonly costoTotalUnitario: number;
  readonly costoInventariableUnitario: number;
  readonly precioVenta: number;
  readonly precioVentaNeto: number;
  readonly subtotalNeto: number;
  readonly montoIgv: number;
  readonly total: number;
  readonly totalCostoInventariable: number;
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
  readonly subtotalNeto: number;
  readonly montoIgv: number;
  readonly total: number;
  readonly creditoFiscalAplicable: boolean;
  readonly creditoFiscal: number;
  readonly totalCostoInventariable: number;
  readonly tratamientoIgv: 'DESGLOSADO' | 'HISTORICO_SIN_DESGLOSE';
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
  readonly creditoFiscalAplicable: boolean;
  readonly clientOperationId: string;
  readonly detalles: Array<{
    readonly productoId: number;
    readonly cantidad: number;
    readonly costoUnitario: number;
    readonly costoNetoUnitario: number;
    readonly porcentajeIgv: number;
    readonly costoTotalUnitario: number;
    readonly precioVenta: number;
    readonly codigoLote?: string | null;
    readonly fechaFabricacion?: string | null;
    readonly fechaVencimiento?: string | null;
  }>;
}

export interface UpdateEmpresaSubscriptionPlanRequest {
  readonly planId: number;
  readonly limiteUsuarios?: number | null;
  readonly fechaInicio?: string | null;
}

export interface UpdateCurrentEmpresaProfileRequest {
  readonly ruc: string;
  readonly razonSocial: string;
  readonly tipoDocumentoFiscal: string;
  readonly nombreComercial?: string | null;
  readonly direccionFiscal?: string | null;
  readonly distrito?: string | null;
  readonly provincia?: string | null;
  readonly departamento?: string | null;
  readonly paisCodigo: string;
  readonly paisNombre: string;
  readonly correoPrincipal?: string | null;
  readonly telefono?: string | null;
  readonly celular?: string | null;
  readonly sitioWeb?: string | null;
  readonly facebook?: string | null;
  readonly instagram?: string | null;
  readonly representanteNombre?: string | null;
  readonly representanteTipoDocumento?: string | null;
  readonly representanteNumeroDocumento?: string | null;
  readonly representanteCargo?: string | null;
  readonly representanteCorreo?: string | null;
  readonly representanteTelefono?: string | null;
  readonly zonaHoraria: string;
  readonly idioma: string;
  readonly formatoFecha: string;
  readonly formatoHora: string;
  readonly monedaCodigo: string;
  readonly monedaSimbolo: string;
}

export interface TenantUserQuota {
  readonly activeUsers: number;
  readonly limit: number;
  readonly remaining: number;
  readonly planCode: string;
}

export interface UpdateUsuarioPasswordRequest {
  readonly password: string;
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
export interface UpdateUsuarioTenantRequest {
  readonly nombres: string;
  readonly email?: string | null;
  readonly activo?: boolean;
  readonly sucursalIds?: number[];
}
