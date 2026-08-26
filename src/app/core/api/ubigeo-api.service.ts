import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';

import { ApiResponse } from '@core/api/api-response';
import { ApiUrlService } from '@core/api/api-url.service';
import { AuthSessionService } from '@core/auth/auth-session.service';

export interface Ubigeo {
  readonly codigo: string;
  readonly departamento: string;
  readonly provincia: string;
  readonly distrito: string;
}

/**
 * Catalogo de ubigeos.
 *
 * Vive en core porque lo consumen tanto features de negocio como el selector
 * reutilizable de shared. Mientras estuvo dentro de AdminSaasApiService,
 * shared/ubigeo-picker tenia que importar una feature -- una inversion de
 * dependencia que las propias reglas del proyecto prohiben.
 */
@Injectable({ providedIn: 'root' })
export class UbigeoApiService {
  /** El catalogo apenas cambia, asi que se cachea de forma generosa. */
  private static readonly CACHE_TTL_MS = 600_000;

  private readonly http = inject(HttpClient);

  private readonly apiUrl = inject(ApiUrlService);

  private readonly session = inject(AuthSessionService);

  private readonly cache = new Map<string, { expiresAt: number; value$: Observable<Ubigeo[]> }>();

  listUbigeos(query?: string): Observable<Ubigeo[]> {
    const normalizedQuery = query?.trim() || '';
    const cacheKey = `ubigeos:${normalizedQuery.toLowerCase()}`;

    const now = Date.now();
    const current = this.cache.get(cacheKey);
    if (current && current.expiresAt > now) {
      return current.value$;
    }

    let params = new HttpParams();
    if (normalizedQuery !== '') {
      params = params.set('query', normalizedQuery);
    }

    const value$ = this.http
      .get<ApiResponse<Ubigeo[]>>(this.apiUrl.url('saasCore', '/v1/saas/ubigeos'), {
        headers: this.session.apiHeaders(),
        params,
      })
      .pipe(
        map((response) => response.data),
        shareReplay({ bufferSize: 1, refCount: false }),
      );

    this.cache.set(cacheKey, { expiresAt: now + UbigeoApiService.CACHE_TTL_MS, value$ });
    return value$;
  }
}
