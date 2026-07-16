import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';

import { ApiResponse } from '@core/api/api-response';
import { ApiUrlService } from '@core/api/api-url.service';
import { AuthSessionService } from '@core/auth/auth-session.service';

export type EmailSmtpSecurity = 'NONE' | 'SSL' | 'TLS';
export type EmailConfigStatus = 'PENDIENTE' | 'VERIFICADO' | 'ERROR' | 'INACTIVO';

export interface TenantEmailConfig {
  readonly id?: number | null;
  readonly nombreRemitente?: string | null;
  readonly correoRemitente?: string | null;
  readonly replyTo?: string | null;
  readonly smtpHost?: string | null;
  readonly smtpPort?: number | null;
  readonly smtpSecurity?: EmailSmtpSecurity | null;
  readonly smtpUsername?: string | null;
  readonly activo?: boolean | null;
  readonly verificado?: boolean | null;
  readonly estado?: EmailConfigStatus | null;
  readonly fechaVerificacion?: string | null;
  readonly ultimoError?: string | null;
  readonly smtpPasswordConfigured?: boolean | null;
}

export interface TenantEmailConfigRequest {
  readonly nombreRemitente: string;
  readonly correoRemitente: string;
  readonly replyTo?: string | null;
  readonly smtpHost: string;
  readonly smtpPort: number;
  readonly smtpSecurity: EmailSmtpSecurity;
  readonly smtpUsername: string;
  readonly smtpPassword?: string | null;
  readonly activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class TenantEmailConfigService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);
  private readonly session = inject(AuthSessionService);
  private readonly endpoint = '/settings/email';

  getConfig() {
    return this.http
      .get<ApiResponse<TenantEmailConfig | null>>(this.apiUrl.url('saasCore', this.endpoint), {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  saveConfig(request: TenantEmailConfigRequest) {
    return this.http
      .put<ApiResponse<TenantEmailConfig>>(this.apiUrl.url('saasCore', this.endpoint), request, {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  testEmail(correoDestino: string) {
    return this.http
      .post<ApiResponse<TenantEmailConfig>>(this.apiUrl.url('saasCore', `${this.endpoint}/test`), { correoDestino }, {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  activate() {
    return this.http
      .post<ApiResponse<TenantEmailConfig>>(this.apiUrl.url('saasCore', `${this.endpoint}/activate`), null, {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  deactivate() {
    return this.http
      .post<ApiResponse<TenantEmailConfig>>(this.apiUrl.url('saasCore', `${this.endpoint}/deactivate`), null, {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }
}
