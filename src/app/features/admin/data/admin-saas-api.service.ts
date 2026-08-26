import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, expand, map, reduce, shareReplay, tap } from 'rxjs';

import { ApiResponse } from '@core/api/api-response';
import { CatalogApiService } from '@core/api/catalog-api.service';
import { CotizacionApiService } from '@core/api/cotizacion-api.service';
import { ApiUrlService } from '@core/api/api-url.service';
import { AuthSessionService } from '@core/auth/auth-session.service';
import { ApiCacheService } from '@core/api/api-cache.service';
import { UbigeoApiService } from '@core/api/ubigeo-api.service';

import type {
  AbrirCajaTurnoRequest,
  ActiveModulesResponse,
  Almacen,
  CajaFisica,
  CajaMovimiento,
  CajaTurno,
  CategoriaProducto,
  CerrarCajaTurnoRequest,
  Cliente,
  ClienteAbono,
  Compra,
  ConfiguracionTributaria,
  ConvertCotizacionVentaRequest,
  CreateAlmacenRequest,
  CreateClienteRequest,
  CreateCompraRequest,
  CreateCotizacionRequest,
  CreateEmpresaRegistrationRequest,
  CreateModuloRequest,
  CreatePermisoRequest,
  CreatePlanRequest,
  CreateProductoRapidoRequest,
  CreateProductoRequest,
  CreatePromocionCotizacionRequest,
  CreateRolRequest,
  CreateSucursalRequest,
  CreateUsuarioTenantRequest,
  DepositoCuentaEmpresarialRequest,
  Empresa,
  EmpresaModulo,
  EmpresaOperationalSummary,
  EmpresaRegistration,
  FiscalSummary,
  FormatoImpresionComprobante,
  GuardarCajaFisicaRequest,
  GuiaRemisionRecord,
  InventorySummary,
  KardexMovimiento,
  ModuloGlobal,
  NotaFiscalRecord,
  PageResponse,
  Permiso,
  Plan,
  ProductSummary,
  Producto,
  ProductoTributariaRequest,
  RegistrarClienteAbonoRequest,
  RegistrarGuiaRemisionRequest,
  RegistrarGuiaRemisionResponse,
  RegistrarMovimientoCajaRequest,
  RegistrarNotaFiscalRequest,
  RegistrarNotaFiscalResponse,
  RegistrarVentaCajaRequest,
  RegistrarVentaCajaResponse,
  Rol,
  StockItem,
  StockLoteItem,
  StockMovimientoRequest,
  Sucursal,
  SucursalTributariaRequest,
  Suscripcion,
  SyncEmpresaModulosRequest,
  SyncUsuarioRolesRequest,
  TaxResolution,
  TenantScopedOptions,
  TenantUserQuota,
  UpdateAlmacenRequest,
  UpdateClienteRequest,
  UpdateCotizacionEstadoRequest,
  UpdateCurrentEmpresaBrandingRequest,
  UpdateCurrentEmpresaProfileRequest,
  UpdateEmpresaSubscriptionPlanRequest,
  UpdateModuloRequest,
  UpdatePlanRequest,
  UpdateProductoRequest,
  UpdateSucursalRequest,
  UpdateSuscripcionEstadoRequest,
  UpdateUsuarioPasswordRequest,
  UpdateUsuarioTenantRequest,
  UsuarioTenant,
  VentaRecord,
  VentaStatusStreamEvent,
  VentaSummary,
} from './admin-saas-api.types';

// Los tipos viven en admin-saas-api.types.ts. Se reexportan aqui para que
// los imports existentes sigan resolviendo desde el servicio.
export * from './admin-saas-api.types';

