import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';

import { ApiResponse } from '@core/api/api-response';
import { ApiUrlService } from '@core/api/api-url.service';
import { AuthSessionService } from '@core/auth/auth-session.service';

import type {
  ConvertCotizacionVentaRequest,
  ConvertCotizacionVentaResponse,
  Cotizacion,
  CotizacionPdfResponse,
  CreateCotizacionRequest,
  CreatePromocionCotizacionRequest,
  PromocionCotizacion,
  SendCotizacionEmailResponse,
  UpdateCotizacionEstadoRequest,
} from './cotizacion-api.types';

/**
 * Cotizaciones comerciales.
 *
 * Las consumen tanto la pantalla de ventas del admin como el CRM, que genera
 * cotizaciones a partir de una oportunidad. Vivian en AdminSaasApiService, lo
 * que obligaba al CRM a depender de la feature de admin.
 */
@Injectable({ providedIn: 'root' })
export class CotizacionApiService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = inject(ApiUrlService);

  private readonly session = inject(AuthSessionService);

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
      .get<ApiResponse<PromocionCotizacion[]>>(
        this.apiUrl.url('saasCore', '/v1/saas/cotizaciones/promociones'),
        {
          headers: this.session.apiHeaders(),
        },
      )
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
}
