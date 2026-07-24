import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';

import { ApiResponse } from '@core/api/api-response';
import { ApiUrlService } from '@core/api/api-url.service';
import { AuthSessionService } from '@core/auth/auth-session.service';

export type PlatformEmailSecurity = 'NONE' | 'SSL' | 'TLS';
export type PlatformEmailStatus = 'PENDIENTE' | 'VERIFICADO' | 'ERROR' | 'INACTIVO';

export interface PlatformEmailConfig {
  readonly id?: number | null;
  readonly nombreRemitente?: string | null;
  readonly correoRemitente?: string | null;
  readonly replyTo?: string | null;
  readonly smtpHost?: string | null;
  readonly smtpPort?: number | null;
  readonly smtpSecurity?: PlatformEmailSecurity | null;
  readonly smtpUsername?: string | null;
  readonly activo?: boolean | null;
  readonly verificado?: boolean | null;
  readonly estado?: PlatformEmailStatus | null;
  readonly avisosHabilitados?: boolean | null;
  readonly reportesHabilitados?: boolean | null;
  readonly dobleFactorHabilitado?: boolean | null;
  readonly fechaVerificacion?: string | null;
  readonly ultimoError?: string | null;
  readonly smtpPasswordConfigured?: boolean | null;
  readonly updatedAt?: string | null;
}

export interface PlatformEmailConfigRequest {
  readonly nombreRemitente: string;
  readonly correoRemitente: string;
  readonly replyTo?: string | null;
  readonly smtpHost: string;
  readonly smtpPort: number;
  readonly smtpSecurity: PlatformEmailSecurity;
  readonly smtpUsername: string;
  readonly smtpPassword?: string | null;
  readonly activo: boolean;
  readonly avisosHabilitados: boolean;
  readonly reportesHabilitados: boolean;
  readonly dobleFactorHabilitado: boolean;
}

@Injectable({ providedIn: 'root' })
export class PlatformEmailService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);
  private readonly session = inject(AuthSessionService);
  private readonly endpoint = '/v1/saas/platform/email';

  getConfig() {
    return this.http
      .get<ApiResponse<PlatformEmailConfig | null>>(this.apiUrl.url('saasCore', this.endpoint), {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  saveConfig(request: PlatformEmailConfigRequest) {
    return this.http
      .put<ApiResponse<PlatformEmailConfig>>(
        this.apiUrl.url('saasCore', this.endpoint),
        request,
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  sendTest(correoDestino: string) {
    return this.http
      .post<ApiResponse<PlatformEmailConfig>>(
        this.apiUrl.url('saasCore', `${this.endpoint}/test`),
        { correoDestino },
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  activate() {
    return this.http
      .post<ApiResponse<PlatformEmailConfig>>(
        this.apiUrl.url('saasCore', `${this.endpoint}/activate`),
        null,
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  deactivate() {
    return this.http
      .post<ApiResponse<PlatformEmailConfig>>(
        this.apiUrl.url('saasCore', `${this.endpoint}/deactivate`),
        null,
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }
}
