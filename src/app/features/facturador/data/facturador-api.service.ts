import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';

import { ApiClientService } from '@core/api/api-client.service';

interface FacturadorResponse<T> {
  readonly success: boolean;
  readonly data: T;
  readonly message?: string;
  readonly context?: unknown;
}

export interface FacturadorTenant {
  readonly tenant_id: number;
  readonly ruc: string;
  readonly business_name?: string;
  readonly schema: string;
  readonly api_client_name?: string;
  readonly sunat_mode?: string;
  readonly modo_sunat?: string;
  readonly is_active?: boolean;
  readonly already_exists?: boolean;
  readonly api_key?: string | null;
  readonly certificado_url?: string | null;
  readonly certificado_password?: string | null;
  readonly logo_pdf_url?: string | null;
  readonly sol_usuario?: string | null;
  readonly ruc_sol?: string | null;
  readonly serie_factura?: string | null;
  readonly serie_boleta?: string | null;
  readonly serie_nc?: string | null;
  readonly serie_nd?: string | null;
  readonly serie_guia?: string | null;
  readonly igv?: number | null;
  readonly moneda?: string | null;
  readonly usa_datos_prueba?: boolean;
}

export interface FacturadorTenantConfig {
  readonly ruc_sol?: string | null;
  readonly usuario_sol?: string | null;
  readonly certificado_url?: string | null;
  readonly certificado_password?: string | null;
  readonly modo_sunat?: string | null;
  readonly logo_pdf_url?: string | null;
  readonly serie_factura?: string | null;
  readonly serie_boleta?: string | null;
  readonly serie_nc?: string | null;
  readonly serie_nd?: string | null;
  readonly serie_guia?: string | null;
  readonly igv?: number | null;
  readonly moneda?: string | null;
  readonly token_api?: string | null;
}

export interface FacturadorTenantDetail extends FacturadorTenant {
  readonly configuracion?: FacturadorTenantConfig | null;
}

export interface FacturadorTenantList {
  readonly total: number;
  readonly items: readonly FacturadorTenant[];
}

export interface CreateFacturadorTenantRequest {
  readonly ruc: string;
  readonly business_name: string;
  readonly sunat_mode?: 'beta' | 'production';
  readonly api_client_name?: string;
  readonly ruc_sol?: string;
  readonly usuario_sol?: string;
  readonly clave_sol?: string;
  readonly certificado_password?: string;
  readonly certificado_url?: string;
  readonly logo_pdf_url?: string;
  readonly serie_factura?: string;
  readonly serie_boleta?: string;
  readonly serie_nc?: string;
  readonly serie_nd?: string;
  readonly serie_guia?: string;
  readonly igv?: number;
  readonly moneda?: string;
  readonly logo_file?: File | null;
  readonly certificado_file?: File | null;
}

@Injectable({ providedIn: 'root' })
export class FacturadorApiService {
  private readonly api = inject(ApiClientService);

  listTenants() {
    return this.api
      .get<FacturadorResponse<FacturadorTenantList>>('facturador', '/tenants')
      .pipe(map((response) => response.data));
  }

  getTenant(tenantId: number) {
    return this.api
      .get<FacturadorResponse<FacturadorTenantDetail>>('facturador', `/tenants/${tenantId}`)
      .pipe(map((response) => response.data));
  }

  createTenant(request: CreateFacturadorTenantRequest) {
    return this.api
      .post<
        FacturadorResponse<FacturadorTenant>
      >('facturador', '/tenants', this.toFormData(request))
      .pipe(map((response) => response.data));
  }

  updateTenant(tenantId: number, request: CreateFacturadorTenantRequest) {
    return this.api
      .put<
        FacturadorResponse<FacturadorTenant>
      >('facturador', `/tenants/${tenantId}`, this.toFormData(request))
      .pipe(map((response) => response.data));
  }

  private toFormData(request: CreateFacturadorTenantRequest): FormData {
    const formData = new FormData();

    formData.set('ruc', request.ruc);
    formData.set('business_name', request.business_name);

    this.appendText(formData, 'sunat_mode', request.sunat_mode);
    this.appendText(formData, 'api_client_name', request.api_client_name);
    this.appendText(formData, 'ruc_sol', request.ruc_sol);
    this.appendText(formData, 'usuario_sol', request.usuario_sol);
    this.appendText(formData, 'clave_sol', request.clave_sol);
    this.appendText(formData, 'certificado_password', request.certificado_password);
    this.appendText(formData, 'certificado_url', request.certificado_url);
    this.appendText(formData, 'logo_pdf_url', request.logo_pdf_url);
    this.appendText(formData, 'serie_factura', request.serie_factura);
    this.appendText(formData, 'serie_boleta', request.serie_boleta);
    this.appendText(formData, 'serie_nc', request.serie_nc);
    this.appendText(formData, 'serie_nd', request.serie_nd);
    this.appendText(formData, 'serie_guia', request.serie_guia);
    this.appendNumber(formData, 'igv', request.igv);
    this.appendText(formData, 'moneda', request.moneda);

    if (request.logo_file) {
      formData.set('logo_file', request.logo_file, request.logo_file.name);
    }
    if (request.certificado_file) {
      formData.set('certificado_file', request.certificado_file, request.certificado_file.name);
    }

    return formData;
  }

  private appendText(formData: FormData, key: string, value: string | undefined): void {
    if (value !== undefined && value !== null && value.trim() !== '') {
      formData.set(key, value);
    }
  }

  private appendNumber(formData: FormData, key: string, value: number | undefined): void {
    if (value !== undefined && value !== null && Number.isFinite(value)) {
      formData.set(key, String(value));
    }
  }
}
