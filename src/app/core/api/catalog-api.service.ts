import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, expand, map, reduce, tap } from 'rxjs';

import { ApiCacheService } from '@core/api/api-cache.service';
import { ApiResponse } from '@core/api/api-response';
import { ApiUrlService } from '@core/api/api-url.service';
import { AuthSessionService } from '@core/auth/auth-session.service';

import type {
  Cliente,
  PageResponse,
  Producto,
  Sucursal,
  TenantScopedOptions,
  UpdateClienteRequest,
  UsuarioTenant,
} from './catalog-api.types';

/**
 * Datos maestros que consultan varias features: clientes, productos,
 * sucursales y usuarios del tenant.
 *
 * Estaban dentro de AdminSaasApiService, de modo que el CRM tenia que importar
 * el servicio de admin solo para listar clientes o productos. Al vivir en core
 * los consume cualquier feature sin crear dependencias entre ellas.
 */
@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = inject(ApiUrlService);

  private readonly session = inject(AuthSessionService);

  private readonly cache = inject(ApiCacheService);

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

  listAllProductos(almacenId?: number) {
    const cacheKey = this.tenantCacheKey(`productos-todos:${almacenId ?? 'all'}`, null);
    return this.cached(cacheKey, () => {
      const loadPage = (page: number) => {
        let params = new HttpParams().set('page', page).set('size', 200);
        if (almacenId) {
          params = params.set('almacenId', almacenId);
        }
        return this.http
          .get<ApiResponse<PageResponse<Producto>>>(
            this.apiUrl.url('saasCore', '/v1/saas/inventory/productos/page'),
            {
              headers: this.session.apiHeaders(),
              params,
            },
          )
          .pipe(map((response) => response.data));
      };

      return loadPage(0).pipe(
        expand((response) => (response.last ? EMPTY : loadPage(response.page + 1))),
        reduce(
          (products, response) => [...products, ...(response.content ?? [])],
          [] as Producto[],
        ),
      );
    });
  }

  listUsuarios(options: TenantScopedOptions = {}) {
    const tenantId = options.tenantId?.trim() || null;
    return this.http
      .get<ApiResponse<UsuarioTenant[]>>(this.apiUrl.url('saasCore', '/v1/saas/usuarios'), {
        headers: this.session.apiHeaders(tenantId),
      })
      .pipe(map((response) => response.data));
  }

  private cached<T>(
    key: string,
    sourceFactory: () => Observable<T>,
    ttlMs?: number,
  ): Observable<T> {
    return this.cache.through(key, sourceFactory, ttlMs);
  }

  private invalidateCache(...prefixes: string[]): void {
    this.cache.invalidate(...prefixes);
  }

  /** Las claves se aislan por tenant para no mezclar catalogos entre empresas. */
  private tenantCacheKey(scope: string, tenantId: string | null): string {
    return `${scope}:${tenantId || this.session.currentSession()?.tenantId || 'default'}`;
  }
}