@Injectable({ providedIn: 'root' })
export class AdminSaasApiService {
  private static readonly MASTER_DATA_CACHE_TTL_MS = 120_000;

  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);
  private readonly session = inject(AuthSessionService);

  private readonly ubigeoApi = inject(UbigeoApiService);

  private readonly catalogApi = inject(CatalogApiService);

  private readonly cotizacionApi = inject(CotizacionApiService);
  private readonly cache = inject(ApiCacheService);

  listEmpresas() {
    return this.cached('empresas', () =>
      this.http
        .get<ApiResponse<Empresa[]>>(this.apiUrl.url('saasCore', '/v1/saas/empresas'), {
          headers: this.session.apiHeaders(),
        })
        .pipe(map((response) => response.data)),
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

  pageAlmacenes(page = 0, size = 20) {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http
      .get<
        ApiResponse<PageResponse<Almacen>>
      >(this.apiUrl.url('saasCore', '/v1/saas/almacenes/page'), { headers: this.session.apiHeaders(), params })
      .pipe(map((response) => response.data));
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

  createEmpresaRegistration(request: CreateEmpresaRegistrationRequest) {
    return this.http
      .post<
        ApiResponse<EmpresaRegistration>
      >(this.apiUrl.url('saasCore', '/v1/saas/empresas/registro'), request, { headers: this.session.apiHeaders() })
      .pipe(
        map((response) => response.data),
        tap(() => {
          this.invalidateCache('empresas');
          this.invalidateCache('suscripciones');
        }),
      );
  }

  updateAlmacen(id: number, request: UpdateAlmacenRequest) {
    return this.http
      .put<
        ApiResponse<Almacen>
      >(this.apiUrl.url('saasCore', `/v1/saas/almacenes/${id}`), request, { headers: this.session.apiHeaders() })
      .pipe(
        map((response) => response.data),
        tap(() => this.invalidateCache('almacenes')),
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

  /** Delega en core: el catalogo lo comparten features y shared. */
  listUbigeos(query?: string) {
    return this.ubigeoApi.listUbigeos(query);
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
    return this.listCajaTurnos(estado, sucursalId);
  }

  listCajaTurnos(estado?: string, sucursalId?: number) {
    let params = new HttpParams();
    if (estado) {
      params = params.set('estado', estado);
    }
    if (sucursalId) {
      params = params.set('sucursalId', sucursalId);
    }

    return this.http
      .get<ApiResponse<CajaTurno[]>>(this.apiUrl.url('saasCore', '/v1/saas/caja-turnos'), {
        headers: this.session.apiHeaders(),
        params: params.keys().length ? params : undefined,
      })
      .pipe(map((response) => response.data));
  }

  getCajaTurnoActivo() {
    return this.http
      .get<
        ApiResponse<CajaTurno | null>
      >(this.apiUrl.url('saasCore', '/v1/saas/caja-turnos/activo'), { headers: this.session.apiHeaders() })
      .pipe(map((response) => response.data));
  }

  listCajasFisicas(sucursalId?: number) {
    const params = sucursalId ? new HttpParams().set('sucursalId', sucursalId) : undefined;
    return this.http
      .get<ApiResponse<CajaFisica[]>>(this.apiUrl.url('saasCore', '/v1/saas/cajas-fisicas'), {
        headers: this.session.apiHeaders(),
        params,
      })
      .pipe(map((response) => response.data));
  }

  crearCajaFisica(request: GuardarCajaFisicaRequest) {
    return this.http
      .post<
        ApiResponse<CajaFisica>
      >(this.apiUrl.url('saasCore', '/v1/saas/cajas-fisicas'), request, { headers: this.session.apiHeaders() })
      .pipe(map((response) => response.data));
  }

  actualizarCajaFisica(cajaId: number, request: GuardarCajaFisicaRequest) {
    return this.http
      .put<
        ApiResponse<CajaFisica>
      >(this.apiUrl.url('saasCore', `/v1/saas/cajas-fisicas/${cajaId}`), request, { headers: this.session.apiHeaders() })
      .pipe(map((response) => response.data));
  }

  abrirTurnoCaja(request: AbrirCajaTurnoRequest) {
    return this.http
      .post<
        ApiResponse<CajaTurno>
      >(this.apiUrl.url('saasCore', '/v1/saas/caja-turnos/abrir'), request, { headers: this.session.apiHeaders() })
      .pipe(map((response) => response.data));
  }

  cerrarTurnoCaja(turnoId: number, request: CerrarCajaTurnoRequest) {
    return this.http
      .post<
        ApiResponse<CajaTurno>
      >(this.apiUrl.url('saasCore', `/v1/saas/caja-turnos/${turnoId}/cerrar`), request, { headers: this.session.apiHeaders() })
      .pipe(map((response) => response.data));
  }

  registrarMovimientoCaja(turnoId: number, request: RegistrarMovimientoCajaRequest) {
    return this.http
      .post<
        ApiResponse<CajaMovimiento>
      >(this.apiUrl.url('saasCore', `/v1/saas/caja-turnos/${turnoId}/movimientos`), request, { headers: this.session.apiHeaders() })
      .pipe(map((response) => response.data));
  }

  depositarCuentaEmpresarial(turnoId: number, request: DepositoCuentaEmpresarialRequest) {
    return this.http
      .post<
        ApiResponse<CajaMovimiento>
      >(this.apiUrl.url('saasCore', `/v1/saas/caja-turnos/${turnoId}/depositos-cuenta-empresarial`), request, { headers: this.session.apiHeaders() })
      .pipe(map((response) => response.data));
  }

  listCajaMovimientos(turnoId: number) {
    return this.http
      .get<
        ApiResponse<CajaMovimiento[]>
      >(this.apiUrl.url('saasCore', `/v1/saas/caja-turnos/${turnoId}/movimientos`), { headers: this.session.apiHeaders() })
      .pipe(map((response) => response.data));
  }

  listVentas(q?: string) {
    return this.pageVentas(q ?? '', 0, 200).pipe(map((response) => [...(response.content ?? [])]));
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

  registrarVentaCaja(turnoId: number, request: RegistrarVentaCajaRequest) {
    return this.http
      .post<ApiResponse<RegistrarVentaCajaResponse>>(
        this.apiUrl.url('saasCore', `/v1/saas/caja-turnos/${turnoId}/ventas`),
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
        tap(() => this.invalidateCache('categorias-producto', 'productos-todos')),
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
        tap(() => this.invalidateCache('categorias-producto', 'productos-todos')),
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

  pageVentas(q = '', page = 0, size = 20) {
    let params = new HttpParams().set('page', page).set('size', size);
    if (q.trim()) {
      params = params.set('q', q.trim());
    }
    return this.http
      .get<
        ApiResponse<PageResponse<VentaRecord>>
      >(this.apiUrl.url('saasCore', '/v1/saas/ventas/page'), { headers: this.session.apiHeaders(), params })
      .pipe(map((response) => response.data));
  }

  getVenta(ventaId: number) {
    return this.http
      .get<
        ApiResponse<VentaRecord>
      >(this.apiUrl.url('saasCore', `/v1/saas/ventas/${ventaId}`), { headers: this.session.apiHeaders() })
      .pipe(map((response) => response.data));
  }

  retryVentaDocument(ventaId: number) {
    return this.http
      .post<
        ApiResponse<VentaRecord>
      >(this.apiUrl.url('saasCore', `/v1/saas/ventas/${ventaId}/facturacion/reintentar`), {}, { headers: this.session.apiHeaders() })
      .pipe(map((response) => response.data));
  }

  getVentasSummary() {
    return this.http
      .get<
        ApiResponse<VentaSummary>
      >(this.apiUrl.url('saasCore', '/v1/saas/ventas/summary'), { headers: this.session.apiHeaders() })
      .pipe(map((response) => response.data));
  }

  getMovimientoStockByOperation(operationId: string) {
    return this.http
      .get<ApiResponse<KardexMovimiento>>(
        this.apiUrl.url(
          'saasCore',
          `/v1/saas/inventory/movimientos/operaciones/${encodeURIComponent(operationId)}`,
        ),
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  pageStock(productoId?: number, almacenId?: number, page = 0, size = 20) {
    let params = new HttpParams().set('page', page).set('size', size);
    if (productoId) {
      params = params.set('productoId', productoId);
    }
    if (almacenId) {
      params = params.set('almacenId', almacenId);
    }
    return this.http
      .get<
        ApiResponse<PageResponse<StockItem>>
      >(this.apiUrl.url('saasCore', '/v1/saas/inventory/stock/page'), { headers: this.session.apiHeaders(), params })
      .pipe(map((response) => response.data));
  }

  getInventorySummary() {
    return this.http
      .get<
        ApiResponse<InventorySummary>
      >(this.apiUrl.url('saasCore', '/v1/saas/inventory/summary'), { headers: this.session.apiHeaders() })
      .pipe(map((response) => response.data));
  }

  getFiscalSummary(desde?: string | null, hasta?: string | null) {
    let params = new HttpParams();
    if (desde) {
      params = params.set('desde', desde);
    }
    if (hasta) {
      params = params.set('hasta', hasta);
    }
    return this.http
      .get<
        ApiResponse<FiscalSummary>
      >(this.apiUrl.url('saasCore', '/v1/saas/reportes/fiscal'), { headers: this.session.apiHeaders(), params })
      .pipe(map((response) => response.data));
  }

  updateStockSettings(
    stockId: number,
    request: {
      readonly stockMinimo: number;
      readonly stockMaximo?: number | null;
      readonly ubicacionFisica?: string | null;
    },
  ) {
    return this.http
      .put<
        ApiResponse<StockItem>
      >(this.apiUrl.url('saasCore', `/v1/saas/inventory/stock/${stockId}/settings`), request, { headers: this.session.apiHeaders() })
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

  pageStockLotes(productoId?: number, almacenId?: number, page = 0, size = 20) {
    let params = new HttpParams().set('page', page).set('size', size);
    if (productoId) {
      params = params.set('productoId', productoId);
    }
    if (almacenId) {
      params = params.set('almacenId', almacenId);
    }
    return this.http
      .get<
        ApiResponse<PageResponse<StockLoteItem>>
      >(this.apiUrl.url('saasCore', '/v1/saas/inventory/stock/lotes/page'), { headers: this.session.apiHeaders(), params })
      .pipe(map((response) => response.data));
  }

  listCompras() {
    return this.http
      .get<ApiResponse<Compra[]>>(this.apiUrl.url('saasCore', '/v1/saas/inventory/compras'), {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  pageCompras(query = '', almacenId?: number, page = 0, size = 20) {
    let params = new HttpParams().set('query', query.trim()).set('page', page).set('size', size);
    if (almacenId) {
      params = params.set('almacenId', almacenId);
    }
    return this.http
      .get<
        ApiResponse<PageResponse<Compra>>
      >(this.apiUrl.url('saasCore', '/v1/saas/inventory/compras/page'), { headers: this.session.apiHeaders(), params })
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

  pageProductos(query = '', almacenId?: number, page = 0, size = 20) {
    let params = new HttpParams().set('q', query.trim()).set('page', page).set('size', size);
    if (almacenId) {
      params = params.set('almacenId', almacenId);
    }
    return this.http
      .get<
        ApiResponse<PageResponse<Producto>>
      >(this.apiUrl.url('saasCore', '/v1/saas/inventory/productos/page'), { headers: this.session.apiHeaders(), params })
      .pipe(map((response) => response.data));
  }

  getProductSummary() {
    return this.http
      .get<
        ApiResponse<ProductSummary>
      >(this.apiUrl.url('saasCore', '/v1/saas/inventory/productos/summary'), { headers: this.session.apiHeaders() })
      .pipe(map((response) => response.data));
  }

  createProductoRapido(request: CreateProductoRapidoRequest) {
    return this.http
      .post<ApiResponse<Producto>>(
        this.apiUrl.url('saasCore', '/v1/saas/inventory/productos/rapido'),
        request,
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(
        map((response) => response.data),
        tap(() => this.invalidateCache('categorias-producto', 'productos-todos')),
      );
  }

  downloadVentaPdf(ventaId: number, formato: FormatoImpresionComprobante = 'A4') {
    const params = new HttpParams().set('formato', formato);
    return this.http.get(
      this.apiUrl.url('saasCore', `/v1/saas/ventas/${ventaId}/comprobante/pdf`),
      {
        headers: this.session.apiHeaders(),
        params,
        responseType: 'blob',
      },
    );
  }

  downloadVentaXml(ventaId: number) {
    return this.http.get(
      this.apiUrl.url('saasCore', `/v1/saas/ventas/${ventaId}/comprobante/xml`),
      {
        headers: this.session.apiHeaders(),
        responseType: 'blob',
      },
    );
  }

  downloadVentaCdr(ventaId: number) {
    return this.http.get(
      this.apiUrl.url('saasCore', `/v1/saas/ventas/${ventaId}/comprobante/cdr`),
      {
        headers: this.session.apiHeaders(),
        responseType: 'blob',
      },
    );
  }

  lookupProducto(codigo: string) {
    const params = new HttpParams().set('codigo', codigo.trim());
    return this.http
      .get<ApiResponse<Producto | null>>(
        this.apiUrl.url('saasCore', '/v1/saas/inventory/productos/lookup'),
        {
          headers: this.session.apiHeaders(),
          params,
        },
      )
      .pipe(map((response) => response.data ?? null));
  }

  listEmpresaOperationalSummaries() {
    return this.http
      .get<ApiResponse<EmpresaOperationalSummary[]>>(
        this.apiUrl.url('saasCore', '/v1/saas/empresas/resumen-operativo'),
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  updateEmpresaSubscriptionPlan(empresaId: number, request: UpdateEmpresaSubscriptionPlanRequest) {
    return this.http
      .put<ApiResponse<Suscripcion>>(
        this.apiUrl.url('saasCore', `/v1/saas/suscripciones/empresa/${empresaId}/plan`),
        request,
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  updateCurrentEmpresaProfile(request: UpdateCurrentEmpresaProfileRequest) {
    return this.http
      .put<
        ApiResponse<Empresa>
      >(this.apiUrl.url('saasCore', '/v1/saas/empresas/current'), request, { headers: this.session.apiHeaders() })
      .pipe(
        map((response) => response.data),
        tap(() => this.invalidateCache('empresas')),
      );
  }

  synchronizeCurrentEmpresaFacturador() {
    return this.http
      .post<
        ApiResponse<Empresa>
      >(this.apiUrl.url('saasCore', '/v1/saas/empresas/current/facturador/synchronize'), null, { headers: this.session.apiHeaders() })
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

  pageKardex(productoId?: number, almacenId?: number, page = 0, size = 20) {
    let params = new HttpParams().set('page', page).set('size', size);
    if (productoId) {
      params = params.set('productoId', productoId);
    }
    if (almacenId) {
      params = params.set('almacenId', almacenId);
    }
    return this.http
      .get<
        ApiResponse<PageResponse<KardexMovimiento>>
      >(this.apiUrl.url('saasCore', '/v1/saas/inventory/kardex/page'), { headers: this.session.apiHeaders(), params })
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

  getUsuarioQuota(options: TenantScopedOptions = {}) {
    const tenantId = options.tenantId?.trim() || null;
    return this.http
      .get<
        ApiResponse<TenantUserQuota>
      >(this.apiUrl.url('saasCore', '/v1/saas/usuarios/quota'), { headers: this.session.apiHeaders(tenantId) })
      .pipe(map((response) => response.data));
  }

  updateUsuarioPassword(
    id: number,
    request: UpdateUsuarioPasswordRequest,
    options: TenantScopedOptions = {},
  ) {
    const tenantId = options.tenantId?.trim() || null;
    return this.http
      .put<ApiResponse<string>>(
        this.apiUrl.url('saasCore', `/v1/saas/usuarios/${id}/password`),
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

  private cached<T>(
    key: string,
    sourceFactory: () => Observable<T>,
    ttlMs = AdminSaasApiService.MASTER_DATA_CACHE_TTL_MS,
  ): Observable<T> {
    return this.cache.through(key, sourceFactory, ttlMs);
  }

  private invalidateCache(...prefixes: string[]): void {
    this.cache.invalidate(...prefixes);
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

  // --- Recursos compartidos ------------------------------------------------
  // Catalogos maestros y cotizaciones viven en core porque los consumen varias
  // features. Se exponen aqui para no cambiar las llamadas existentes.

  listClientes(options: TenantScopedOptions = {}) {
    return this.catalogApi.listClientes(options);
  }

  updateCliente(id: number, request: UpdateClienteRequest, options: TenantScopedOptions = {}) {
    return this.catalogApi.updateCliente(id, request, options);
  }

  listAllProductos(almacenId?: number) {
    return this.catalogApi.listAllProductos(almacenId);
  }

  listSucursales(options: TenantScopedOptions = {}) {
    return this.catalogApi.listSucursales(options);
  }

  listUsuarios(options: TenantScopedOptions = {}) {
    return this.catalogApi.listUsuarios(options);
  }

  listCotizaciones(crmOportunidadId?: number | null) {
    return this.cotizacionApi.listCotizaciones(crmOportunidadId);
  }

  listPromocionesCotizacion() {
    return this.cotizacionApi.listPromocionesCotizacion();
  }

  createPromocionCotizacion(request: CreatePromocionCotizacionRequest) {
    return this.cotizacionApi.createPromocionCotizacion(request);
  }

  createCotizacion(request: CreateCotizacionRequest) {
    return this.cotizacionApi.createCotizacion(request);
  }

  updateCotizacionEstado(id: number, request: string | UpdateCotizacionEstadoRequest) {
    return this.cotizacionApi.updateCotizacionEstado(id, request);
  }

  getCotizacionPdf(id: number) {
    return this.cotizacionApi.getCotizacionPdf(id);
  }

  sendCotizacionEmail(id: number) {
    return this.cotizacionApi.sendCotizacionEmail(id);
  }

  convertCotizacionVenta(id: number, request: ConvertCotizacionVentaRequest) {
    return this.cotizacionApi.convertCotizacionVenta(id, request);
  }
}
