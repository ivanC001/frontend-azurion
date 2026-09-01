import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';

import { ApiClientService } from '@core/api/api-client.service';

interface FacturadorResponse<T> {
  readonly success: boolean;
  readonly data: T;
  readonly message?: string;
  readonly context?: unknown;
}

export interface SunatEnvironmentDetails {
  readonly modo?: string | null;
  readonly usa_datos_prueba?: boolean;
  readonly endpoint_facturacion?: string | null;
  readonly endpoint_guias?: string | null;
  readonly cola?: string | null;
}

export interface FacturadorBankAccount {
  readonly banco: string;
  readonly moneda: string;
  readonly cuenta: string;
  readonly cci: string;
}

export interface FacturadorTenant {
  readonly tenant_id: number;
  readonly ruc: string;
  readonly business_name?: string;
  readonly schema: string;
  readonly external_tenant_id?: string | null;
  readonly country_code?: string | null;
  readonly tax_id?: string | null;
  readonly document_mode?: 'ticket_only' | 'electronic' | string;
  readonly fiscal_status?: 'not_configured' | 'active' | 'suspended' | string;
  readonly ticket_enabled?: boolean;
  readonly electronic_documents_enabled?: boolean;
  readonly api_client_name?: string;
  readonly sunat_mode?: string;
  readonly modo_sunat?: string;
  readonly is_active?: boolean;
  readonly already_exists?: boolean;
  readonly api_key?: string | null;
  readonly certificado_configurado?: boolean;
  readonly certificado_produccion_configurado?: boolean;
  readonly logo_pdf_configurado?: boolean;
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
  readonly entorno_sunat?: SunatEnvironmentDetails | null;
}

export interface FacturadorTenantConfig {
  readonly ruc_sol?: string | null;
  readonly usuario_sol?: string | null;
  readonly certificado_configurado?: boolean;
  readonly certificado_produccion_configurado?: boolean;
  readonly modo_sunat?: string | null;
  readonly logo_pdf_configurado?: boolean;
  readonly serie_factura?: string | null;
  readonly serie_boleta?: string | null;
  readonly serie_nc?: string | null;
  readonly serie_nd?: string | null;
  readonly serie_guia?: string | null;
  readonly igv?: number | null;
  readonly moneda?: string | null;
  readonly token_api?: string | null;
  readonly usa_datos_prueba?: boolean;
  readonly endpoint_facturacion?: string | null;
  readonly endpoint_guias?: string | null;
  readonly cola?: string | null;
  readonly cuentas_bancarias?: readonly FacturadorBankAccount[];
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
  readonly external_tenant_id?: string;
  readonly country_code?: string;
  readonly tax_id?: string;
  readonly sunat_mode?: 'disabled' | 'beta' | 'production';
  readonly api_client_name?: string;
  readonly ruc_sol?: string;
  readonly usuario_sol?: string;
  readonly clave_sol?: string;
  readonly certificado_password?: string;
  readonly serie_factura?: string;
  readonly serie_boleta?: string;
  readonly serie_nc?: string;
  readonly serie_nd?: string;
  readonly serie_guia?: string;
  readonly igv?: number;
  readonly moneda?: string;
  readonly cuentas_bancarias_json?: string;
  readonly logo_file?: File | null;
  readonly certificado_file?: File | null;
}

export interface CurrentFacturadorConfiguration {
  readonly tenant: FacturadorTenantDetail;
  readonly empresa: {
    readonly facturadorStatus?: string | null;
    readonly facturadorDocumentMode?: string | null;
    readonly facturadorFiscalStatus?: string | null;
    readonly facturadorSunatMode?: string | null;
  };
}

@Injectable({ providedIn: 'root' })
export class FacturadorApiService {
  private readonly api = inject(ApiClientService);

  listTenants() {
    return this.api
      .get<FacturadorResponse<FacturadorTenantList>>('saasCore', '/v1/saas/facturador/tenants')
      .pipe(map((response) => response.data));
  }

  getTenant(tenantId: number) {
    return this.api
      .get<FacturadorResponse<FacturadorTenantDetail>>(
        'saasCore',
        `/v1/saas/facturador/tenants/${tenantId}`,
      )
      .pipe(map((response) => response.data));
  }

  createTenant(request: CreateFacturadorTenantRequest) {
    return this.api
      .post<FacturadorResponse<FacturadorTenant>>(
        'saasCore',
        '/v1/saas/facturador/tenants',
        this.toFormData(request),
      )
      .pipe(map((response) => response.data));
  }

  updateTenant(tenantId: number, request: CreateFacturadorTenantRequest) {
    return this.api
      .put<FacturadorResponse<FacturadorTenant>>(
        'saasCore',
        `/v1/saas/facturador/tenants/${tenantId}`,
        this.toFormData(request),
      )
      .pipe(map((response) => response.data));
  }

  getCurrentTenant() {
    return this.api
      .get<FacturadorResponse<FacturadorTenantDetail | null>>(
        'saasCore',
        '/v1/saas/facturador/tenants/current',
      )
      .pipe(map((response) => response.data));
  }

  updateCurrentTenant(request: CreateFacturadorTenantRequest) {
    return this.api
      .put<FacturadorResponse<CurrentFacturadorConfiguration>>(
        'saasCore',
        '/v1/saas/facturador/tenants/current',
        this.toFormData(request),
      )
      .pipe(map((response) => response.data));
  }

  private toFormData(request: CreateFacturadorTenantRequest): FormData {
    const formData = new FormData();

    formData.set('ruc', request.ruc);
    formData.set('business_name', request.business_name);

    this.appendText(formData, 'external_tenant_id', request.external_tenant_id);
    this.appendText(formData, 'country_code', request.country_code);
    this.appendText(formData, 'tax_id', request.tax_id);
    this.appendText(formData, 'sunat_mode', request.sunat_mode);
    this.appendText(formData, 'api_client_name', request.api_client_name);
    this.appendText(formData, 'ruc_sol', request.ruc_sol);
    this.appendText(formData, 'usuario_sol', request.usuario_sol);
    this.appendText(formData, 'clave_sol', request.clave_sol);
    this.appendText(formData, 'certificado_password', request.certificado_password);
    this.appendText(formData, 'serie_factura', request.serie_factura);
    this.appendText(formData, 'serie_boleta', request.serie_boleta);
    this.appendText(formData, 'serie_nc', request.serie_nc);
    this.appendText(formData, 'serie_nd', request.serie_nd);
    this.appendText(formData, 'serie_guia', request.serie_guia);
    this.appendNumber(formData, 'igv', request.igv);
    this.appendText(formData, 'moneda', request.moneda);
    this.appendText(formData, 'cuentas_bancarias_json', request.cuentas_bancarias_json);

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
