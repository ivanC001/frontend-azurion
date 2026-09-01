/**
 * Contratos de los datos maestros compartidos entre features: clientes,
 * productos, sucursales y usuarios del tenant.
 *
 * PageResponse y TenantScopedOptions viven aqui por el mismo motivo: son
 * envoltorios genericos que usa cualquier consumidor de la API.
 */

export interface Sucursal {
  readonly id: number;
  readonly codigo: string;
  readonly nombre: string;
  readonly direccion: string | null;
  // Codigo del catalogo SUNAT: null para tenants fuera de Peru.
  readonly ubigeoCodigo: string | null;
  readonly departamento: string | null;
  readonly provincia: string | null;
  readonly distrito: string | null;
  readonly igvPorcentaje: number;
  readonly tipoOperacionDefaultId?: string | null;
  readonly tipoAfectacionDefaultId?: string | null;
  readonly tributoDefaultId?: string | null;
  readonly porcentajeIgvDefault?: number | null;
  readonly activo: boolean;
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
  readonly almacenId: number | null;
  readonly almacenCodigo: string | null;
  readonly almacenNombre: string | null;
  readonly stockCantidad: number;
  readonly activo: boolean;
  readonly imagenUrl?: string | null;
  readonly precioCompraBase?: number | null;
  readonly precioVentaBase?: number | null;
  readonly manejaStock?: boolean | null;
  readonly manejaLotes?: boolean | null;
  readonly manejaVencimiento?: boolean | null;
  readonly stockMinimoGlobal?: number | null;
  readonly precioVentaModo?: 'INCLUYE_IGV' | null;
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

export interface UsuarioTenant {
  readonly id: number;
  readonly username: string;
  readonly nombres: string;
  readonly apellidos: string | null;
  readonly email: string | null;
  readonly telefono: string | null;
  readonly cargo: string | null;
  readonly fotoPerfilUrl: string | null;
  readonly activo: boolean;
  readonly roles: string[];
  readonly sucursales: Array<{
    readonly id: number;
    readonly codigo: string;
    readonly nombre: string;
  }>;
  readonly ultimoAcceso: string | null;
}

export interface TenantScopedOptions {
  readonly tenantId?: string | null;
}
