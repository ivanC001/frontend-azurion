import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs/operators';

import { ApiResponse } from '@core/api/api-response';
import { ApiUrlService } from '@core/api/api-url.service';
import { APP_SETTINGS } from '@core/config/app-settings';

export interface PublicCrmLeadRequest {
  readonly tenantId?: string | null;
  readonly Ruc_tenant?: string | null;
  readonly landingKey?: string | null;
  readonly tipoPersona?: 'SIN_DEFINIR' | 'NATURAL' | 'JURIDICA' | string | null;
  readonly tipoDocumento?: string | null;
  readonly numeroDocumento?: string | null;
  readonly nombre: string;
  readonly empresa?: string | null;
  readonly correo?: string | null;
  readonly email?: string | null;
  readonly emai?: string | null;
  readonly telefono?: string | null;
  readonly direccion?: string | null;
  readonly origen?: string | null;
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
  readonly catalogoToken?: string | null;
  readonly website?: string | null;
  readonly metadataJson?: string | null;
}

export interface PublicCrmLeadResponse {
  readonly receiptId: string;
  readonly status: string;
  readonly receivedAt: string;
}

export interface PublicCrmCatalogoItem {
  readonly id: number;
  readonly tipoItem: string;
  readonly nombre: string;
  readonly descripcion?: string | null;
  readonly precioReferencial?: number | null;
  readonly moneda?: string | null;
  readonly metadataJson?: string | null;
}

@Injectable({ providedIn: 'root' })
export class PublicCrmApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);
  private readonly settings = inject(APP_SETTINGS);

  captureLead(request: PublicCrmLeadRequest, submissionKey?: string | null) {
    const tenantReference = (request.tenantId ?? request.Ruc_tenant ?? '').trim();
    const sourceKey = request.landingKey?.trim() || '';
    const idempotencyKey = submissionKey || this.createSubmissionKey();
    if (sourceKey) {
      const {
        tenantId: _tenantId,
        Ruc_tenant: _rucTenant,
        landingKey: _landingKey,
        ...publicPayload
      } = request;
      return this.http
        .post<ApiResponse<PublicCrmLeadResponse>>(
          this.apiUrl.url(
            'saasCore',
            `/v1/public/forms/${encodeURIComponent(sourceKey)}/submissions`,
          ),
          publicPayload,
          { headers: new HttpHeaders({ 'X-Idempotency-Key': idempotencyKey }) },
        )
        .pipe(map((response) => response.data));
    }
    const headers = tenantReference
      ? new HttpHeaders({
          [this.settings.tenancy.headerName]: tenantReference,
          'X-Idempotency-Key': idempotencyKey,
        })
      : new HttpHeaders({ 'X-Idempotency-Key': idempotencyKey });
    const { tenantId: _tenantId, ...payload } = request;
    const body =
      tenantReference && !payload.Ruc_tenant
        ? { ...payload, Ruc_tenant: tenantReference }
        : payload;
    return this.http
      .post<ApiResponse<PublicCrmLeadResponse>>(
        this.apiUrl.url('saasCore', '/v1/public/crm/leads'),
        body,
        { headers },
      )
      .pipe(map((response) => response.data));
  }

  createSubmissionKey(): string {
    return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  getCatalogoItem(tenantId: string, id: number, token: string) {
    const headers = new HttpHeaders({
      [this.settings.tenancy.headerName]: tenantId.trim(),
    });
    return this.http
      .get<ApiResponse<PublicCrmCatalogoItem>>(
        this.apiUrl.url('saasCore', `/v1/public/crm/catalogo/${id}`),
        { headers, params: { token } },
      )
      .pipe(map((response) => response.data));
  }
}
