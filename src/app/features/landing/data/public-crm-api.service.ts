import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs/operators';

import { ApiResponse } from '@core/api/api-response';
import { ApiUrlService } from '@core/api/api-url.service';
import { APP_SETTINGS } from '@core/config/app-settings';

export interface PublicCrmLeadRequest {
  readonly tenantId: string;
  readonly tipoPersona?: string | null;
  readonly tipoDocumento?: string | null;
  readonly numeroDocumento?: string | null;
  readonly nombre: string;
  readonly empresa?: string | null;
  readonly correo?: string | null;
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
  readonly id: number;
  readonly nombre: string;
  readonly origen: string;
  readonly canalIngreso: string;
  readonly estado: string;
}

export interface PublicCrmCatalogoItem {
  readonly id: number;
  readonly tipoItem: string;
  readonly nombre: string;
  readonly descripcion?: string | null;
  readonly precioReferencial?: number | null;
  readonly metadataJson?: string | null;
}

@Injectable({ providedIn: 'root' })
export class PublicCrmApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);
  private readonly settings = inject(APP_SETTINGS);

  captureLead(request: PublicCrmLeadRequest) {
    const tenantId = request.tenantId.trim();
    const headers = new HttpHeaders({
      [this.settings.tenancy.headerName]: tenantId,
    });
    const { tenantId: _tenantId, ...payload } = request;
    return this.http
      .post<ApiResponse<PublicCrmLeadResponse>>(
        this.apiUrl.url('saasCore', '/v1/public/crm/leads'),
        payload,
        { headers },
      )
      .pipe(map((response) => response.data));
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
